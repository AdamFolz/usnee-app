import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CalendarCheck, ChevronRight, Droplets, HeartPulse, Moon, ShieldCheck, Sparkles, TrendingUp, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ConsumptionEntry, MoodEntry, SleepEntry, Batch, WaterEntry } from '../types';
import { getEntries, getMoods, getSleep, getWater, getBatches } from '../utils/db';
import { startOfDay } from '../utils/date';
import { cleanStreak } from '../domain/stats';
import { evaluateUnlockedAchievements } from '../domain/achievements';
import { calculateXpSnapshot, getLevelName, xpForLevel } from '../domain/gamification';
import { hapticNotification } from '../integrations/telegram';
import { ConfettiBurst } from '../components/ConfettiBurst';
import { Button, Surface, TopBar } from '../components/ui';

const DAY = 24 * 60 * 60 * 1000;

export function Progress() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [water, setWater] = useState<WaterEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEntries(), getMoods(), getSleep(), getWater(), getBatches()]).then(([e, m, s, w, b]) => {
      setEntries(e);
      setMoods(m);
      setSleep(s);
      setWater(w);
      setBatches(b);
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

  // XP / Level calculation
  const xpSnapshot = useMemo(() => {
    const unlocked = evaluateUnlockedAchievements({ entries, water, batches });
    return calculateXpSnapshot({ entries, moods, sleep, water, batches, unlockedAchievements: unlocked });
  }, [entries, moods, sleep, water, batches]);

  const levelName = getLevelName(xpSnapshot.level);
  const nextLevelXp = xpForLevel(xpSnapshot.level + 1);
  const xpToNext = nextLevelXp - xpSnapshot.xpInLevel;

  // Level-up celebration: fire once when level increases between renders
  const prevLevelRef = useRef(xpSnapshot.level);
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => {
    if (xpSnapshot.level > prevLevelRef.current && prevLevelRef.current > 0) {
      setCelebrate((c) => c + 1);
      hapticNotification('success');
    }
    prevLevelRef.current = xpSnapshot.level;
  }, [xpSnapshot.level]);


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

          {/* XP / Level Card */}
          <Surface className="relative p-4">
            <ConfettiBurst burstKey={celebrate} active={celebrate > 0} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  key={celebrate}
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-usnee-brand to-usnee-accent ${celebrate > 0 ? 'animate-level-up animate-ring-pulse' : ''}`}
                >
                  <Star className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-caption uppercase text-usnee-text3">Уровень</p>
                  <p className="text-title-lg font-bold text-usnee-text">Ур. {xpSnapshot.level}</p>
                  <p className="text-caption text-usnee-text2">{levelName}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-usnee-brand" key={`xp-${xpSnapshot.totalXp}`}>
                  <Zap className="h-5 w-5 animate-xp-pop" aria-hidden="true" />
                  <span className="text-title-md font-bold tabular-nums animate-count-up" key={`num-${xpSnapshot.totalXp}`}>{xpSnapshot.totalXp}</span>
                  <span className="text-caption text-usnee-text3">XP</span>
                </div>
                <p className="mt-1 text-caption text-usnee-text2">
                  до ур. {xpSnapshot.level + 1}: {xpToNext} XP
                </p>
              </div>
            </div>
            {/* XP Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-caption text-usnee-text3 mb-1">
                <span>Прогресс уровня</span>
                <span>{Math.round(xpSnapshot.xpProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-usnee-surface2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-usnee-brand to-usnee-accent transition-all duration-500"
                  style={{ width: `${Math.round(xpSnapshot.xpProgress * 100)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(xpSnapshot.xpProgress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Прогресс уровня ${xpSnapshot.xpProgress * 100}%`}
                />
              </div>
            </div>
            {/* XP Breakdown */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-caption text-usnee-text3">Записи</p>
                <p className="text-caption font-semibold text-usnee-text">{xpSnapshot.breakdown.entriesXp}</p>
              </div>
              <div>
                <p className="text-caption text-usnee-text3">Ачивки</p>
                <p className="text-caption font-semibold text-usnee-brand">+{xpSnapshot.breakdown.achievementsXp}</p>
              </div>
              <div>
                <p className="text-caption text-usnee-text3">Трекинг</p>
                <p className="text-caption font-semibold text-usnee-text">{xpSnapshot.breakdown.moodXp + xpSnapshot.breakdown.sleepXp + xpSnapshot.breakdown.waterXp}</p>
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
