import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Hash, Pill } from 'lucide-react';
import type { ConsumptionEntry } from '../types';
import { getEntries } from '../utils/db';
import { aggregateSimpleStats, filterEntriesByPeriod, type StatsPeriod } from '../domain/stats';
import { InlineNotice, Surface, TopBar } from '../components/ui';

const periods: Array<{ id: StatsPeriod; label: string }> = [
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
  { id: 'all', label: 'Всё время' }
];

export function Stats() {
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<StatsPeriod>('7d');

  useEffect(() => {
    let active = true;
    getEntries()
      .then((records) => { if (active) setEntries(records); })
      .catch(() => { if (active) setError('Не удалось прочитать локальные записи'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const periodEntries = useMemo(() => filterEntriesByPeriod(entries, period), [entries, period]);
  const stats = useMemo(() => aggregateSimpleStats(periodEntries), [periodEntries]);

  return (
    <div className="space-y-5">
      <TopBar title="Статистика" eyebrow="ЛОКАЛЬНЫЕ ДАННЫЕ" />
      {error && <InlineNotice tone="danger" title="Ошибка">{error}</InlineNotice>}
      <div className="grid grid-cols-3 gap-2" aria-label="Период статистики">
        {periods.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={period === item.id}
            onClick={() => setPeriod(item.id)}
            className={`min-h-12 rounded-lg px-2 text-body-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-usnee-focus ${period === item.id ? 'bg-brand-gradient text-white' : 'bg-usnee-surface text-usnee-text2'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div role="status" className="h-52 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />
      ) : !entries.length ? (
        <Surface className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-usnee-text3" />
          <p className="mt-3 text-usnee-text2">Недостаточно данных. Добавьте первую запись.</p>
        </Surface>
      ) : !periodEntries.length ? (
        <Surface className="p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-usnee-text3" />
          <p className="mt-3 text-usnee-text2">За выбранный период записей нет.</p>
        </Surface>
      ) : (
        <>
          <Surface variant="glass" className="p-5">
            <Hash className="h-5 w-5 text-usnee-brand" />
            <p className="mt-3 text-label uppercase text-usnee-text3">Всего записей</p>
            <p className="mt-1 text-display-lg tabular-nums">{stats.total}</p>
          </Surface>
          <section className="space-y-3" aria-labelledby="stats-days">
            <h2 id="stats-days" className="flex items-center gap-2 text-title-md"><CalendarDays className="h-5 w-5 text-usnee-info" />По дням</h2>
            {stats.byDay.map((item) => <Surface key={item.id} className="flex items-center justify-between p-4"><span className="text-body-sm">{item.label}</span><strong className="tabular-nums">{item.count}</strong></Surface>)}
          </section>
          <section className="space-y-3" aria-labelledby="stats-substances">
            <h2 id="stats-substances" className="flex items-center gap-2 text-title-md"><Pill className="h-5 w-5 text-usnee-cyan" />По веществам</h2>
            {stats.bySubstance.map((item) => <Surface key={item.id} className="flex items-center justify-between p-4"><span className="text-body-sm">{item.label}</span><strong className="tabular-nums">{item.count}</strong></Surface>)}
          </section>
        </>
      )}
    </div>
  );
}

export default Stats;
