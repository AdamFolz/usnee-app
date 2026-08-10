import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import type { EntrySyncRecord } from '../contracts';
import type { ConsumptionEntry } from '../types';
import { getEntries, getEntrySyncRecords, updateEntryDetailsTransaction } from '../utils/db';
import { formatDateTime } from '../utils/date';
import { formatCountRu, RECORD_FORMS } from '../utils/pluralize';
import { reverseEntryById } from '../services/entryActions';
import { SUBSTANCES } from '../constants/substances';
import { BottomSheet, Button, Dialog, InlineNotice, StatusBadge, Surface, TopBar } from '../components/ui';
import { RecordSummary } from '../components/record';

function toLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function History() {
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [syncById, setSyncById] = useState<Record<string, EntrySyncRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ConsumptionEntry | null>(null);
  const [editing, setEditing] = useState<ConsumptionEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ConsumptionEntry | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [records, sync] = await Promise.all([getEntries(), getEntrySyncRecords()]);
      setEntries([...records].sort((a, b) => b.timestamp - a.timestamp));
      setSyncById(Object.fromEntries(sync.map((item) => [item.entityId, item])));
    } catch {
      setError('Не удалось прочитать локальную историю');
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
      setDeleteEntry(null);
      setSelected(null);
      await load();
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
          return (
            <Surface key={entry.id} variant="interactive" className="p-4">
              <button
                type="button"
                onClick={() => setSelected(entry)}
                className="flex min-w-0 w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
                aria-label={`Открыть запись: ${substance}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-title-md">{substance}</p>
                  <p className="mt-1 text-body-sm text-usnee-text2">
                    {entry.dose} {entry.doseUnit} · {entry.methodName || entry.methodId}
                  </p>
                  <p className="mt-2 text-caption text-usnee-text3">{formatDateTime(entry.timestamp)}</p>
                </div>
                <StatusBadge tone={tone}>{label}</StatusBadge>
              </button>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                  <Pencil className="h-4 w-4" />
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!sync?.createOperationId}
                  onClick={() => setDeleteEntry(entry)}
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </Button>
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
