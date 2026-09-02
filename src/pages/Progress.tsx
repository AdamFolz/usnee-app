import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarCheck, ChevronRight, Droplets, HeartPulse, Moon, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ConsumptionEntry, MoodEntry, SleepEntry } from '../types';
import { getEntries, getMoods, getSleep, getWater } from '../utils/db';
import { startOfDay } from '../utils/date';
import { cleanStreak } from '../domain/stats';
import { Button, Surface, TopBar } from '../components/ui';

const DAY = 24 * 60 * 60 * 1000;

export function Progress() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [water, setWater] = useState<{ timestamp: number; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEntries(), getMoods(), getSleep(), getWater()]).then(([e, m, s, w]) => {
      setEntries(e);
      setMoods(m);
      setSleep(s);
      setWater(w);
    }).finally(() => setLoading(false));
  }, []);

  const last7 = useMemo(() => {
    const today = startOfDay(Date.now());
    return Array.from({ length: 7 }, (_, index) => today - (6 - index) * DAY);
  }, []);

  const activeDays = useMemo(() => new Set(entries.map((entry) => startOfDay(entry.timestamp))), [entries]);
  const cleanDays = useMemo(() => cleanStreak(entries, Date.now()), [entries]);
  const moodCount = moods.filter((item) => item.timestamp >= last7[0]).length;
  const sleepMinutes = sleep.filter((item) => item.duration && item.endTime && item.endTime >= last7[0])
    .reduce((sum, item) => sum + (item.duration || 0), 0) / 60_000;
  const waterAmount = water.filter((item) => item.timestamp >= last7[0]).reduce((sum, item) => sum + item.amount, 0);


  const cards = [
    { icon: CalendarCheck, label: 'Дни без записей', value: cleanDays, suffix: 'подряд', tone: 'text-usnee-success' },
    { icon: HeartPulse, label: 'Самочувствие', value: moodCount, suffix: 'отметок', tone: 'text-usnee-accent' },
    { icon: Moon, label: 'Сон', value: sleepMinutes ? Math.round(sleepMinutes / 60 * 10) / 10 : '—', suffix: 'часов', tone: 'text-usnee-info' },
    { icon: Droplets, label: 'Вода', value: waterAmount || '—', suffix: waterAmount ? 'мл' : 'пока нет', tone: 'text-usnee-cyan' }
  ];

  return (
    <div className="space-y-5 pb-8">
      <TopBar title="Прогресс" eyebrow="ЗА ПОСЛЕДНИЕ 7 ДНЕЙ" />
      {loading ? <div role="status" className="h-72 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" /> : (
        <>
          <Surface variant="glass" className="relative overflow-hidden p-5">

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-label uppercase text-usnee-text3"><Sparkles className="h-4 w-4 text-usnee-brand" /> Твоя динамика</div>
                <h2 className="mt-3 text-title-lg">Маленькие шаги тоже считаются</h2>
                <p className="mt-2 max-w-[17rem] text-body-sm text-usnee-text2">Смотри на факты без оценок. Выбери то, что поможет сегодня.</p>
              </div>

            </div>

          </Surface>

          <div className="grid grid-cols-2 gap-3">
            {cards.map(({ icon: Icon, label, value, suffix, tone }, index) => (
              <Surface key={label} className="animate-stagger-in p-4" style={{ animationDelay: `${index * 60}ms` }}>
                <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
                <p className="mt-3 text-caption uppercase text-usnee-text3">{label}</p>
                <p className="mt-1 text-title-xl tabular-nums">{value}</p>
                <p className="text-caption text-usnee-text2">{suffix}</p>
              </Surface>
            ))}
          </div>

          <Surface className="p-4">
            <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-usnee-brand" /><h2 className="text-title-md">Ритм недели</h2></div>
            <div className="mt-4 flex items-end justify-between gap-2" aria-label="Активность за последние 7 дней">
              {last7.map((day) => {
                const hasEntry = activeDays.has(day);
                const label = new Date(day).toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
                return <div key={day} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-lg transition-[height,background-color] duration-500 ${hasEntry ? 'h-16 bg-usnee-brand/70' : 'h-8 bg-usnee-success/70'}`} title={hasEntry ? 'Есть запись' : 'День без записи'} /><span className="text-caption capitalize text-usnee-text3">{label}</span></div>;
              })}
            </div>
          </Surface>

          <Surface className="p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-usnee-success" /><div><h2 className="text-title-md">Безопасность — это процесс</h2><p className="mt-1 text-body-sm text-usnee-text2">Проверяй самочувствие, отмечай сон и воду. Эти данные помогают заметить изменения раньше.</p></div></div>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/profile')}><TrendingUp className="h-4 w-4" /> Открыть инструменты самопомощи <ChevronRight className="ml-auto h-4 w-4" /></Button>
          </Surface>
        </>
      )}
    </div>
  );
}

export default Progress;
