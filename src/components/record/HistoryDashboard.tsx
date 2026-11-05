import { useMemo } from 'react';
import { Activity, Droplet, Flame } from 'lucide-react';
import type { ConsumptionEntry, Batch } from '../../types';
import type { HeatmapCell } from '../../domain/stats';
import { buildHeatmap, aggregateDoseSummary, usageStreak, cleanStreak } from '../../domain/stats';
import { Surface } from '../ui';
import { formatCountRu, RECORD_FORMS } from '../../utils/pluralize';

const DAY = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 84; // ~12 weeks

const INTENSITY_COLORS = [
  'bg-usnee-surface3',
  'bg-usnee-brand/25',
  'bg-usnee-brand/45',
  'bg-usnee-brand/70',
  'bg-usnee-brand'
];

function formatMg(mg: number): string {
  if (mg >= 1000) return `${(mg / 1000).toFixed(1)} г`;
  if (mg >= 1) return `${Math.round(mg)} мг`;
  return `${(mg * 1000).toFixed(0)} мкг`;
}

function formatDateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function HistoryDashboard({ entries, batches }: { entries: ConsumptionEntry[]; batches: Batch[] }) {
  const heatmap = useMemo(() => buildHeatmap(entries, HEATMAP_DAYS), [entries]);
  const doseSummary = useMemo(() => aggregateDoseSummary(entries, batches), [entries, batches]);
  const usageDays = useMemo(() => usageStreak(entries), [entries]);
  const cleanDays = useMemo(() => cleanStreak(entries, Date.now()), [entries]);

  const weeks = useMemo(() => {
    const result: HeatmapCell[][] = [];
    for (let i = 0; i < heatmap.cells.length; i += 7) {
      result.push(heatmap.cells.slice(i, i + 7));
    }
    return result;
  }, [heatmap]);

  const visibleWeeks = weeks.slice(-12);
  const totalEntries = entries.length;
  const totalEntries30d = useMemo(
    () => entries.filter((entry) => entry.timestamp >= Date.now() - 30 * DAY).length,
    [entries]
  );

  return (
    <div className="space-y-3">
      <Surface className="grid grid-cols-3 divide-x divide-usnee-borderSubtle px-1 py-2.5 text-center">
        <div className="px-2">
          <p className="flex items-center justify-center gap-1 text-caption text-usnee-text3">
            <Flame className="h-3.5 w-3.5 text-usnee-accent" aria-hidden="true" />
            подряд
          </p>
          <p className="mt-0.5 text-title-md tabular-nums">{usageDays}</p>
        </div>
        <div className="px-2">
          <p className="text-caption text-usnee-text3">без записей</p>
          <p className="mt-0.5 text-title-md tabular-nums text-usnee-success">{cleanDays}</p>
        </div>
        <div className="px-2">
          <p className="text-caption text-usnee-text3">всего / 30д</p>
          <p className="mt-0.5 text-title-md tabular-nums">
            {totalEntries}
            <span className="text-usnee-text3"> / {totalEntries30d}</span>
          </p>
        </div>
      </Surface>

      <Surface className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-caption uppercase text-usnee-text3">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Активность · 12 недель
          </p>
          <p className="text-caption text-usnee-text3">{formatCountRu(totalEntries, RECORD_FORMS)}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label="Тепловая карта активности по дням">
          {visibleWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className={`h-3.5 w-3.5 rounded-[3px] ${INTENSITY_COLORS[cell.intensity]}`}
                  aria-label={`${formatDateLabel(cell.date)}: ${formatCountRu(cell.count, RECORD_FORMS)}`}
                  title={`${formatDateLabel(cell.date)}: ${cell.count}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1 text-caption text-usnee-text3">
          <span>меньше</span>
          {INTENSITY_COLORS.map((color, index) => (
            <div key={index} className={`h-2 w-2 rounded-[2px] ${color}`} />
          ))}
          <span>больше</span>
        </div>
      </Surface>

      {doseSummary.bySubstance.length > 0 && (
        <Surface className="p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-caption uppercase text-usnee-text3">
            <Droplet className="h-3.5 w-3.5 text-usnee-accent" aria-hidden="true" />
            Суммы доз
          </p>
          <div className="divide-y divide-usnee-borderSubtle">
            {doseSummary.bySubstance.slice(0, 5).map((item) => (
              <div key={item.substanceId} className="flex items-baseline justify-between gap-2 py-1.5 text-body-sm">
                <span className="min-w-0 flex-1 truncate text-usnee-text2">{item.label}</span>
                <span className="font-bold tabular-nums">
                  {item.totalMg !== undefined ? formatMg(item.totalMg) : formatCountRu(item.count, RECORD_FORMS)}
                </span>
              </div>
            ))}
          </div>
          {doseSummary.bySubstance.some((item) => item.totalMg === undefined) && (
            <p className="mt-1 text-caption text-usnee-text3">Без концентрации партии — счётчиками, не суммой</p>
          )}
        </Surface>
      )}
    </div>
  );
}
