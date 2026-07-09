import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Repeat,
  Timer,
  FlaskConical,
  Moon,
  ShieldAlert,
  Award,
  ChevronRight,
  ArrowRight,
  Zap,
  TrendingUp,
  Clock,
  Pill,
  Activity
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { ConsumptionEntry, Batch, SleepEntry, NorsSession } from '../types';
import { addEntry, getEntries, getActiveBatch, getSleep, getNorsSessions } from '../utils/db';
import { formatTime, timeSince, generateId } from '../utils/date';
import { SUBSTANCES } from '../constants/substances';
import { ACHIEVEMENTS } from '../constants/triggers';

const GREETINGS: Record<number, string[]> = {
  0: ['Ещё не спишь?', 'Ночь — время химии', 'Тёмные времена', 'Совы мудрее'], // 00-05
  1: ['Утро вечера мудренее', 'Доброе утро, химик', 'Солнце встало — и ты тоже'], // 05-12
  2: ['Добрый день, гонщик', 'Полдень — время данных', 'Живём живём'], // 12-17
  3: ['Добрый вечер, исследователь', 'Сумерки начинаются', 'Вечерняя смена'], // 17-21
  4: ['Доброй ночи, химик', 'Тьма близко', 'Ночное дежурство'] // 21-24
};

function getGreeting(): string {
  const h = new Date().getHours();
  let slot = 0;
  if (h >= 5 && h < 12) slot = 1;
  else if (h >= 12 && h < 17) slot = 2;
  else if (h >= 17 && h < 21) slot = 3;
  else if (h >= 21) slot = 4;
  const list = GREETINGS[slot];
  return list[Math.floor(Math.random() * list.length)];
}

function getSubstanceName(id?: string): string {
  if (!id) return 'Неизвестно';
  const s = SUBSTANCES.find((x) => x.id === id);
  return s ? s.name : 'Свой вариант';
}

function getSubstanceColor(id?: string): string {
  if (!id) return '#a0a0a0';
  const s = SUBSTANCES.find((x) => x.id === id);
  return s ? s.color : '#a0a0a0';
}

export default function Home() {
  const navigate = useNavigate();
  const lastEntry = useAppStore((s) => s.lastEntry);
  const todayCount = useAppStore((s) => s.todayCount);
  const refreshEntries = useAppStore((s) => s.refreshEntries);
  const timers = useAppStore((s) => s.timers);

  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null);
  const [activeNors, setActiveNors] = useState<NorsSession | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    refreshEntries();
    getEntries().then((all) => setEntries(all.slice(-10).reverse()));
    getActiveBatch().then((b) => setActiveBatch(b || null));
    getSleep().then((s) => {
      const active = s.find((x) => !x.endTime);
      setActiveSleep(active || null);
    });
    getNorsSessions().then((n) => {
      const active = n.find((x) => x.status === 'active');
      setActiveNors(active || null);
    });
  }, [refreshEntries]);

  const activeTimers = useMemo(
    () => timers.filter((t) => t.active && t.alarmAt > Date.now()),
    [timers, nowTick]
  );

  const recent = entries.slice(0, 5);

  const handleAdd = () => navigate('/add');

  const handleRepeatLast = async () => {
    if (!lastEntry) return;
    const clone: ConsumptionEntry = {
      ...lastEntry,
      id: generateId(),
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await addEntry(clone);
    await refreshEntries();
    const all = await getEntries();
    setEntries(all.slice(-10).reverse());
  };

  const handleSafety = () => navigate('/safety');
  const handlePartials = () => navigate('/partials');
  const handleHistory = () => navigate('/history');

  const lastTimeText = lastEntry ? timeSince(lastEntry.timestamp) : '—';
  const lastSubstance = lastEntry
    ? (lastEntry.substanceName || getSubstanceName(lastEntry.substanceId))
    : '—';
  const lastSubstanceColor = lastEntry ? getSubstanceColor(lastEntry.substanceId) : '#a0a0a0';

  const dailyAchievement = ACHIEVEMENTS[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Приветствие */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-usnee-text">{greeting}</h1>
          <p className="text-sm text-usnee-text2">Данные — лучший трип-ситтер</p>
        </div>
        <button
          onClick={() => setGreeting(getGreeting())}
          className="rounded-full bg-usnee-surface p-2 text-usnee-text2 transition-colors active:scale-95 hover:bg-usnee-surface2"
          title="Обновить"
        >
          <Zap className="h-4 w-4" />
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-usnee-surface p-3">
          <TrendingUp className="h-5 w-5 text-usnee-accent" />
          <span className="text-xl font-bold text-usnee-text">{todayCount}</span>
          <span className="text-[10px] text-usnee-text2">Сегодня</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-usnee-surface p-3">
          <Clock className="h-5 w-5 text-usnee-info" />
          <span className="text-sm font-bold text-usnee-text">{lastTimeText}</span>
          <span className="text-[10px] text-usnee-text2">Назад</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-usnee-surface p-3">
          <Pill className="h-5 w-5" style={{ color: lastSubstanceColor }} />
          <span className="text-sm font-bold text-usnee-text truncate w-full text-center">{lastSubstance}</span>
          <span className="text-[10px] text-usnee-text2">Последнее</span>
        </div>
      </div>

      {/* Большая кнопка + Записать */}
      <button
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-accent py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
        Записать
      </button>

      {/* Повторить последнюю */}
      {lastEntry && (
        <button
          onClick={handleRepeatLast}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-surface2 py-3 text-sm font-medium text-usnee-text transition-transform active:scale-95"
        >
          <Repeat className="h-4 w-4 text-usnee-accent2" />
          Повторить {lastSubstance} ({formatTime(lastEntry.timestamp)})
        </button>
      )}

      {/* Активные карточки */}
      <div className="flex flex-col gap-3">
        {/* Активные таймеры */}
        {activeTimers.length > 0 && (
          <div className="rounded-xl bg-usnee-surface p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-usnee-text">
              <Timer className="h-4 w-4 text-usnee-warning" />
              Таймеры
            </div>
            <div className="flex flex-col gap-2">
              {activeTimers.map((t) => {
                const remaining = Math.max(0, Math.ceil((t.alarmAt - Date.now()) / 60000));
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-usnee-surface2 px-3 py-2">
                    <span className="text-sm text-usnee-text">{t.label}</span>
                    <span className="text-sm font-bold text-usnee-warning">{remaining} мин</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Партия */}
        {activeBatch && (
          <div className="flex items-center justify-between rounded-xl bg-usnee-surface p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-usnee-accent/10 p-2">
                <FlaskConical className="h-5 w-5 text-usnee-accent" />
              </div>
              <div>
                <div className="text-sm font-semibold text-usnee-text">Активная партия</div>
                <div className="text-xs text-usnee-text2">{activeBatch.name} · {activeBatch.remaining.toFixed(2)} {activeBatch.weightUnit}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-usnee-text2" />
          </div>
        )}

        {/* Таймер сна */}
        {activeSleep && (
          <div className="flex items-center justify-between rounded-xl bg-usnee-surface p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-usnee-info/10 p-2">
                <Moon className="h-5 w-5 text-usnee-info" />
              </div>
              <div>
                <div className="text-sm font-semibold text-usnee-text">Сон записан</div>
                <div className="text-xs text-usnee-text2">{timeSince(activeSleep.startTime)}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-usnee-text2" />
          </div>
        )}

        {/* NORS */}
        {activeNors && (
          <div className="flex items-center justify-between rounded-xl bg-usnee-surface p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-usnee-success/10 p-2">
                <ShieldAlert className="h-5 w-5 text-usnee-success" />
              </div>
              <div>
                <div className="text-sm font-semibold text-usnee-text">NORS активен</div>
                <div className="text-xs text-usnee-text2">Чек-ин каждые {activeNors.checkInInterval} мин</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-usnee-text2" />
          </div>
        )}
      </div>

      {/* Ачивка дня */}
      <div className="rounded-xl bg-usnee-surface p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-usnee-text">
          <Award className="h-4 w-4 text-usnee-warning" />
          Ачивка дня
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-usnee-warning/10 p-2">
            <Award className="h-5 w-5 text-usnee-warning" />
          </div>
          <div>
            <div className="text-sm font-semibold text-usnee-text">{dailyAchievement.name}</div>
            <div className="text-xs text-usnee-text2">{dailyAchievement.description}</div>
          </div>
        </div>
      </div>

      {/* Последние записи */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-usnee-text">Последние записи</h2>
          <button onClick={handleHistory} className="flex items-center gap-1 text-sm text-usnee-accent transition-colors active:scale-95">
            Все <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl bg-usnee-surface p-6 text-center text-sm text-usnee-text2">
            Пока ничего. Начни с кнопки выше — или не начинай, твой выбор.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((e) => {
              const subColor = getSubstanceColor(e.substanceId);
              return (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-usnee-surface px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subColor }} />
                    <div>
                      <div className="text-sm font-semibold text-usnee-text">{e.substanceName || getSubstanceName(e.substanceId)}</div>
                      <div className="text-xs text-usnee-text2">
                        {e.methodName || e.methodId} · {formatTime(e.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-usnee-text2">{timeSince(e.timestamp)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Быстрые ссылки */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleSafety}
          className="flex items-center justify-between rounded-xl bg-usnee-surface p-4 text-left transition-transform active:scale-95"
        >
          <div>
            <div className="text-sm font-semibold text-usnee-text">Безопасность</div>
            <div className="text-xs text-usnee-text2">NORS, таймеры, инфо</div>
          </div>
          <ShieldAlert className="h-5 w-5 text-usnee-success" />
        </button>
        <button
          onClick={handlePartials}
          className="flex items-center justify-between rounded-xl bg-usnee-surface p-4 text-left transition-transform active:scale-95"
        >
          <div>
            <div className="text-sm font-semibold text-usnee-text">Частичные дозы</div>
            <div className="text-xs text-usnee-text2">Микродозинг, бусты</div>
          </div>
          <Activity className="h-5 w-5 text-usnee-accent2" />
        </button>
      </div>

      {/* Нижний отступ для скролла */}
      <div className="h-4" />
    </div>
  );
}
