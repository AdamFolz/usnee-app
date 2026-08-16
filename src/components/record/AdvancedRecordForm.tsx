import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  Leaf,
  Brain,
  Pill,
  HeartPulse,
  Wine,
  PenTool,
  Syringe,
  Flame,
  Wind,
  Users,
  Activity,
  PartyPopper,
  TestTube,
  RotateCcw,
  Search,
  Clock,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  Home,
  FileText,
  User,
  AlertTriangle,
  Star,
  Heart,
  Undo2
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { Batch, ConsumptionEntry, MethodField } from '../../types';
import { getActiveBatch, getEntries } from '../../utils/db';
import {
  persistPreparedRecord,
  prepareRecordCommand,
  PreparedRecordCommand,
  reversePreparedRecord
} from '../../services/recordPersistence';
import { buildLastRecordContext, resolveRecordAmountFields, selectCompatibleBatch } from '../../domain/record';
import { applyHomeBatchRemaining } from '../../hooks/useHomeData';
import { SUBSTANCES, CATEGORY_LABELS, CATEGORY_ORDER } from '../../constants/substances';
import { METHODS, METHOD_ABBREVIATIONS, getRouteForSite } from '../../constants/methods';
import { TRIGGERS } from '../../constants/triggers';
import { Button, InlineNotice, Surface, TopBar } from '../ui';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { registerTelegramBackHandler } from '../../integrations/telegram';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  euphorics: Sparkles,
  stimulants: Zap,
  cannabinoids: Leaf,
  dissociatives: Brain,
  benzodiazepines: Pill,
  opioids: HeartPulse,
  alcohol: Wine,
  custom: PenTool
};

const CATEGORY_COLORS: Record<string, string> = {
  euphorics: '#e63946',
  stimulants: '#fb8500',
  cannabinoids: '#2a9d8f',
  dissociatives: '#9b5de5',
  benzodiazepines: '#457b9d',
  opioids: '#e63946',
  alcohol: '#e9c46a',
  custom: '#a0a0a0'
};

const METHOD_ICONS: Record<string, React.ElementType> = {
  Syringe: Syringe,
  Flame: Flame,
  Pill: Pill,
  Wind: Wind
};

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  Zap: Zap,
  Clock: Clock,
  Users: Users,
  Activity: Activity,
  PartyPopper: PartyPopper,
  Flame: Flame,
  TestTube: TestTube,
  RotateCcw: RotateCcw,
  Search: Search,
  PenTool: PenTool
};

function getLocalDatetimeInputValue(ts = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Warn if the same substance + method was already logged within the last hour.
const DOUBLE_DOSE_WINDOW = 60 * 60 * 1000;

async function findRecentDuplicate(
  substanceId: string,
  methodId: string,
  ts: number
): Promise<{ entry: ConsumptionEntry; mins: number } | null> {
  const all = await getEntries();
  let best: ConsumptionEntry | null = null;
  let bestDiff = Infinity;
  for (const e of all) {
    if (e.substanceId === substanceId && e.methodId === methodId) {
      const diff = Math.abs(e.timestamp - ts);
      if (diff <= DOUBLE_DOSE_WINDOW && diff < bestDiff) {
        best = e;
        bestDiff = diff;
      }
    }
  }
  if (!best) return null;
  return { entry: best, mins: Math.max(1, Math.round(bestDiff / 60000)) };
}

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

// Single-column section card with consistent spacing used by every block
// in the unified record form. Keeping the visual primitive here avoids the
// layout drift we previously saw across 6 separate step screens.
function Section({ title, description, children }: SectionProps) {
  return (
    <section aria-labelledby={undefined} className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-display text-title-md font-bold text-usnee-text">{title}</h2>
        {description && <p className="text-caption text-usnee-text3">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function persistErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'BATCH_INSUFFICIENT') return 'В партии недостаточно остатка';
  if (code === 'BATCH_CHANGED') return 'Остаток партии изменился. Обновите экран и попробуйте снова.';
  if (code === 'BATCH_UNAVAILABLE') return 'Активная партия недоступна';
  if (code === 'BATCH_INCOMPATIBLE') return 'Партия не подходит для выбранного вещества';
  return error instanceof Error ? error.message : 'Не удалось сохранить на устройстве';
}

export default function AdvancedRecordForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshEntries = useAppStore((s) => s.refreshEntries);
  const lastRecordContext = useAppStore((s) => s.lastRecordContext);
  const setLastRecordContext = useAppStore((s) => s.setLastRecordContext);
  const online = useOnlineStatus();

  // Core required fields (kept compact so a user can save in ~3 taps)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);
  const [customSubstanceName, setCustomSubstanceName] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [methodDetails, setMethodDetails] = useState<Record<string, unknown>>({});
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [requestedBatchId, setRequestedBatchId] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState('');

  // Optional enrichment (triggers, vitals, safety meta)
  const [triggerId, setTriggerId] = useState<string | null>(null);
  const [customTrigger, setCustomTrigger] = useState('');
  const [pulse, setPulse] = useState<number | ''>('');
  const [qualityNote, setQualityNote] = useState('');
  const [missedShot, setMissedShot] = useState(false);
  const [fentanylTestResult, setFentanylTestResult] = useState<'positive' | 'negative' | 'inconclusive' | null>(null);
  const [notes, setNotes] = useState('');
  const [alone, setAlone] = useState(true);
  const [timestamp, setTimestamp] = useState(getLocalDatetimeInputValue());

  const [saving, setSaving] = useState(false);
  const [savedCommand, setSavedCommand] = useState<PreparedRecordCommand | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ entry: ConsumptionEntry; mins: number } | null>(null);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const formScrollRef = useRef<HTMLDivElement | null>(null);

  const filteredSubstances = useMemo(() => {
    if (!selectedCategory) return [];
    return SUBSTANCES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  const selectedMethod = useMemo(() => METHODS.find((m) => m.id === selectedMethodId), [selectedMethodId]);
  const selectedSubstance = useMemo(() => SUBSTANCES.find((s) => s.id === selectedSubstanceId), [selectedSubstanceId]);
  const selectedTrigger = useMemo(() => TRIGGERS.find((t) => t.id === triggerId), [triggerId]);
  const compatibleBatch = useMemo(
    () => selectCompatibleBatch(activeBatch, selectedSubstanceId, requestedBatchId),
    [activeBatch, selectedSubstanceId, requestedBatchId]
  );

  useEffect(() => {
    let mounted = true;
    getActiveBatch().then((batch) => {
      if (mounted) setActiveBatch(batch ?? null);
    }).catch(() => {
      if (mounted) setActiveBatch(null);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const route = location.state;
    const hasRoute = Boolean(route && typeof route === 'object');
    const next = hasRoute
      ? route as {
          substanceId?: string;
          methodId?: string;
          amountInput?: string;
          amountUnit?: string;
          batchId?: string;
        }
      : lastRecordContext
        ? {
            substanceId: lastRecordContext.substanceId,
            methodId: lastRecordContext.methodId,
            amountUnit: lastRecordContext.amountUnit,
            batchId: lastRecordContext.batchId
          }
        : null;
    if (!next) return;
    if (next.batchId) setRequestedBatchId(next.batchId);
    if (next.substanceId) {
      const substance = SUBSTANCES.find((item) => item.id === next.substanceId);
      if (substance) {
        setSelectedCategory(substance.category);
        setSelectedSubstanceId(substance.id);
      }
    }
    if (next.methodId) setSelectedMethodId(next.methodId);
    if (hasRoute && next.amountInput) {
      const methodId = next.methodId ?? selectedMethodId;
      if (methodId === 'inject' || next.amountUnit === 'мл') {
        const volume = Number(next.amountInput);
        if (Number.isFinite(volume) && volume > 0) {
          setMethodDetails((prev) => ({ ...prev, volume }));
        }
      } else {
        const dose = Number(next.amountInput);
        if (Number.isFinite(dose) && dose > 0) {
          setMethodDetails((prev) => ({
            ...prev,
            dose,
            ...(next.amountUnit ? { doseUnit: next.amountUnit } : {})
          }));
        }
      }
    } else if (!hasRoute && lastRecordContext?.injectionSite) {
      const inferredRoute = getRouteForSite(lastRecordContext.injectionSite);
      setMethodDetails((prev) => ({
        ...prev,
        ...(inferredRoute ? { route: inferredRoute } : {}),
        site: lastRecordContext.injectionSite
      }));
    }
  }, [location.state, lastRecordContext]);

  const isDoseMissing = () => {
    if (!selectedMethod) return false;
    const doseField = selectedMethod.fields.find((f) => f.key === 'dose' || f.key === 'volume');
    if (!doseField) return false;
    const val = methodDetails[doseField.key];
    return val === undefined || val === '' || (typeof val === 'number' && val === 0);
  };

  const substanceReady = Boolean(selectedSubstanceId) || customSubstanceName.trim().length > 0;
  const methodReady = Boolean(selectedMethod);
  const doseReady = selectedMethod ? !isDoseMissing() : false;
  const canSave = substanceReady && methodReady && doseReady;

  const handleSave = async (duplicateAcknowledged = false) => {
    setSubmitAttempted(true);
    if (!canSave) {
      setHighlightMissing(true);
      // Bring the missing field into view on small screens.
      requestAnimationFrame(() => {
        if (isDoseMissing() && formScrollRef.current) {
          const firstNumber = formScrollRef.current.querySelector<HTMLInputElement>('input[type="number"]');
          firstNumber?.focus({ preventScroll: false });
          firstNumber?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }

    setSaving(true);
    setHighlightMissing(false);

    const substanceId = selectedSubstanceId || 'custom';

    // Double-dose guard: same substance + method logged within the last hour.
    if (!duplicateAcknowledged) {
      const dup = await findRecentDuplicate(substanceId, selectedMethod!.id, new Date(timestamp).getTime());
      if (dup) {
        setPendingDuplicate(dup);
        setSaving(false);
        return;
      }
    }

    const substanceName = selectedSubstance?.name || customSubstanceName || 'Неизвестно';
    const methodName = selectedMethod!.name;
    const { amountInput, amountUnit } = resolveRecordAmountFields(selectedMethod!.id, methodDetails);
    let batch = compatibleBatch;
    try {
      const latest = await getActiveBatch();
      setActiveBatch(latest ?? null);
      batch = selectCompatibleBatch(latest, substanceId, requestedBatchId);
    } catch {
      batch = compatibleBatch;
    }

    let command: PreparedRecordCommand;
    try {
      command = prepareRecordCommand({
        substanceId,
        substanceName,
        methodId: selectedMethod!.id,
        methodName,
        amountInput,
        amountUnit,
        occurredAt: new Date(timestamp).getTime(),
        alone,
        notes: notes || undefined,
        methodDetails: { ...methodDetails },
        batchId: batch?.id
      }, batch);
    } catch (error) {
      setSaveError(persistErrorMessage(error));
      setSaving(false);
      return;
    }
    command.entry = {
      ...command.entry,
      triggerId: triggerId || undefined,
      triggerName: selectedTrigger?.name || (triggerId === 'custom' ? customTrigger : undefined),
      customTrigger: triggerId === 'custom' ? customTrigger : undefined,
      qualityNote: qualityNote || undefined,
      pulse: pulse ? Number(pulse) : undefined,
      missedShot: missedShot || undefined,
      fentanylTestResult: fentanylTestResult || undefined
    };

    try {
      await persistPreparedRecord(command);
      await refreshEntries();
      if (command.batchId && command.nextBatchRemaining !== undefined) {
        applyHomeBatchRemaining(command.batchId, command.nextBatchRemaining);
        setActiveBatch((current) => current && current.id === command.batchId
          ? { ...current, remaining: command.nextBatchRemaining! }
          : current);
      }
      setSavedCommand(command);
      setSaveError('');
      setLastRecordContext(buildLastRecordContext({
        substanceId: command.entry.substanceId,
        substanceName: command.entry.substanceName,
        methodId: command.entry.methodId,
        methodName: command.entry.methodName,
        amountUnit: command.entry.doseUnit,
        batchId: command.batchId,
        methodDetails: command.entry.methodDetails,
        injectionSite: command.entry.injectionSite
      }));
    } catch (error) {
      setSaveError(persistErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (savedCommand) {
      try {
        await reversePreparedRecord(savedCommand);
        await refreshEntries();
        if (savedCommand.batchId && savedCommand.expectedBatchRemaining !== undefined) {
          applyHomeBatchRemaining(savedCommand.batchId, savedCommand.expectedBatchRemaining);
          setActiveBatch((current) => current && current.id === savedCommand.batchId
            ? { ...current, remaining: savedCommand.expectedBatchRemaining! }
            : current);
        }
      } catch (error) {
        setSaveError(persistErrorMessage(error));
        return;
      }
    }
    setSavedCommand(null);
    setPendingDuplicate(null);
  };

  const handleAddNote = () => navigate('/');
  const handleGoHome = () => navigate('/');
  const handleRepeat = () => {
    const { volume: _volume, dose: _dose, ...keptDetails } = methodDetails;
    setMethodDetails(keptDetails);
    setTriggerId(null);
    setCustomTrigger('');
    setPulse('');
    setQualityNote('');
    setMissedShot(false);
    setFentanylTestResult(null);
    setNotes('');
    setTimestamp(getLocalDatetimeInputValue());
    setSavedCommand(null);
    setPendingDuplicate(null);
    setHighlightMissing(false);
    setSubmitAttempted(false);
    setSaveError('');
    requestAnimationFrame(() => formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  // Telegram BackButton: close duplicate notice first, otherwise go home.
  useEffect(() => {
    if (savedCommand) return undefined;
    const handler = () => {
      if (pendingDuplicate) {
        setPendingDuplicate(null);
        return;
      }
      navigate('/');
    };
    return registerTelegramBackHandler(handler);
  }, [savedCommand, pendingDuplicate, navigate]);

  // --- Render helpers ---
  const renderMethodField = (field: MethodField) => {
    const value = methodDetails[field.key];
    const missing = highlightMissing && !field.optional && (value === undefined || value === '' || value === false || (typeof value === 'number' && value === 0));

    const baseWrap = `rounded-xl border-2 p-3 transition-colors ${missing ? 'border-usnee-danger' : 'border-usnee-border'}`;

    if (field.type === 'number') {
      const num = typeof value === 'number' ? value : 0;
      const stepVal = field.unit === 'мл' ? 0.1 : field.unit === 'г' ? 0.05 : 1;
      return (
        <div key={field.key} className={baseWrap}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-body-sm font-medium text-usnee-text">
              {field.label}
              {!field.optional && <span className="ml-1 text-usnee-danger" aria-hidden="true">*</span>}
            </span>
            {field.unit && <span className="text-caption text-usnee-text3">{field.unit}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: Math.max(0, +(num - stepVal).toFixed(3)) }))}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-surface text-usnee-text transition-transform active:scale-95"
              aria-label={`Уменьшить ${field.label}`}
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              value={num || ''}
              onChange={(e) => setMethodDetails((prev) => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
              placeholder={field.placeholder}
              aria-label={field.label}
              className="flex-1 rounded-lg bg-usnee-bg py-3 text-center text-xl font-bold text-usnee-text outline-none"
            />
            <button
              type="button"
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: +(num + stepVal).toFixed(3) }))}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-surface text-usnee-text transition-transform active:scale-95"
              aria-label={`Увеличить ${field.label}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      );
    }

    if (field.type === 'select') {
      // Resolve options either from a dependsOn map (e.g. injection sites
      // depend on the chosen route) or from the static options array.
      const resolvedOptions = field.dependsOn
        ? (field.dependsOn.map[String(methodDetails[field.dependsOn.key] ?? '')] ??
            field.dependsOn.fallback ??
            field.options ??
            [])
        : field.options ?? [];
      const dependencyHint = field.dependsOn
        ? (() => {
            const chosenRoute = methodDetails[field.dependsOn.key];
            if (!chosenRoute) return 'Сначала выберите способ';
            return null;
          })()
        : null;
      return (
        <div key={field.key} className={baseWrap}>
          <div className="mb-2 text-body-sm font-medium text-usnee-text">
            {field.label}
            {!field.optional && <span className="ml-1 text-usnee-danger" aria-hidden="true">*</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {resolvedOptions.map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: opt }))}
                  aria-pressed={active}
                  className={`rounded-lg px-3 py-2 text-body-sm font-medium transition-transform active:scale-95 ${
                    active ? 'bg-usnee-accent text-white' : 'bg-usnee-surface text-usnee-text'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {dependencyHint && (
            <p className="mt-2 text-caption text-usnee-text3">{dependencyHint}</p>
          )}
        </div>
      );
    }

    if (field.type === 'boolean') {
      return (
        <div key={field.key} className={baseWrap}>
          <div className="mb-2 text-body-sm font-medium text-usnee-text">{field.label}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: true }))}
              className={`flex-1 rounded-lg py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                value === true ? 'bg-usnee-danger text-white' : 'bg-usnee-surface text-usnee-text'
              }`}
            >
              Да
            </button>
            <button
              type="button"
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: false }))}
              className={`flex-1 rounded-lg py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                value === false ? 'bg-usnee-success text-white' : 'bg-usnee-surface text-usnee-text'
              }`}
            >
              Нет
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className={baseWrap}>
        <div className="mb-2 text-body-sm font-medium text-usnee-text">{field.label}</div>
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setMethodDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
          placeholder={field.placeholder}
          className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-body-sm text-usnee-text outline-none"
        />
      </div>
    );
  };

  // --- Success screen (replaces form on save) ---
  if (savedCommand) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-usnee-success/10 p-6 animate-bounce motion-reduce:animate-none">
          <CheckCircle2 className="h-12 w-12 text-usnee-success" />
        </div>
        <div>
          <h2 className="font-display text-title-xl font-bold text-usnee-text">Сохранено на устройстве</h2>
          <p className="mt-1 text-body-sm text-usnee-text2">Запись доступна в Истории и Аналитике. Отправка на сервер появится позже.</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button variant="secondary" onClick={() => void handleUndo()}>
            <Undo2 className="h-4 w-4" />
            Отменить запись
          </Button>
          <Button variant="secondary" onClick={handleRepeat}>
            <Plus className="h-4 w-4" />
            Записать ещё
          </Button>
          <Button variant="secondary" onClick={handleAddNote}>
            <FileText className="h-4 w-4" />
            Добавить заметку
          </Button>
          <Button onClick={handleGoHome}>
            <Home className="h-4 w-4" />
            На главную
          </Button>
        </div>
      </div>
    );
  }

  const duplicateNotice = pendingDuplicate && (
    <Surface variant="danger" className="space-y-3 p-4">
      <div className="flex items-center gap-2 text-body-sm font-semibold text-usnee-danger">
        <AlertTriangle className="h-4 w-4" /> Похоже, двойная доза
      </div>
      <p className="text-caption leading-relaxed text-usnee-text2">
        Такая же запись — {pendingDuplicate.entry.substanceName}, {pendingDuplicate.entry.methodName} — уже была {pendingDuplicate.mins} мин назад. Повтор подряд опасен передозировкой.
      </p>
      <Button variant="danger" onClick={() => void handleSave(true)}>
        Всё равно сохранить
      </Button>
    </Surface>
  );

  const missingNotice = submitAttempted && highlightMissing && !canSave && (
    <InlineNotice tone="danger" title="Не хватает данных">
      Укажите вещество, способ и положительную дозу, чтобы сохранить запись.
    </InlineNotice>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable form body. Bottom padding accounts for the sticky CTA
          and the host safe area so the last input never sits under the
          save button. */}
      <div
        ref={formScrollRef}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pb-[calc(6rem+var(--content-safe-area-bottom,0px))]"
      >
        <TopBar
          title="Запись"
          eyebrow={online ? 'Локально' : 'Без сети'}
          onBack={() => navigate('/')}
        />

        {!online && (
          <InlineNotice tone="info" title="Работа без сети">
            Запись сохранится на устройстве и появится в Истории. Синхронизация с сервером пока не работает.
          </InlineNotice>
        )}

        {duplicateNotice}
        {missingNotice}
        {saveError && (
          <InlineNotice tone="danger" title="Не удалось сохранить запись">
            {saveError}
          </InlineNotice>
        )}
        {compatibleBatch && !savedCommand && (
          <InlineNotice tone="info" title={`Партия «${compatibleBatch.name}»`}>
            Остаток {compatibleBatch.remaining} мг будет уменьшен вместе с записью.
          </InlineNotice>
        )}

        <Section title="Что употребляем?" description="Категория и вещество">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_ORDER.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || Pill;
              const color = CATEGORY_COLORS[cat] || '#a0a0a0';
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubstanceId(null);
                    setCustomSubstanceName('');
                  }}
                  className={`flex min-h-14 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10' : 'border-usnee-border bg-usnee-surface'
                  }`}
                  aria-pressed={active}
                >
                  <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
                  <span className="text-caption font-medium text-usnee-text text-center leading-tight">{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          {selectedCategory === 'custom' && (
            <Surface variant="default" className="p-3">
              <label className="mb-2 block text-body-sm font-medium text-usnee-text" htmlFor="custom-substance">
                Свой вариант вещества
              </label>
              <input
                id="custom-substance"
                type="text"
                value={customSubstanceName}
                onChange={(e) => setCustomSubstanceName(e.target.value)}
                placeholder="Название..."
                className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-body-sm text-usnee-text outline-none"
              />
            </Surface>
          )}

          {selectedCategory && selectedCategory !== 'custom' && (
            <div className="grid grid-cols-3 gap-2">
              {filteredSubstances.map((sub) => {
                const active = selectedSubstanceId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubstanceId(sub.id);
                      setCustomSubstanceName('');
                    }}
                    className={`flex min-h-14 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 transition-transform active:scale-95 ${
                      active ? 'border-usnee-accent bg-usnee-accent/10' : 'border-usnee-border bg-usnee-surface'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sub.color }} aria-hidden="true" />
                    <span className="text-caption font-medium text-usnee-text text-center leading-tight">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Как?" description="Способ употребления">
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((method) => {
              const Icon = METHOD_ICONS[method.icon] || Pill;
              const active = selectedMethodId === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethodId(method.id);
                    // Reset details so unit defaults follow the new method.
                    setMethodDetails({});
                  }}
                  className={`flex min-h-14 flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10' : 'border-usnee-border bg-usnee-surface'
                  }`}
                  aria-pressed={active}
                >
                  <Icon className="h-5 w-5 text-usnee-text" aria-hidden="true" />
                  <span className="text-body-sm font-medium text-usnee-text">{method.name}</span>
                  {method.abbreviations.length > 0 && (
                    <span className="text-[10px] text-usnee-text2">{method.abbreviations.join(', ')}</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedMethodId && (
            <div className="space-y-1">
              {METHODS.find((m) => m.id === selectedMethodId)?.abbreviations.map((abbr) => (
                <div key={abbr} className="text-caption text-usnee-text3">
                  {abbr} — {METHOD_ABBREVIATIONS[abbr] || abbr}
                </div>
              ))}
            </div>
          )}
        </Section>

        {selectedMethod && (
          <Section title="Детали" description="Заполните минимум — дозу или объём">
            <div className="space-y-3">
              {selectedMethod.fields.map(renderMethodField)}
            </div>
          </Section>
        )}

        <Section title="Почему?" description="Что подтолкнуло (необязательно)">
          <div className="grid grid-cols-2 gap-2">
            {TRIGGERS.map((tr) => {
              const Icon = TRIGGER_ICONS[tr.icon] || Zap;
              const active = triggerId === tr.id;
              return (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => setTriggerId(active ? null : tr.id)}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10 text-usnee-text' : 'border-usnee-border bg-usnee-surface text-usnee-text'
                  }`}
                  aria-pressed={active}
                >
                  <Icon className="h-4 w-4 text-usnee-text2" aria-hidden="true" />
                  {tr.name}
                </button>
              );
            })}
          </div>

          {triggerId === 'custom' && (
            <Surface variant="default" className="p-3">
              <label className="mb-2 block text-body-sm font-medium text-usnee-text" htmlFor="custom-trigger">
                Своя причина
              </label>
              <input
                id="custom-trigger"
                type="text"
                value={customTrigger}
                onChange={(e) => setCustomTrigger(e.target.value)}
                placeholder="Опишите..."
                className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-body-sm text-usnee-text outline-none"
              />
            </Surface>
          )}
        </Section>

        <Section title="Когда и с кем">
          <Surface variant="default" className="space-y-4 p-4">
            <div>
              <label className="mb-2 block text-body-sm font-medium text-usnee-text" htmlFor="record-time">
                Время
              </label>
              <input
                id="record-time"
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-body font-bold text-usnee-text outline-none"
              />
              <p className="mt-1 text-caption text-usnee-text3">Можно указать ретроспективно</p>
            </div>

            <div>
              <p className="mb-2 text-body-sm font-medium text-usnee-text">Компания</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAlone(true)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                    alone ? 'bg-usnee-accent text-white' : 'bg-usnee-bg text-usnee-text'
                  }`}
                  aria-pressed={alone}
                >
                  <User className="h-4 w-4" />
                  Один
                </button>
                <button
                  type="button"
                  onClick={() => setAlone(false)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                    !alone ? 'bg-usnee-success text-white' : 'bg-usnee-bg text-usnee-text'
                  }`}
                  aria-pressed={!alone}
                >
                  <Users className="h-4 w-4" />
                  Не один
                </button>
              </div>
            </div>
          </Surface>
        </Section>

        <Section title="Дополнительно" description="Необязательные метки для безопасности и самоанализа">
          <Surface variant="default" className="space-y-4 p-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-body-sm font-medium text-usnee-text">
                <Heart className="h-4 w-4 text-usnee-danger" aria-hidden="true" /> Пульс
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPulse((p) => (p === '' ? 0 : Math.max(40, Number(p) - 5)))}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-bg text-usnee-text transition-transform active:scale-95"
                  aria-label="Уменьшить пульс"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="---"
                  aria-label="Пульс"
                  className="flex-1 rounded-lg bg-usnee-bg py-3 text-center text-xl font-bold text-usnee-text outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPulse((p) => (p === '' ? 60 : Number(p) + 5))}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-bg text-usnee-text transition-transform active:scale-95"
                  aria-label="Увеличить пульс"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-body-sm font-medium text-usnee-text">
                <Star className="h-4 w-4 text-usnee-warning" aria-hidden="true" /> Качество вещества
              </div>
              <div className="flex flex-wrap gap-2">
                {['🔥 Чистое', '👍 Норм', '🤔 Среднее', '👎 Мусор', '❓ Не знаю'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQualityNote(qualityNote === q ? '' : q)}
                    className={`rounded-lg px-3 py-2 text-body-sm transition-transform active:scale-95 ${
                      qualityNote === q ? 'bg-usnee-accent text-white' : 'bg-usnee-bg text-usnee-text'
                    }`}
                    aria-pressed={qualityNote === q}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-body-sm font-medium text-usnee-text">
                <AlertTriangle className="h-4 w-4 text-usnee-danger" aria-hidden="true" /> Промах (missed shot)
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMissedShot(true)}
                  className={`flex-1 rounded-lg py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                    missedShot ? 'bg-usnee-danger text-white' : 'bg-usnee-bg text-usnee-text'
                  }`}
                  aria-pressed={missedShot}
                >
                  Да
                </button>
                <button
                  type="button"
                  onClick={() => setMissedShot(false)}
                  className={`flex-1 rounded-lg py-3 text-body-sm font-medium transition-transform active:scale-95 ${
                    !missedShot ? 'bg-usnee-success text-white' : 'bg-usnee-bg text-usnee-text'
                  }`}
                  aria-pressed={!missedShot}
                >
                  Нет
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-body-sm font-medium text-usnee-text">
                <TestTube className="h-4 w-4 text-usnee-info" aria-hidden="true" /> Тест на фентанил
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'negative' as const, label: 'Отрицательно' },
                  { key: 'positive' as const, label: 'Положительно' },
                  { key: 'inconclusive' as const, label: 'Неоднозначно' },
                  { key: null, label: 'Не проверял' }
                ].map((opt) => {
                  const active = fentanylTestResult === opt.key;
                  return (
                    <button
                      key={String(opt.key)}
                      type="button"
                      onClick={() => setFentanylTestResult(opt.key as 'positive' | 'negative' | 'inconclusive' | null)}
                      className={`rounded-lg px-3 py-2 text-body-sm transition-transform active:scale-95 ${
                        active ? 'bg-usnee-info text-white' : 'bg-usnee-bg text-usnee-text'
                      }`}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-body-sm font-medium text-usnee-text" htmlFor="record-notes">
                Заметка
              </label>
              <textarea
                id="record-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Что угодно..."
                rows={3}
                className="w-full resize-none rounded-lg bg-usnee-bg p-3 text-body-sm text-usnee-text outline-none"
              />
            </div>
          </Surface>
        </Section>

        <p className="text-caption text-usnee-text3">
          <span className="text-usnee-danger" aria-hidden="true">*</span> — обязательные поля. Остальное можно не заполнять.
        </p>
      </div>

      {/* Sticky CTA with safe-area inset. Sits inside the flex column so it
          always stays above the scroll area and above the iOS keyboard (the
          AppShell immersive container reduces height when keyboard opens). */}
      <div className="sticky bottom-0 z-20 -mx-1 border-t border-usnee-border bg-usnee-bg px-1 pb-[calc(0.75rem+var(--content-safe-area-bottom,0px))] pt-3">
        <Button
          ref={saveButtonRef}
          size="lg"
          className="w-full"
          loading={saving}
          disabled={saving}
          onClick={() => void handleSave(false)}
          aria-label={pendingDuplicate ? 'Всё равно сохранить' : 'Сохранить запись'}
        >
          <Save className="h-5 w-5" />
          {pendingDuplicate ? 'Всё равно сохранить' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
