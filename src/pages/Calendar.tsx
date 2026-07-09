import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  getDay
} from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Pill,
  HeartPulse,
  Zap
} from 'lucide-react';
import { getEntriesBetween } from '../utils/db';
import { SUBSTANCES } from '../constants/substances';
import { METHODS } from '../constants/methods';
import { TRIGGERS } from '../constants/triggers';
import { ConsumptionEntry } from '../types';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getDayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const start = startOfMonth(currentMonth).getTime();
    const end = endOfMonth(currentMonth).getTime();
    const data = await getEntriesBetween(start, end);
    setEntries(data);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // Adjust to start on Monday
    const startDayOfWeek = getDay(start); // 0=Sun, 1=Mon...
    const daysBeforeStart = (startDayOfWeek + 6) % 7;
    const calendarStart = new Date(start);
    calendarStart.setDate(calendarStart.getDate() - daysBeforeStart);

    // Adjust to end on Sunday
    const endDayOfWeek = getDay(end); // 0=Sun, 1=Mon...
    const daysAfterEnd = (7 - endDayOfWeek) % 7;
    const calendarEnd = new Date(end);
    calendarEnd.setDate(calendarEnd.getDate() + daysAfterEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const dayCounts = useMemo(() => {
    const map = new Map<number, { count: number; entries: ConsumptionEntry[]; color: string }>();

    entries.forEach((entry) => {
      const dayStart = getDayStart(entry.timestamp);
      const existing = map.get(dayStart);
      if (existing) {
        existing.count += 1;
        existing.entries.push(entry);
      } else {
        const sub = SUBSTANCES.find((s) => s.id === entry.substanceId);
        map.set(dayStart, {
          count: 1,
          entries: [entry],
          color: sub?.color || '#e63946',
        });
      }
    });

    return map;
  }, [entries]);

  const getDayStyle = (day: Date) => {
    const dayStart = day.getTime();
    const info = dayCounts.get(dayStart);

    if (!info || info.count === 0) {
      return { backgroundColor: '#1e1e1e' };
    }

    const alpha = info.count === 1 ? 0.3 : info.count <= 3 ? 0.6 : 1.0;
    return { backgroundColor: hexToRgba(info.color, alpha) };
  };

  const getDayLabel = (day: Date) => {
    const dayStart = day.getTime();
    const info = dayCounts.get(dayStart);
    if (!info || info.count === 0) return 'трезвый день';
    if (info.count === 1) return 'лёгкий';
    if (info.count <= 3) return 'средний';
    return 'жёсткий';
  };

  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return [];
    const start = getDayStart(selectedDay.getTime());
    const info = dayCounts.get(start);
    return info?.entries || [];
  }, [selectedDay, dayCounts]);

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

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const monthTitle = format(currentMonth, 'LLLL yyyy', { locale: ru });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-usnee-surface">
            <CalendarIcon className="h-5 w-5 text-usnee-accent" />
          </div>
          <h1 className="text-2xl font-bold capitalize text-usnee-text">{monthTitle}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-lg bg-usnee-surface p-2 text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-lg bg-usnee-surface p-2 text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-usnee-accent border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((wd) => (
              <div key={wd} className="text-center text-xs font-medium text-usnee-text2">
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const dayStyle = getDayStyle(day);
              const hasEntries = dayCounts.has(day.getTime()) && (dayCounts.get(day.getTime())?.count || 0) > 0;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-transform active:scale-95 ${
                    isCurrentMonth ? 'text-usnee-text' : 'text-usnee-text2/50'
                  }`}
                  style={dayStyle}
                >
                  {day.getDate()}
                  {hasEntries && (
                    <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-white/80" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="rounded-xl bg-usnee-surface p-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-usnee-text2">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded bg-usnee-surface2" />
                <span>0 — трезвый день</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded bg-usnee-accent/30" />
                <span>1 — лёгкий</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded bg-usnee-accent/60" />
                <span>2-3 — средний</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded bg-usnee-accent" />
                <span>4+ — жёсткий</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-usnee-surface p-4 text-center">
            <p className="text-sm text-usnee-text2">
              {entries.length === 0
                ? 'Месяц чистый. Или ты просто забыл записывать?'
                : `В этом месяце ${entries.length} записей. ${
                    entries.length > 15 ? 'Импрессивно.' : 'Умеренно.'
                  }`}
            </p>
          </div>
        </>
      )}

      {/* Day detail modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-usnee-bg p-4">
            {/* Modal header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-usnee-text">
                  {format(selectedDay, 'dd MMMM', { locale: ru })}
                </h3>
                <p className="text-xs text-usnee-text2">
                  {selectedDayEntries.length > 0
                    ? `${selectedDayEntries.length} записей — ${getDayLabel(selectedDay)}`
                    : 'Трезвый день. Красава.'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-lg bg-usnee-surface p-2 text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Entries for day */}
            {selectedDayEntries.length > 0 ? (
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {selectedDayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl bg-usnee-surface p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-usnee-text2" />
                        <span className="text-sm font-medium text-usnee-text">
                          {format(new Date(entry.timestamp), 'HH:mm')}
                        </span>
                      </div>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                        style={{
                          backgroundColor:
                            SUBSTANCES.find((s) => s.id === entry.substanceId)?.color || '#a0a0a0',
                        }}
                      >
                        {getSubstanceName(entry.substanceId, entry.substanceName)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-usnee-text">
                        <span className="font-medium">{entry.dose}</span>{' '}
                        <span className="text-usnee-text2">{entry.doseUnit}</span>
                      </span>
                      <span className="text-xs text-usnee-text2">
                        {getMethodName(entry.methodId, entry.methodName)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
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

                    {entry.notes && (
                      <p className="mt-2 text-xs text-usnee-text2">{entry.notes}</p>
                    )}

                    {entry.missedShot && (
                      <p className="mt-1 text-xs text-usnee-danger">Missed shot</p>
                    )}
                    {entry.fentanylTestResult && (
                      <p className="mt-1 text-xs text-usnee-warning">
                        Фентанил-тест: {entry.fentanylTestResult}
                      </p>
                    )}
                    {entry.qualityNote && (
                      <p className="mt-1 text-xs text-usnee-success">Quality note: {entry.qualityNote}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-usnee-surface p-6 text-center">
                <Pill className="mx-auto mb-2 h-8 w-8 text-usnee-text2" />
                <p className="text-sm text-usnee-text2">Нет записей. День прошёл трезво.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
export { Calendar };
