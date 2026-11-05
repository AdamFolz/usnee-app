import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import type { EntrySyncRecord } from '../contracts';
import type { Batch, ConsumptionEntry } from '../types';
import { getBatches, getEntries, getEntrySyncRecords, updateEntryDetailsTransaction } from '../utils/db';
import { formatDateTime } from '../utils/date';
import { formatCountRu, RECORD_FORMS } from '../utils/pluralize';
import { reverseEntryById } from '../services/entryActions';
import { trackEvent } from '../integrations/analytics';
import { lastRecordContextFromEntry } from '../domain/record';
import { useAppStore } from '../stores/appStore';
import { SUBSTANCES } from '../constants/substances';
import { BottomSheet, Button, Dialog, InlineNotice, StatusBadge, Surface, TopBar } from '../components/ui';
import { RecordSummary, HistoryDashboard } from '../components/record';

function toLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function History() {
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [syncById, setSyncById] = useState<Record<string, EntrySyncRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ConsumptionEntry | null>(null);
  const [editing, setEditing] = useState<ConsumptionEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ConsumptionEntry | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const setLastRecordContext = useAppStore((state) => state.setLastRecordContext);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [records, sync, batchList] = await Promise.all([getEntries(), getEntrySyncRecords(), getBatches()]);
      const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
      setEntries(sorted);
      setBatches(batchList);
      setSyncById(Object.fromEntries(sync.map((item) => [item.entityId, item])));
      return sorted;
    } catch {
      setError('Не удалось прочитать локальную историю');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener('usnee:sync-changed', refresh);
    return () => window.removeEventListener('usnee:sync-changed', refresh);
  }, [load]);

  const openEdit = (entry: ConsumptionEntry) => {
    setEditing(entry);
    setEditTime(toLocalDateTime(entry.timestamp));
    setEditNotes(entry.notes ?? '');
  };

  const saveEdit = async () => {
    if (!editing || busy) return;
    setBusy(true);
    setError('');
    try {
      await updateEntryDetailsTransaction(editing.id, new Date(editTime).getTime(), editNotes);
      setEditing(null);
      await load();
    } catch {
      setError('Не удалось сохранить изменения. Исходная запись не потеряна.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleteEntry || busy) return;
    setBusy(true);
    setError('');
    try {
      if (!syncById[deleteEntry.id]?.createOperationId) throw new Error('LEGACY_ENTRY');
      await reverseEntryById(deleteEntry.id);
      trackEvent('record_undone');
      setDeleteEntry(null);
      setSelected(null);
      const remaining = await load();
      setLastRecordContext(lastRecordContextFromEntry(remaining[0] ?? null));
    } catch {
      setError('Эту старую запись нельзя безопасно удалить в текущей версии.');
    } finally {
      setBusy(false);
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return <div role="status" className="h-40 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />;
    }
    if (!entries.length) {
      return (
        <Surface className="p-8 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-usnee-text3" />
          <p className="mt-3 text-usnee-text2">Записей пока нет.</p>
        </Surface>
      );
    }
    return (
      <div className="space-y-3">
        {entries.map((entry) => {
          const sync = syncById[entry.id];
          const tone =
            sync?.state === 'failed'
              ? 'failed'
              : sync?.state === 'synced'
                ? 'synced'
                : sync?.state === 'conflicted'
                  ? 'warning'
                  : sync
                    ? 'pending'
                    : 'offline';
          const label =
            sync?.state === 'failed'
              ? 'Ошибка отправки'
              : sync?.state === 'synced'
                ? 'Синхронизировано'
                : sync?.state === 'conflicted'
                  ? 'Конфликт'
                  : sync?.state === 'syncing'
                    ? 'Отправляется'
                    : sync
                      ? 'На устройстве'
                      : 'Только на устройстве';
          const substance =
            entry.substanceName ||
            SUBSTANCES.find((item) => item.id === entry.substanceId)?.name ||
            entry.substanceId;
          const color = SUBSTANCES.find((item) => item.id === entry.substanceId)?.color ?? 'var(--color-brand-primary)';
          return (
            <Surface key={entry.id} className="overflow-hidden p-0">
              <div className="flex items-stretch">
                <span className="w-1.5 shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
                  aria-label={`Открыть запись: ${substance}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-body-md font-bold">{substance}</span>
                    <span className="shrink-0 text-caption tabular-nums text-usnee-text3">{formatDateTime(entry.timestamp)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-caption tabular-nums text-usnee-text2">
                      {entry.dose} {entry.doseUnit} · {entry.methodName || entry.methodId}
                    </span>
                    <StatusBadge tone={tone} className="min-h-6 shrink-0 px-2 text-[10px]">{label}</StatusBadge>
                  </span>
                </button>
                <div className="flex items-start gap-0.5 pr-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    aria-label="Изменить"
                    className="grid h-9 w-9 place-items-center rounded-md text-usnee-text3 transition-colors hover:bg-usnee-glass hover:text-usnee-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={!sync?.createOperationId}
                    onClick={() => setDeleteEntry(entry)}
                    aria-label="Удалить"
                    className="grid h-9 w-9 place-items-center rounded-md text-usnee-text3 transition-colors hover:bg-usnee-glass hover:text-usnee-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Surface>
          );
        })}
      </div>
    );
  }, [entries, loading, syncById]);

  const eyebrow = loading ? 'Загрузка…' : formatCountRu(entries.length, RECORD_FORMS);

  return (
    <div className="space-y-4 pb-8">
      <TopBar title="История" eyebrow={eyebrow} />
      {error && (
        <InlineNotice tone="danger" title="Ошибка">
          {error}
        </InlineNotice>
      )}
      {entries.length > 0 && <HistoryDashboard entries={entries} batches={batches} />}
      {content}
      <BottomSheet open={Boolean(selected)} onClose={() => setSelected(null)} title="Запись">
        {selected && (
          <div className="space-y-3">
            <RecordSummary entry={selected} />
          </div>
        )}
      </BottomSheet>
      <BottomSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Изменить запись"
        description="Количество и вещество в этой фазе не изменяются."
        footer={
          <Button loading={busy} className="w-full" onClick={saveEdit}>
            Сохранить изменения
          </Button>
        }
      >
        <div className="space-y-4">
          <label className="block text-body-sm font-bold" htmlFor="history-time">
            Время
          </label>
          <input
            id="history-time"
            type="datetime-local"
            value={editTime}
            onChange={(event) => setEditTime(event.target.value)}
            className="min-h-12 w-full rounded-lg bg-usnee-bg px-3"
          />
          <label className="block text-body-sm font-bold" htmlFor="history-note">
            Заметка
          </label>
          <textarea
            id="history-note"
            rows={4}
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            className="w-full rounded-lg bg-usnee-bg p-3"
          />
        </div>
      </BottomSheet>
      <Dialog
        open={Boolean(deleteEntry)}
        onClose={() => setDeleteEntry(null)}
        title="Удалить запись?"
        description="Запись будет отменена локальной компенсирующей операцией."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteEntry(null)}>
              Оставить
            </Button>
            <Button variant="danger" loading={busy} className="flex-1" onClick={confirmRemove}>
              Удалить
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-usnee-text2">
          История операции сохранится для целостности локальных данных.
        </p>
      </Dialog>
    </div>
  );
}

export default History;
