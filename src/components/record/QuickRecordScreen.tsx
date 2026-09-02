import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QuickRecordDraft } from '../../domain/record';
import { findRecentDuplicate, lastRecordContextFromEntry, parseRecordAmount, validateRecordDraft } from '../../domain/record';
import { useQuickRecordDefaults } from '../../hooks/useQuickRecordDefaults';
import { prepareRecordCommand, persistPreparedRecord, PreparedRecordCommand, reversePreparedRecord } from '../../services/recordPersistence';
import { useAppStore } from '../../stores/appStore';
import { applyHomeBatchRemaining } from '../../hooks/useHomeData';
import { getEntries } from '../../utils/db';
import { buildLastRecordContext } from '../../domain/record';
import { METHODS } from '../../constants/methods';
import { SUBSTANCES } from '../../constants/substances';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { registerTelegramBackHandler } from '../../integrations/telegram';
import { BottomSheet, Button, Dialog, InlineNotice, Surface, TopBar } from '../ui';
import { AmountDisplay } from './AmountDisplay';
import { MethodGuidance } from './MethodGuidance';
import { ChoiceChip } from './ChoiceChip';
import { NumericKeypad } from './NumericKeypad';
import { RecordResult } from './RecordResult';

function toLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(timestamp - offset).toISOString().slice(0, 16);
}

function isDraftDirty(current: QuickRecordDraft, baseline: QuickRecordDraft, draftTouched: boolean): boolean {
  if (!draftTouched) return Boolean(current.amountInput.trim() || (current.notes ?? '').trim());
  return (
    current.amountInput !== baseline.amountInput ||
    current.substanceId !== baseline.substanceId ||
    current.methodId !== baseline.methodId ||
    current.alone !== baseline.alone ||
    (current.notes ?? '') !== (baseline.notes ?? '') ||
    current.batchId !== baseline.batchId ||
    current.amountUnit !== baseline.amountUnit ||
    Math.abs(current.occurredAt - baseline.occurredAt) > 60_000
  );
}

export function QuickRecordScreen() {
  const navigate = useNavigate();
  const defaults = useQuickRecordDefaults();
  const online = useOnlineStatus();
  const refreshEntries = useAppStore((state) => state.refreshEntries);
  const setLastRecordContext = useAppStore((state) => state.setLastRecordContext);
  const [draft, setDraft] = useState<QuickRecordDraft | null>(null);
  const [picker, setPicker] = useState<'substance' | 'method' | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedCommand, setSavedCommand] = useState<PreparedRecordCommand | null>(null);
  const [undoing, setUndoing] = useState(false);
  const commandRef = useRef<PreparedRecordCommand | null>(null);
  const baselineRef = useRef<QuickRecordDraft | null>(null);

  const current = draft ?? defaults.draft;
  const batch = current.batchId ? defaults.batch : null;
  const errors = useMemo(() => validateRecordDraft(current, batch), [current, batch]);
  const amount = parseRecordAmount(current.amountInput, current.amountUnit, batch?.concentration);

  if (defaults.status === 'ready' && !baselineRef.current) {
    baselineRef.current = defaults.draft;
  }

  const dirty = useMemo(() => {
    if (savedCommand || defaults.status !== 'ready') return false;
    const baseline = baselineRef.current ?? defaults.draft;
    return isDraftDirty(current, baseline, draft !== null);
  }, [current, defaults.draft, defaults.status, draft, savedCommand]);

  const goHome = () => navigate('/');

  const requestLeave = () => {
    if (picker) {
      setPicker(null);
      return;
    }
    if (duplicateOpen) {
      setDuplicateOpen(false);
      return;
    }
    if (leaveOpen) {
      setLeaveOpen(false);
      return;
    }
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    goHome();
  };

  useEffect(() => {
    if (defaults.status !== 'ready' || savedCommand) return undefined;
    return registerTelegramBackHandler(requestLeave);
  }, [defaults.status, savedCommand, dirty, picker, duplicateOpen, leaveOpen, current, draft]);

  if (defaults.status === 'loading') {
    return (
      <div
        role="status"
        aria-label="Загрузка быстрой записи"
        className="h-72 animate-pulse rounded-hero bg-usnee-surface motion-reduce:animate-none"
      />
    );
  }
  if (defaults.status === 'error') {
    return (
      <InlineNotice tone="danger" title="Не удалось открыть быструю запись">
        Локальные данные недоступны. Вернитесь и попробуйте снова.
      </InlineNotice>
    );
  }

  const update = (partial: Partial<QuickRecordDraft>) => {
    commandRef.current = null;
    setDraft({ ...current, ...partial });
    setSaveError('');
    setDuplicateOpen(false);
  };

  const save = async (duplicateAcknowledged = false) => {
    if (saving || savedCommand) return;
    const duplicate = findRecentDuplicate(defaults.entries, current);
    if (duplicate && !duplicateAcknowledged) {
      setDuplicateOpen(true);
      return;
    }
    setDuplicateOpen(false);
    setSaving(true);
    setSaveError('');
    try {
      const prepared = commandRef.current ?? prepareRecordCommand(current, batch);
      commandRef.current = prepared;
      await persistPreparedRecord(prepared);
      await refreshEntries();
      if (prepared.batchId && prepared.nextBatchRemaining !== undefined) {
        applyHomeBatchRemaining(prepared.batchId, prepared.nextBatchRemaining);
      }
      setLastRecordContext(buildLastRecordContext({
        substanceId: prepared.entry.substanceId,
        substanceName: prepared.entry.substanceName,
        methodId: prepared.entry.methodId,
        methodName: prepared.entry.methodName,
        amountUnit: prepared.entry.doseUnit,
        batchId: prepared.batchId,
        methodDetails: prepared.entry.methodDetails,
        injectionSite: prepared.entry.injectionSite
      }));
      setSavedCommand(prepared);
      setLeaveOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить на устройстве');
    } finally {
      setSaving(false);
    }
  };

  const undo = async () => {
    if (!savedCommand || undoing) return;
    setUndoing(true);
    try {
      await reversePreparedRecord(savedCommand);
      await refreshEntries();
      const remaining = await getEntries();
      setLastRecordContext(lastRecordContextFromEntry(remaining[remaining.length - 1] ?? null));
      if (savedCommand.batchId && savedCommand.expectedBatchRemaining !== undefined) {
        applyHomeBatchRemaining(savedCommand.batchId, savedCommand.expectedBatchRemaining);
      }
      navigate('/');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось отменить запись');
    } finally {
      setUndoing(false);
    }
  };

  if (savedCommand) {
    return (
      <RecordResult
        undoing={undoing}
        onHome={() => navigate('/')}
        onAnother={() => {
          commandRef.current = null;
          const next = { ...current, amountInput: '', occurredAt: Date.now() };
          setSavedCommand(null);
          setDraft(next);
          baselineRef.current = next;
        }}
        onUndo={undo}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-4">
        <TopBar
          title="Новая запись"
          eyebrow={online ? 'Локально' : 'Без сети'}
          onBack={requestLeave}
        />
        {!online && (
          <InlineNotice tone="info" title="Работа без сети">
            Запись сохранится на устройстве. Синхронизация появится после подключения сервера.
          </InlineNotice>
        )}

        <Surface variant="glass" className="space-y-3 p-4">
          <button
            type="button"
            onClick={() => setPicker('substance')}
            className="flex min-h-12 w-full items-center justify-between rounded-lg bg-usnee-glass px-4 text-left focus-visible:ring-2 focus-visible:ring-usnee-focus"
          >
            <span>
              <span className="block text-caption text-usnee-text3">Вещество</span>
              <strong>{current.substanceName || 'Выберите вещество'}</strong>
            </span>
            <ChevronDown className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setPicker('method')}
            className="flex min-h-12 w-full items-center justify-between rounded-lg bg-usnee-glass px-4 text-left focus-visible:ring-2 focus-visible:ring-usnee-focus"
          >
            <span>
              <span className="block text-caption text-usnee-text3">Способ</span>
              <strong>{current.methodName || 'Выберите способ'}</strong>
            </span>
            <ChevronDown className="h-5 w-5" />
          </button>
          {defaults.batch && defaults.batch.substanceId === current.substanceId && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-caption text-usnee-text3">Партия</p>
                <p className="text-body-sm font-bold">
                  {defaults.batch.name} · ≈{Math.round((defaults.batch.remaining / defaults.batch.concentration) * 10) / 10} мл
                </p>
              </div>
              <ChoiceChip
                selected={Boolean(current.batchId)}
                onClick={() => update({ batchId: current.batchId ? undefined : defaults.batch!.id })}
              >
                {current.batchId ? 'Используется' : 'Без партии'}
              </ChoiceChip>
            </div>
          )}
        </Surface>

        <AmountDisplay
          value={current.amountInput}
          unit={current.amountUnit}
          batch={batch}
          error={saveError || (current.amountInput && !amount.valid ? amount.error : undefined)}
        />
        <MethodGuidance methodId={current.methodId} />
        <input
          id="record-amount"
          aria-label="Количество"
          inputMode="decimal"
          value={current.amountInput}
          onChange={(event) => update({ amountInput: event.target.value })}
          className="min-h-12 rounded-lg border border-usnee-border bg-usnee-surface px-4 text-center text-title-lg"
          placeholder={`Количество, ${current.amountUnit}`}
        />
        <NumericKeypad value={current.amountInput} onChange={(amountInput) => update({ amountInput })} disabled={saving} />
        <div>
          <p className="mb-2 text-label uppercase text-usnee-text3">Компания</p>
          <div className="flex gap-2">
            <ChoiceChip selected={current.alone} onClick={() => update({ alone: true })}>
              Один
            </ChoiceChip>
            <ChoiceChip selected={!current.alone} onClick={() => update({ alone: false })}>
              Не один
            </ChoiceChip>
          </div>
        </div>
        <Surface className="space-y-3 p-4">
          <label className="block text-body-sm font-bold" htmlFor="record-time">
            Время
          </label>
          <input
            id="record-time"
            type="datetime-local"
            value={toLocalDateTime(current.occurredAt)}
            onChange={(event) => update({ occurredAt: new Date(event.target.value).getTime() })}
            className="min-h-12 w-full rounded-lg border border-usnee-border bg-usnee-bg px-3"
          />
          <label className="block text-body-sm font-bold" htmlFor="record-note">
            Заметка
          </label>
          <textarea
            id="record-note"
            value={current.notes ?? ''}
            onChange={(event) => update({ notes: event.target.value })}
            rows={2}
            className="w-full resize-none rounded-lg border border-usnee-border bg-usnee-bg p-3"
            placeholder="Необязательно"
          />
        </Surface>
        {errors.length > 0 && current.amountInput && (
          <p role="alert" className="text-body-sm text-usnee-danger">
            {errors[0]}
          </p>
        )}
        <Button variant="ghost" onClick={goHome}>
                  На главную
                </Button>
              </div>

              <div className="sticky bottom-0 z-20 -mx-1 border-t border-usnee-border bg-usnee-bg px-1 pb-[calc(0.75rem+var(--safe-area-bottom,0px))] pt-3">
                <Button size="lg" className="w-full" disabled={errors.length > 0} loading={saving} onClick={() => void save()}>
                  <Save className="h-5 w-5" />
                  Записать
                </Button>
              </div>

      <BottomSheet open={picker === 'substance'} onClose={() => setPicker(null)} title="Выберите вещество">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {SUBSTANCES.map((substance) => (
            <ChoiceChip
              key={substance.id}
              selected={current.substanceId === substance.id}
              onClick={() => {
                update({
                  substanceId: substance.id,
                  substanceName: substance.name,
                  batchId: defaults.batch?.substanceId === substance.id ? defaults.batch.id : undefined
                });
                setPicker(null);
              }}
            >
              {substance.name}
            </ChoiceChip>
          ))}
        </div>
      </BottomSheet>
      <BottomSheet open={picker === 'method'} onClose={() => setPicker(null)} title="Выберите способ">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {METHODS.map((method) => (
            <ChoiceChip
              key={method.id}
              selected={current.methodId === method.id}
              onClick={() => {
                update({
                  methodId: method.id,
                  methodName: method.name,
                  amountInput: '',
                  amountUnit: method.id === 'inject' ? 'мл' : 'мг'
                });
                setPicker(null);
              }}
            >
              {method.name}
            </ChoiceChip>
          ))}
        </div>
      </BottomSheet>
      <Dialog
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        title="Похоже на повторную запись"
        description="Такая же комбинация вещества и способа уже была в течение последнего часа."
        footer={
          <div className="flex flex-col gap-2">
            <Button variant="danger" onClick={() => void save(true)}>
              Всё равно сохранить
            </Button>
            <Button variant="secondary" onClick={() => setDuplicateOpen(false)}>
              Вернуться и проверить
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-usnee-text2">Проверьте количество и время перед сохранением.</p>
      </Dialog>
      <Dialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Выйти без сохранения?"
        description="Несохранённые данные записи будут потеряны."
        footer={
          <div className="flex flex-col gap-2">
            <Button variant="danger" onClick={goHome}>
              Выйти
            </Button>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              Остаться
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-usnee-text2">Можно вернуться и сохранить запись.</p>
      </Dialog>
    </div>
  );
}
