import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import {
  getEntries, getMoods, getSleep, getFood, getWater,
  addMood, addSleep, addFood, addWater
} from '../utils/db';
import { ACHIEVEMENTS } from '../constants/triggers';
import { generateId, startOfDay, startOfWeek } from '../utils/date';
import { MoodEntry, ConsumptionEntry, SleepEntry } from '../types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
  Moon, Sun, Star, Utensils, Droplets, Timer, Calendar, Award,
  TrendingUp, Check, X, Plus, Minus, Activity
} from 'lucide-react';

interface CleanDay {
  dayStart: number;
  dateStr: string;
  label: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const timers = useAppStore((s) => s.timers);
  const addTimer = useAppStore((s) => s.addTimer);
  const removeTimer = useAppStore((s) => s.removeTimer);

  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [sleepList, setSleepList] = useState<SleepEntry[]>([]);
  const [waterList, setWaterList] = useState<{ amount: number; timestamp: number }[]>([]);
  const [foodList, setFoodList] = useState<{ description?: string; timestamp: number }[]>([]);
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null);
  const [moodIntensity, setMoodIntensity] = useState(3);
  const [foodText, setFoodText] = useState('');
  const [timerHours, setTimerHours] = useState(2);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [cleanDays, setCleanDays] = useState<number[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [sleepStats, setSleepStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load all data
  useEffect(() => {
    const load = async () => {
      const [e, m, s, f, w] = await Promise.all([
        getEntries(), getMoods(), getSleep(), getFood(), getWater()
      ]);
      setEntries(e);
      setMoods(m);
      setSleepList(s);
      setFoodList(f);
      setWaterList(w);

      // Check for active sleep
      const active = s.find((x) => !x.endTime);
      if (active) setActiveSleep(active);

      // Sleep stats (last 7 days)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekSleep = s.filter((x) => (x.endTime || x.startTime) > weekAgo && x.duration);
      const avg = weekSleep.length > 0
        ? weekSleep.reduce((sum, x) => sum + (x.duration || 0), 0) / weekSleep.length / 60 / 1000
        : 0;
      setSleepStats({ avg: Math.round(avg * 10) / 10, count: weekSleep.length });

      // Check achievements
      const unlocked = new Set<string>();
      if (e.length >= 1) unlocked.add('first');
      if (e.some((x) => new Date(x.timestamp).getHours() === 3)) unlocked.add('night_owl');
      if (e.some((x) => x.alone)) unlocked.add('lone_wolf');
      const uniqueSubs = new Set(e.map((x) => x.substanceId)).size;
      if (uniqueSubs >= 5) unlocked.add('chemist');
      if (e.some((x) => (x.pulse || 0) >= 140)) unlocked.add('pulse_racer');
      if (e.some((x) => x.fentanylTestResult === 'negative')) unlocked.add('fentanyl_slayer');
      if (e.some((x) => x.missedShot)) unlocked.add('missed_shot');
      // 7-day streak
      // Simple week_bender: any 7 consecutive days with entries
      const sortedDays = Array.from(new Set(e.map((x) => startOfDay(x.timestamp)))).sort((a, b) => a - b);
      let maxStreak = 0;
      let streak = 0;
      for (let i = 0; i < sortedDays.length; i++) {
        if (i === 0 || sortedDays[i] - sortedDays[i - 1] === 24 * 60 * 60 * 1000) {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 1;
        }
      }
      if (maxStreak >= 7) unlocked.add('week_bender');
      // clean_7: check clean streak from today backwards
      const cleanStreak = calculateCleanStreak(e);
      if (cleanStreak >= 7) unlocked.add('clean_7');
      // hydrated: water after 3 entries in a row
      // simplistic: if water exists and entries >= 3
      if (w.length > 0 && e.length >= 3) unlocked.add('hydrated');
      setUnlockedAchievements(unlocked);
    };
    load();
  }, []);

  // Load clean days from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('usnee-clean-days');
    if (raw) {
      try {
        setCleanDays(JSON.parse(raw));
      } catch {}
    }
  }, []);

  // Save clean days
  useEffect(() => {
    localStorage.setItem('usnee-clean-days', JSON.stringify(cleanDays));
  }, [cleanDays]);

  // Timer countdown
  useEffect(() => {
    const activeTimer = timers.find((t) => t.active && t.id === activeTimerId);
    if (!activeTimer) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const tick = () => {
      const remaining = activeTimer.alarmAt - Date.now();
      setTimerRemaining(Math.max(0, remaining));
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timers, activeTimerId]);

  const todayWater = useMemo(() => {
    const start = startOfDay(Date.now());
    return waterList.filter((w) => w.timestamp >= start).reduce((s, w) => s + w.amount, 0);
  }, [waterList]);

  const todayFood = useMemo(() => {
    const start = startOfDay(Date.now());
    return foodList.filter((f) => f.timestamp >= start).length;
  }, [foodList]);

  const toleranceData = useMemo(() => {
    const weekly: Record<number, number[]> = {};
    entries.forEach((e) => {
      const week = startOfWeek(e.timestamp);
      if (!weekly[week]) weekly[week] = [];
      weekly[week].push(e.dose);
    });
    return Object.entries(weekly)
      .map(([week, doses]) => ({
        week: new Date(Number(week)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        avg: Math.round((doses.reduce((a, b) => a + b, 0) / doses.length) * 100) / 100
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [entries]);

  const next7Days: CleanDay[] = useMemo(() => {
    const days: CleanDay[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push({
        dayStart: d.getTime(),
        dateStr: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }),
        label: i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : ''
      });
    }
    return days;
  }, []);

  const toggleCleanDay = (dayStart: number) => {
    setCleanDays((prev) =>
      prev.includes(dayStart) ? prev.filter((d) => d !== dayStart) : [...prev, dayStart]
    );
  };

  const handleSleepStart = async () => {
    const entry: SleepEntry = {
      id: generateId(),
      startTime: Date.now()
    };
    await addSleep(entry);
    setActiveSleep(entry);
    setSleepList((prev) => [...prev, entry]);
  };

  const handleSleepEnd = async () => {
    if (!activeSleep) return;
    const end = Date.now();
    const duration = end - activeSleep.startTime;
    const updated = { ...activeSleep, endTime: end, duration };
    await addSleep(updated);
    setActiveSleep(null);
    setSleepList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleMood = async (mood: MoodEntry['mood']) => {
    const entry: MoodEntry = {
      id: generateId(),
      timestamp: Date.now(),
      mood,
      intensity: moodIntensity
    };
    await addMood(entry);
    setMoods((prev) => [...prev, entry]);
  };

  const handleFood = async () => {
    const entry = {
      id: generateId(),
      timestamp: Date.now(),
      ate: true,
      description: foodText || undefined
    };
    await addFood(entry);
    setFoodList((prev) => [...prev, entry]);
    setFoodText('');
  };

  const handleWater = async () => {
    const entry = {
      id: generateId(),
      timestamp: Date.now(),
      amount: 250,
      unit: 'мл'
    };
    await addWater(entry);
    setWaterList((prev) => [...prev, { amount: 250, timestamp: Date.now() }]);
  };

  const startTimer = () => {
    const duration = timerHours * 60 + timerMinutes;
    if (duration <= 0) return;
    const id = generateId();
    const now = Date.now();
    const timer = {
      id,
      type: 'break' as const,
      startedAt: now,
      durationMinutes: duration,
      alarmAt: now + duration * 60 * 1000,
      active: true,
      label: 'До следующего'
    };
    addTimer(timer);
    setActiveTimerId(id);
    setTimerRemaining(duration * 60 * 1000);
  };

  const stopTimer = (relapsed: boolean) => {
    if (activeTimerId) {
      removeTimer(activeTimerId);
      setActiveTimerId(null);
      setTimerRemaining(0);
      if (relapsed) {
        navigate('/add');
      }
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const moodLabels: Record<string, string> = {
    euphoric: 'Эйфория',
    good: 'Хорошо',
    neutral: 'Нейтрально',
    irritable: 'Раздражение',
    depressed: 'Депрессия',
    anxious: 'Тревога'
  };

  const moodColors: Record<string, string> = {
    euphoric: 'bg-usnee-success',
    good: 'bg-usnee-info',
    neutral: 'bg-usnee-border',
    irritable: 'bg-usnee-warning',
    depressed: 'bg-usnee-info',
    anxious: 'bg-usnee-accent'
  };

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-usnee-text">Самоконтроль</h1>

      {/* Трекер сна */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Moon className="h-4 w-4" /> Трекер сна
        </h2>
        <div className="rounded-xl bg-usnee-surface p-4">
          {activeSleep ? (
            <div className="space-y-3">
              <p className="text-sm text-usnee-text2">
                Ложился: {new Date(activeSleep.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-lg font-semibold text-usnee-text">
                Спит уже {formatDuration(Date.now() - activeSleep.startTime)}
                  </p>
              <button
                onClick={handleSleepEnd}
                className="big-tap flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-warning py-3 text-sm font-semibold text-usnee-bg transition-all active:scale-95"
              >
                <Sun className="h-4 w-4" /> Я проснулся
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleSleepStart}
                className="big-tap flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-surface2 py-3 text-sm font-semibold text-usnee-text transition-all active:scale-95"
              >
                <Moon className="h-4 w-4" /> Я ложусь спать
              </button>
              <div className="flex items-center justify-between text-xs text-usnee-text2">
                <span>За неделю: {sleepStats.count} снов</span>
                <span>Среднее: {sleepStats.avg > 0 ? `${sleepStats.avg}ч` : '—'}</span>
              </div>
              {sleepList.length > 0 && (
                <div className="space-y-1">
                  {sleepList
                    .filter((s) => s.duration)
                    .slice(-3)
                    .reverse()
                    .map((s) => (
                      <div key={s.id} className="flex justify-between text-xs text-usnee-text2">
                        <span>{new Date(s.startTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        <span>{Math.round((s.duration || 0) / 60 / 60 / 1000 * 10) / 10}ч</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Дневник настроения */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Activity className="h-4 w-4" /> Дневник настроения
        </h2>
        <div className="rounded-xl bg-usnee-surface p-4 space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setMoodIntensity(i)}
                className={`big-tap p-1 transition-all active:scale-95 ${i <= moodIntensity ? 'text-usnee-warning' : 'text-usnee-border'}`}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(moodLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleMood(key as MoodEntry['mood'])}
                className={`big-tap rounded-lg py-2 text-xs font-medium text-usnee-text transition-all active:scale-95 ${moodColors[key]}`}
              >
                {label}
              </button>
            ))}
          </div>
          {moods.length > 0 && (
            <div className="space-y-1 pt-2">
              {moods.slice(-3).reverse().map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs text-usnee-text2">
                  <span>{moodLabels[m.mood]}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: m.intensity }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-usnee-warning text-usnee-warning" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Питание и вода */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Utensils className="h-4 w-4" /> Питание и вода
        </h2>
        <div className="rounded-xl bg-usnee-surface p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                placeholder="Что поел?"
                className="big-tap flex-1 rounded-lg bg-usnee-surface2 px-3 py-2 text-sm text-usnee-text outline-none placeholder:text-usnee-text2"
              />
              <button
                onClick={handleFood}
                className="big-tap flex items-center gap-1 rounded-lg bg-usnee-success px-4 py-2 text-sm font-medium text-white transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" /> Я поел
              </button>
            </div>
            {foodList.length > 0 && (
              <p className="text-xs text-usnee-text2">Сегодня: {todayFood} приёмов</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-usnee-surface2 p-3">
            <div>
              <p className="text-sm font-medium text-usnee-text">Вода</p>
              <p className="text-xs text-usnee-text2">Сегодня: {todayWater} мл</p>
            </div>
            <button
              onClick={handleWater}
              className="big-tap flex items-center gap-1 rounded-lg bg-usnee-info px-4 py-2 text-sm font-medium text-white transition-all active:scale-95"
            >
              <Droplets className="h-4 w-4" /> +250 мл
            </button>
          </div>
        </div>
      </section>

      {/* Таймер до следующего */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Timer className="h-4 w-4" /> Таймер до следующего
        </h2>
        <div className="rounded-xl bg-usnee-surface p-4 space-y-4">
          {activeTimerId && timerRemaining > 0 ? (
            <div className="space-y-3 text-center">
              <p className="text-3xl font-mono font-bold text-usnee-text">
                {formatDuration(timerRemaining)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => stopTimer(false)}
                  className="big-tap flex-1 rounded-xl bg-usnee-success py-3 text-sm font-semibold text-white transition-all active:scale-95"
                >
                  <Check className="mx-auto mb-1 h-4 w-4" /> Я сдержался
                </button>
                <button
                  onClick={() => stopTimer(true)}
                  className="big-tap flex-1 rounded-xl bg-usnee-accent py-3 text-sm font-semibold text-white transition-all active:scale-95"
                >
                  <X className="mx-auto mb-1 h-4 w-4" /> Сорвался
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="text-xs text-usnee-text2">Часы</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTimerHours(Math.max(0, timerHours - 1))} className="big-tap rounded-lg bg-usnee-surface2 p-2 text-usnee-text"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-lg font-semibold text-usnee-text">{timerHours}</span>
                    <button onClick={() => setTimerHours(timerHours + 1)} className="big-tap rounded-lg bg-usnee-surface2 p-2 text-usnee-text"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-usnee-text2">Минуты</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTimerMinutes(Math.max(0, timerMinutes - 15))} className="big-tap rounded-lg bg-usnee-surface2 p-2 text-usnee-text"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-lg font-semibold text-usnee-text">{timerMinutes}</span>
                    <button onClick={() => setTimerMinutes(Math.min(59, timerMinutes + 15))} className="big-tap rounded-lg bg-usnee-surface2 p-2 text-usnee-text"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
              <button
                onClick={startTimer}
                className="big-tap w-full rounded-xl bg-usnee-surface2 py-3 text-sm font-semibold text-usnee-text transition-all active:scale-95"
              >
                Запустить таймер
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Планирование дней без */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Calendar className="h-4 w-4" /> Планирование дней без
        </h2>
        <div className="rounded-xl bg-usnee-surface p-4">
          <div className="grid grid-cols-7 gap-1">
            {next7Days.map((day) => {
              const isClean = cleanDays.includes(day.dayStart);
              return (
                <button
                  key={day.dayStart}
                  onClick={() => toggleCleanDay(day.dayStart)}
                  className={`big-tap flex flex-col items-center gap-1 rounded-lg py-2 transition-all active:scale-95 ${
                    isClean ? 'bg-usnee-success text-usnee-bg' : 'bg-usnee-surface2 text-usnee-text'
                  }`}
                >
                  <span className="text-[10px] opacity-70">{day.dateStr.split(' ')[0]}</span>
                  <span className="text-sm font-semibold">{day.dateStr.split(' ')[1]}</span>
                  {isClean && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-usnee-text2">
            Нажми на день, чтобы отметить его «чистым». Толерантность упадёт, но осторожнее — твоя толерантность к трезвости тоже может быть низкой.
          </p>
        </div>
      </section>

      {/* Ачивки */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Award className="h-4 w-4" /> Ачивки
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedAchievements.has(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-xl p-3 transition-all ${
                  unlocked ? 'bg-usnee-surface2' : 'bg-usnee-surface opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className={`h-5 w-5 ${unlocked ? 'text-usnee-accent' : 'text-usnee-text2'}`} />
                  <p className={`text-sm font-semibold ${unlocked ? 'text-usnee-text' : 'text-usnee-text2'}`}>
                    {ach.name}
                  </p>
                </div>
                <p className="mt-1 text-xs text-usnee-text2">{ach.description}</p>
                {unlocked && (
                  <p className="mt-2 text-[10px] font-medium uppercase text-usnee-success">Разблокировано</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Толерантность */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <TrendingUp className="h-4 w-4" /> Толерантность
        </h2>
        <div className="rounded-xl bg-usnee-surface p-4">
          {toleranceData.length > 1 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={toleranceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="week" stroke="#a0a0a0" fontSize={10} />
                  <YAxis stroke="#a0a0a0" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: '#1e1e1e',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#e63946"
                    strokeWidth={2}
                    dot={{ fill: '#e63946', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-usnee-text2">
              Недостаточно данных для графика. Продолжай записывать — или не продолжай, твой выбор.
            </p>
          )}
          {toleranceData.length >= 2 && toleranceData[toleranceData.length - 1].avg > toleranceData[toleranceData.length - 2].avg && (
            <p className="mt-2 text-xs text-usnee-warning">
              Толерантность растёт. Это нормально, но дорого.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function calculateCleanStreak(entries: ConsumptionEntry[]): number {
  if (entries.length === 0) return 0;
  const today = startOfDay(Date.now());
  const days = new Set(entries.map((e) => startOfDay(e.timestamp)));
  let streak = 0;
  let check = today;
  while (!days.has(check)) {
    streak++;
    check -= 24 * 60 * 60 * 1000;
  }
  return streak;
}
export { Profile };
