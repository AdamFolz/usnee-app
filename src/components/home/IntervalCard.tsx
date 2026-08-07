import { Clock3 } from 'lucide-react';
import { Surface } from '../ui';
export function formatInterval(timestamp: number | undefined, now: number): string | null {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp > now) return null;
  const minutes = Math.floor((now - timestamp) / 60000); const days = Math.floor(minutes / 1440); const hours = Math.floor((minutes % 1440) / 60); const mins = minutes % 60;
  if (days > 0) return `${days} д ${hours} ч`; if (hours > 0) return `${hours} ч ${mins} мин`; return `${minutes} мин`;
}
export function IntervalCard({ lastTimestamp, now }: { lastTimestamp?: number; now: number }) {
  const value = formatInterval(lastTimestamp, now);
  return <Surface variant="glass" className="p-4"><Clock3 className="h-5 w-5 text-usnee-info" aria-hidden="true" /><p className="mt-3 text-label uppercase text-usnee-text3">Интервал</p>{value ? <p className="mt-1 text-title-lg tabular-nums">{value}</p> : <p className="mt-1 text-body-sm text-usnee-text2">Появится после первой записи</p>}</Surface>;
}
