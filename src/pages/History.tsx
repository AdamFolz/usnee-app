import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon,
  User,
  Users,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Syringe,
  Star,
  Pencil,
  Trash2,
  ChevronDown,
  HeartPulse,
  Clock,
  Zap,
  X
} from 'lucide-react';
import { ConsumptionEntry } from '../types';
import { getEntries, deleteEntry } from '../utils/db';
import { formatTime, startOfDay, startOfWeek, startOfMonth } from '../utils/date';
import { SUBSTANCES } from '../constants/substances';
import { METHODS } from '../constants/methods';
import { TRIGGERS } from '../constants/triggers';

const PAGE_SIZE = 10;

type DateFilter = 'today' | 'week' | 'month' | 'all';

function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [substanceFilter, setSubstanceFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedFilters, setExpandedFilters] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const all = await getEntries();
    setEntries(all.reverse());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    const now = Date.now();
    if (dateFilter === 'today') {
      const start = startOfDay(now);
      result = result.filter((e) => e.timestamp >= start);
    } else if (dateFilter === 'week') {
      const start = startOfWeek(now);
      result = result.filter((e) => e.timestamp >= start);
    } else if (dateFilter === 'month') {
      const start = startOfMonth(now);
      result = result.filter((e) => e.timestamp >= start);
    }

    if (substanceFilter !== 'all') {
      result = result.filter((e) => e.substanceId === substanceFilter);
    }
    if (methodFilter !== 'all') {
      result = result.filter((e) => e.methodId === methodFilter);
    }

    return result;
  }, [entries, dateFilter, substanceFilter, methodFilter]);

  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);

  const hasMore = visibleEntries.length < filteredEntries.length;

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await deleteEntry(id);
      setConfirmDelete(null);
      loadEntries();
    } else {
      setConfirmDelete(id);
    }
  };

  const handleEdit = (entry: ConsumptionEntry) => {
    navigate('/add', { state: { entry } });
  };

  const getSubstanceColor = (substanceId: string) => {
    const s = SUBSTANCES.find((sub) => sub.id === substanceId);
    return s?.color || '#a0a0a0';
  };

  const getSubstanceName = (substanceId: string, fallback?: string) => {
    const s = SUBSTANCES.find((sub) => sub.id === substanceId);
    return s?.name || fallback || substanceId;
  };

  const getMethodName = (methodId: string, fallback?: string) => {
    const m = METHODS.find((me) => me.id === methodId);
    return m?.name || fallback || methodId;
  };

  const getTriggerName = (triggerId?: string) => {
    if (!triggerId) return null;
    const t = TRIGGERS.find((tr) => tr.id === triggerId);
    return t?.name || triggerId;
  };

  const dateFilterOptions: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'all', label: 'Всё' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-usnee-surface">
          <HistoryIcon className="h-5 w-5 text-usnee-accent" />
        </div>
        <h1 className="text-2xl font-bold text-usnee-text">История</h1>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Date filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dateFilterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setDateFilter(opt.key);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                dateFilter === opt.key
                  ? 'bg-usnee-accent text-white'
                  : 'bg-usnee-surface text-usnee-text2 hover:text-usnee-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Expandable filters */}
        <button
          onClick={() => setExpandedFilters(!expandedFilters)}
          className="flex w-full items-center justify-between rounded-lg bg-usnee-surface px-3 py-2 text-sm text-usnee-text2 transition-colors hover:text-usnee-text"
        >
          <span>Фильтры по ПАВ и способу</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expandedFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedFilters && (
          <div className="space-y-3 rounded-xl bg-usnee-surface p-3">
            {/* Substance filter */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-usnee-text2">ПАВ</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSubstanceFilter('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    substanceFilter === 'all'
                      ? 'bg-usnee-text text-usnee-bg'
                      : 'bg-usnee-surface2 text-usnee-text2 hover:text-usnee-text'
                  }`}
                >
                  Все
                </button>
                {SUBSTANCES.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() =>
                      setSubstanceFilter(sub.id === substanceFilter ? 'all' : sub.id)
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      substanceFilter === sub.id
                        ? 'text-white'
                        : 'bg-usnee-surface2 text-usnee-text2 hover:text-usnee-text'
                    }`}
                    style={
                      substanceFilter === sub.id
                        ? { backgroundColor: sub.color }
                        : undefined
                    }
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Method filter */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-usnee-text2">Способ</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMethodFilter('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    methodFilter === 'all'
                      ? 'bg-usnee-text text-usnee-bg'
                      : 'bg-usnee-surface2 text-usnee-text2 hover:text-usnee-text'
                  }`}
                >
                  Все
                </button>
                {METHODS.map((me) => (
                  <button
                    key={me.id}
                    onClick={() =>
                      setMethodFilter(me.id === methodFilter ? 'all' : me.id)
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      methodFilter === me.id
                        ? 'bg-usnee-info text-white'
                        : 'bg-usnee-surface2 text-usnee-text2 hover:text-usnee-text'
                    }`}
                  >
                    {me.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-usnee-accent border-t-transparent" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-xl bg-usnee-surface p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-usnee-text2" />
          <p className="text-usnee-text2">Пока тишина. Сделай первую запись, пока не забыл.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const subColor = getSubstanceColor(entry.substanceId);
            const isConfirming = confirmDelete === entry.id;

            return (
              <div
                key={entry.id}
                className="relative overflow-hidden rounded-xl bg-usnee-surface p-4 transition-all"
              >
                {/* Confirm delete overlay */}
                {isConfirming && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-usnee-bg/95 p-4">
                    <p className="text-center text-sm text-usnee-text">
                      Точно? Это навсегда.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-lg bg-usnee-danger px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95"
                      >
                        Удалить
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-lg bg-usnee-surface2 px-4 py-2 text-sm font-medium text-usnee-text transition-transform active:scale-95"
                      >
                        Оставить
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Time & substance */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-usnee-text">
                        {formatTime(entry.timestamp)}
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: subColor }}
                      >
                        {getSubstanceName(entry.substanceId, entry.substanceName)}
                      </span>
                      <span className="text-xs text-usnee-text2">
                        {getMethodName(entry.methodId, entry.methodName)}
                      </span>
                    </div>

                    {/* Dose */}
                    <div className="text-sm text-usnee-text">
                      <span className="font-medium">{entry.dose}</span>{' '}
                      <span className="text-usnee-text2">{entry.doseUnit}</span>
                    </div>

                    {/* Trigger & pulse */}
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.triggerId && (
                        <span className="flex items-center gap-1 rounded-md bg-usnee-surface2 px-2 py-0.5 text-xs text-usnee-text2">
                          <Zap className="h-3 w-3" />
                          {getTriggerName(entry.triggerId) || entry.customTrigger}
                        </span>
                      )}
                      {entry.pulse && (
                        <span className="flex items-center gap-1 rounded-md bg-usnee-surface2 px-2 py-0.5 text-xs text-usnee-danger">
                          <HeartPulse className="h-3 w-3" />
                          {entry.pulse} bpm
                        </span>
                      )}
                    </div>

                    {/* Icons row */}
                    <div className="flex items-center gap-3 pt-1">
                      {entry.alone ? (
                        <User className="h-4 w-4 text-usnee-text2" />
                      ) : (
                        <Users className="h-4 w-4 text-usnee-success" />
                      )}

                      {entry.fentanylTestResult && (
                        <span title={`Фентанил: ${entry.fentanylTestResult}`}>
                          {entry.fentanylTestResult === 'negative' ? (
                            <CheckCircle className="h-4 w-4 text-usnee-success" />
                          ) : entry.fentanylTestResult === 'positive' ? (
                            <AlertTriangle className="h-4 w-4 text-usnee-danger" />
                          ) : (
                            <HelpCircle className="h-4 w-4 text-usnee-warning" />
                          )}
                        </span>
                      )}

                      {entry.missedShot && (
                        <span title="Missed shot" className="flex items-center gap-0.5 text-usnee-danger">
                          <Syringe className="h-4 w-4" />
                          <X className="h-3 w-3" />
                        </span>
                      )}

                      {entry.qualityNote && (
                        <Star className="h-4 w-4 text-usnee-warning" />
                      )}
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <p className="text-xs text-usnee-text2">{entry.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="rounded-lg bg-usnee-surface2 p-2 text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-lg bg-usnee-surface2 p-2 text-usnee-text2 transition-colors hover:text-usnee-danger active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full rounded-xl bg-usnee-surface py-3 text-sm font-medium text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
            >
              Загрузить ещё
            </button>
          )}

          {/* Footer info */}
          <p className="text-center text-xs text-usnee-text2">
            Показано {visibleEntries.length} из {filteredEntries.length}
          </p>
        </div>
      )}
    </div>
  );
}

export default History;
export { History };
