import { Clock3, Plus, Repeat } from 'lucide-react';
import type { ConsumptionEntry } from '../../types';
import { SUBSTANCES } from '../../constants/substances';
import { formatTime } from '../../utils/date';
import { Button, Surface } from '../ui';
import { formatInterval } from './IntervalCard';

export interface LastEntryCardProps {
  entry: ConsumptionEntry | null;
  substanceName: string;
  now: number;
  onOpenHistory: () => void;
  onCreate: () => void;
  onRepeat?: () => void;
  repeating?: boolean;
}

export function LastEntryCard({
  entry,
  substanceName,
  now,
  onOpenHistory,
  onCreate,
  onRepeat,
  repeating
}: LastEntryCardProps) {
  if (!entry) {
    return (
      <Surface className="p-5">
        <p className="text-caption uppercase tracking-[.16em] text-usnee-text3">Последняя запись</p>
        <h2 className="display mt-2 text-title-lg">Пока пусто</h2>
        <p className="mt-1 text-body-sm text-usnee-text2">Первая запись — как первая строка. Дальше будет проще.</p>
        <Button className="mt-4 w-full" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Сделать первую запись
        </Button>
      </Surface>
    );
  }

  const name = entry.substanceName || substanceName;
  const color = SUBSTANCES.find((substance) => substance.id === entry.substanceId)?.color ?? 'var(--color-brand-primary)';
  const interval = formatInterval(entry.timestamp, now);

  return (
    <Surface className="relative overflow-hidden p-5 pl-6">
      <span aria-hidden="true" className="absolute inset-y-5 left-0 w-[3px] rounded-r-sm bg-usnee-brand" />
      <button
        type="button"
        onClick={onOpenHistory}
        aria-label={`Последняя запись: ${name}. Открыть журнал`}
        className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-caption uppercase tracking-[.16em] text-usnee-text3">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            Последняя запись
          </span>
          <span className="num text-caption text-usnee-text3">{formatTime(entry.timestamp)}</span>
        </div>
        <h2 className="display mt-2 text-display-lg text-usnee-text">{name}</h2>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="num text-title-xl font-semibold text-usnee-brand">
            {entry.dose} {entry.doseUnit}
          </span>
          <span className="text-body-sm text-usnee-text2">{entry.methodName || entry.methodId}</span>
        </p>
        {interval && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-caption text-usnee-text2">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {interval} назад
          </p>
        )}
      </button>
      <div className="mt-4 flex gap-2">
        {onRepeat && (
          <Button className="flex-1" loading={repeating} onClick={onRepeat}>
            <Repeat className="h-4 w-4" aria-hidden="true" />
            Повторить
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Записать
        </Button>
      </div>
    </Surface>
  );
}
