import { CalendarDays } from 'lucide-react';
import { Surface } from '../ui';
import type { ConsumptionEntry } from '../../types';
import { formatCountRu, RECORD_FORMS } from '../../utils/pluralize';
import { getCalendarWeekEntries } from '../../domain/stats';

export function getWeekCount(entries: ConsumptionEntry[], now: number): number {
  return getCalendarWeekEntries(entries, now).length;
}

export function WeeklySummaryCard({ entries, todayCount, now }: { entries: ConsumptionEntry[]; todayCount: number; now: number }) {
  const count = getWeekCount(entries, now);
  return (
    <Surface variant="glass" className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label uppercase text-usnee-text3">На неделе</p>
        <CalendarDays className="h-4 w-4 text-usnee-cyan" aria-hidden="true" />
      </div>
      <p className="mt-2 text-title-lg tabular-nums">{formatCountRu(count, RECORD_FORMS)}</p>
      <p className="mt-1 text-caption text-usnee-text2">Сегодня: {todayCount}</p>
    </Surface>
  );
}
