import { useMemo } from 'react';
import { Flame, TrendingUp, Droplet } from 'lucide-react';
import type { ConsumptionEntry, Batch } from '../../types';
import type { HeatmapCell } from '../../domain/stats';
import {
  buildHeatmap,
  aggregateDoseSummary,
  usageStreak,
  cleanStreak,
} from '../../domain/stats';
import { Surface } from '../ui';
import { formatCountRu, RECORD_FORMS } from '../../utils/pluralize';

const DAY = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 84; // ~12 weeks

const INTENSITY_COLORS = [
  'bg-usnee-surface3',
  'bg-usnee-accent/30',
  'bg-usnee-accent/50',
  'bg-usnee-accent/70',
  'bg-usnee-accent',
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

  // Group heatmap cells into weeks (7 per column)
  const weeks = useMemo(() => {
    const result: typeof heatmap.cells[] = [];
    for (let i = 0; i < heatmap.cells.length; i += 7) {
      result.push(heatmap.cells.slice(i, i + 7));
    }
    return result;
  }, [heatmap]);

  const visibleWeeks = weeks.slice(-12);
  const totalEntries = entries.length;
  const totalEntries30d = useMemo(
    () => entries.filter((e) => e.timestamp >= Date.now() - 30 * DAY).length,
    [entries]
  );

  return (
    <div className="space-y-3">
      {/* Streaks */}
      <div className="grid grid-cols-2 gap-2">
        <Surface className="flex items-center gap-3 p-3">
          <Flame className="h-5 w-5 text-usnee-accent" />
          <div>
            <p className="text-title-sm leading-tight">{usageDays}</p>
            <p className="text-caption text-usnee-text3">дней подряд</p>
          </div>
        </Surface>
        <Surface className="flex items-center gap-3 p-3">
          <TrendingUp className="h-5 w-5 text-usnee-success" />
          <div>
            <p className="text-title-sm leading-tight">{cleanDays}</p>
            <p className="text-caption text-usnee-text3">дней без записей</p>
          </div>
        </Surface>
      </div>

      {/* Heatmap */}
      <Surface className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-body-sm font-bold">Активность</p>
          <p className="text-caption text-usnee-text3">{formatCountRu(totalEntries, RECORD_FORMS)} · {totalEntries30d} за 30д</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label="Тепловая карта активности по дням">
          {visibleWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell: HeatmapCell) => (
                <div
                  key={cell.date}
                  className={`h-3 w-3 rounded-sm ${INTENSITY_COLORS[cell.intensity]}`}
                  aria-label={`${formatDateLabel(cell.date)}: ${formatCountRu(cell.count, RECORD_FORMS)}`}
                  title={`${formatDateLabel(cell.date)}: ${cell.count}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-caption text-usnee-text3">
          <span>меньше</span>
          {INTENSITY_COLORS.map((c, i) => (
            <div key={i} className={`h-2 w-2 rounded-sm ${c}`} />
          ))}
          <span>больше</span>
        </div>
      </Surface>

      {/* Dose summary */}
      {doseSummary.bySubstance.length > 0 && (
        <Surface className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Droplet className="h-4 w-4 text-usnee-accent" />
            <p className="text-body-sm font-bold">Суммы доз</p>
          </div>
          <div className="space-y-2">
            {doseSummary.bySubstance.slice(0, 5).map((s) => (
              <div key={s.substanceId} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-body-sm text-usnee-text2">{s.label}</span>
                <span className="text-body-sm font-bold">
                  {s.totalMg !== undefined ? formatMg(s.totalMg) : formatCountRu(s.count, RECORD_FORMS)}
                </span>
              </div>
            ))}
          </div>
          {doseSummary.bySubstance.some((s) => s.totalMg === undefined) && (
            <p className="mt-2 text-caption text-usnee-text3">
              Без концентрации партии — счётчиками, не суммой
            </p>
          )}
        </Surface>
      )}
    </div>
  );
}
