import { useEffect, useMemo, useState } from 'react';
import { TimerReset } from 'lucide-react';
import { Button, InlineNotice, StatusBadge, Surface } from '../ui';
import { SAFETY_TIMER_DISCLOSURE_RU, SAFETY_DANGER_SIGNS_RU } from '../../contracts/safety';

const INTERVAL_OPTIONS_MIN = [10, 20, 30] as const;

interface TimerSession {
  startedAt: number;
  lastCheckIn: number;
  intervalMinutes: number;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Local check-in timer. Runs ONLY while the Mini App is active. It does not
 * notify anyone and does not call anyone — when the interval elapses it shows
 * an on-screen reminder to self-check and, if needed, call for help manually.
 */
export function LocalCheckInTimer() {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [intervalMinutes, setIntervalMinutes] = useState<number>(INTERVAL_OPTIONS_MIN[1]);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  const deadline = useMemo(
    () => (session ? session.lastCheckIn + session.intervalMinutes * 60_000 : null),
    [session]
  );
  const overdue = deadline !== null && now >= deadline;

  const start = () => {
    const startedAt = Date.now();
    setNow(startedAt);
    setSession({ startedAt, lastCheckIn: startedAt, intervalMinutes });
  };

  const checkIn = () => {
    const at = Date.now();
    setNow(at);
    setSession((current) => (current ? { ...current, lastCheckIn: at } : current));
  };

  const stop = () => setSession(null);

  return (
    <Surface variant="raised" className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-usnee-text">
          <TimerReset className="h-4 w-4" aria-hidden="true" />
          Локальный таймер проверки
        </h3>
        {session && (
          <StatusBadge tone={overdue ? 'failed' : 'active'}>
            {overdue ? 'Время вышло' : 'Идёт'}
          </StatusBadge>
        )}
      </div>

      <p className="text-xs leading-relaxed text-usnee-text2">{SAFETY_TIMER_DISCLOSURE_RU}</p>

      {!session && (
        <>
          <div role="group" aria-label="Интервал проверки" className="flex gap-2">
            {INTERVAL_OPTIONS_MIN.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={intervalMinutes === minutes}
                onClick={() => setIntervalMinutes(minutes)}
                className={
                  intervalMinutes === minutes
                    ? 'min-h-12 flex-1 rounded-md border border-usnee-brand/40 bg-usnee-brand/15 px-3 text-sm font-bold text-usnee-text'
                    : 'min-h-12 flex-1 rounded-md border border-usnee-border bg-usnee-surface2 px-3 text-sm font-semibold text-usnee-text2'
                }
              >
                {minutes} мин
              </button>
            ))}
          </div>
          <Button variant="secondary" className="w-full" onClick={start}>
            Запустить таймер
          </Button>
        </>
      )}

      {session && !overdue && deadline !== null && (
        <>
          <p className="text-sm text-usnee-text" role="timer" aria-label="Время до проверки">
            До проверки: <span className="font-bold tabular-nums">{formatRemaining(deadline - now)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={checkIn}>
              Я в порядке
            </Button>
            <Button variant="ghost" className="flex-1" onClick={stop}>
              Остановить
            </Button>
          </div>
        </>
      )}

      {session && overdue && (
        <>
          <InlineNotice tone="danger" title="Проверка пропущена">
            {SAFETY_DANGER_SIGNS_RU}
          </InlineNotice>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={checkIn}>
              Я в порядке
            </Button>
            <Button variant="ghost" className="flex-1" onClick={stop}>
              Остановить
            </Button>
          </div>
        </>
      )}
    </Surface>
  );
}
