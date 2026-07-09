import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Hash,
  Pill,
  AlertCircle
} from 'lucide-react';
import { getEntries, getEntriesBetween } from '../utils/db';
import { startOfDay, startOfWeek, startOfMonth, timeSince } from '../utils/date';
import { SUBSTANCES, CATEGORY_LABELS } from '../constants/substances';
import { TRIGGERS } from '../constants/triggers';
import { ConsumptionEntry } from '../types';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
];

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}ч`);

const CHART_COLORS = ['#e63946', '#fb8500', '#2a9d8f', '#457b9d', '#9b5de5', '#e9c46a', '#e5e5e5'];

function getPeriodRange(period: Period): { start: number; end: number } {
  const now = Date.now();
  const end = now;
  let start = 0;

  if (period === 'today') start = startOfDay(now);
  else if (period === 'week') start = startOfWeek(now);
  else if (period === 'month') start = startOfMonth(now);

  return { start, end };
}

function Stats() {
  const [period, setPeriod] = useState<Period>('week');
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = getPeriodRange(period);
    const data =
      period === 'all'
        ? await getEntries()
        : await getEntriesBetween(start, end);
    setEntries(data.reverse());
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const totalEntries = entries.length;
    const totalDose = entries.reduce((sum, e) => sum + (Number(e.dose) || 0), 0);
    const lastEntry = entries.length > 0 ? entries[0] : null; // already reversed
    const timeSinceLast = lastEntry ? timeSince(lastEntry.timestamp) : '—';

    const triggerCounts: Record<string, number> = {};
    entries.forEach((e) => {
      const key = e.triggerId || e.customTrigger || 'unknown';
      triggerCounts[key] = (triggerCounts[key] || 0) + 1;
    });
    const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];
    let topTriggerName = '—';
    if (topTrigger) {
      const t = TRIGGERS.find((tr) => tr.id === topTrigger[0]);
      topTriggerName = t?.name || topTrigger[0];
    }

    return { totalEntries, totalDose, timeSinceLast, topTriggerName };
  }, [entries]);

  const hourlyData = useMemo(() => {
    const counts = Array(24).fill(0);
    entries.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      counts[hour]++;
    });
    return HOUR_LABELS.map((label, i) => ({ hour: label, count: counts[i] }));
  }, [entries]);

  const dailyData = useMemo(() => {
    // order: Mon-Sun (1-7, with 0=Sun moved to end)
    const counts = Array(7).fill(0);
    entries.forEach((e) => {
      let day = new Date(e.timestamp).getDay(); // 0=Sun, 1=Mon...
      day = day === 0 ? 6 : day - 1; // now 0=Mon, 6=Sun
      counts[day]++;
    });
    const orderedDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return orderedDays.map((label, i) => ({ day: label, count: counts[i] }));
  }, [entries]);

  const doseTimeline = useMemo(() => {
    return [...entries].reverse().map((e) => ({
      date: new Date(e.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      fullDate: e.timestamp,
      dose: Number(e.dose) || 0,
      substance: e.substanceName || e.substanceId,
    }));
  }, [entries]);

  const categoryData = useMemo(() => {
    const catCounts: Record<string, number> = {};
    entries.forEach((e) => {
      const sub = SUBSTANCES.find((s) => s.id === e.substanceId);
      const cat = sub?.category || 'custom';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    return Object.entries(catCounts).map(([cat, count]) => ({
      name: CATEGORY_LABELS[cat] || cat,
      value: count,
      color: SUBSTANCES.find((s) => s.category === cat)?.color || '#a0a0a0',
    }));
  }, [entries]);

  const triggerData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const key = e.triggerId || e.customTrigger || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => {
        const t = TRIGGERS.find((tr) => tr.id === key);
        return { name: t?.name || key, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entries]);

  const isEmpty = entries.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-usnee-surface">
          <BarChart3 className="h-5 w-5 text-usnee-accent" />
        </div>
        <h1 className="text-2xl font-bold text-usnee-text">Статистика</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
              period === opt.key
                ? 'bg-usnee-accent text-white'
                : 'bg-usnee-surface text-usnee-text2 hover:text-usnee-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-usnee-accent border-t-transparent" />
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl bg-usnee-surface p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-usnee-text2" />
          <p className="text-usnee-text2">
            Недостаточно данных. Иди покайфуй, потом вернёмся к цифрам.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-usnee-surface p-4">
              <div className="mb-1 flex items-center gap-2 text-usnee-text2">
                <Hash className="h-4 w-4" />
                <span className="text-xs">Записей</span>
              </div>
              <p className="text-2xl font-bold text-usnee-text">{metrics.totalEntries}</p>
            </div>
            <div className="rounded-xl bg-usnee-surface p-4">
              <div className="mb-1 flex items-center gap-2 text-usnee-text2">
                <Pill className="h-4 w-4" />
                <span className="text-xs">Общая доза</span>
              </div>
              <p className="text-2xl font-bold text-usnee-text">{metrics.totalDose.toFixed(1)}</p>
            </div>
            <div className="rounded-xl bg-usnee-surface p-4">
              <div className="mb-1 flex items-center gap-2 text-usnee-text2">
                <Clock className="h-4 w-4" />
                <span className="text-xs">С последнего раза</span>
              </div>
              <p className="text-lg font-bold text-usnee-text">{metrics.timeSinceLast}</p>
            </div>
            <div className="rounded-xl bg-usnee-surface p-4">
              <div className="mb-1 flex items-center gap-2 text-usnee-text2">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Топ-триггер</span>
              </div>
              <p className="text-lg font-bold text-usnee-text">{metrics.topTriggerName}</p>
            </div>
          </div>

          {/* Chart 1: Hourly heatmap */}
          <div className="rounded-xl bg-usnee-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-usnee-text">По часам</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="hour" tick={{ fill: '#a0a0a0', fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                  />
                  <Bar dataKey="count" fill="#e63946" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Weekday */}
          <div className="rounded-xl bg-usnee-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-usnee-text">По дням недели</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="day" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                  />
                  <Bar dataKey="count" fill="#fb8500" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Dose timeline */}
          <div className="rounded-xl bg-usnee-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-usnee-text">Динамика дозировки</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={doseTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    formatter={(value: any) => [value, 'Доза']}
                  />
                  <Line type="monotone" dataKey="dose" stroke="#2a9d8f" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Categories pie */}
          <div className="rounded-xl bg-usnee-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-usnee-text">Категории ПАВ</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                  />
                  <Legend wrapperStyle={{ color: '#a0a0a0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Triggers top-5 */}
          <div className="rounded-xl bg-usnee-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-usnee-text">Топ триггеров</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={triggerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis type="number" tick={{ fill: '#a0a0a0', fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#a0a0a0', fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {triggerData.map((_, index) => (
                      <Cell key={`trig-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tolerance joke */}
          <div className="rounded-xl bg-usnee-surface p-4 text-center">
            <TrendingUp className="mx-auto mb-2 h-5 w-5 text-usnee-accent2" />
            <p className="text-sm text-usnee-text2">
              Если график дозировки растёт — поздравляем, толерантность тоже растёт.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stats;
export { Stats };
