import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Phone, Heart, Wind, ChevronDown, ChevronUp, Play, Square, CheckCircle, Siren, Shield, UserPlus, Timer, Volume2 } from 'lucide-react';
import { NorsSession, TimerState, Substance } from '../types';
import { SUBSTANCES } from '../constants/substances';
import { addNors } from '../utils/db';
import { useAppStore } from '../stores/appStore';

const NORS_INTERVALS = [5, 10, 15, 30];

const OVERDOSE_SIGNS = [
  'Сонливость / невозможность разбудить',
  'Замедленное или остановившееся дыхание',
  'Синие губы или ногти',
  'Холодная и/или бледная кожа',
  'Рвота или позывы',
  'Сильно суженные зрачки ("пинпоинт")',
];

const NALOXONE_STEPS = [
  'Проверь сознание и дыхание. Если не дышит — начни СЛР.',
  'Положи на бок (recovery position), чтобы не подавиться рвотой.',
  'Распрыскай naloxone в нос (1-2 дозы).',
  'Повторяй каждые 2-3 минуты, если нет реакции.',
  'Вызови 103 и НЕ ОСТАВЛЯЙ одного.',
];

const HELP_FRIEND_STEPS = [
  'Проверь дыхание: вдохи редкие? Храп? Остановка?',
  'Положи на бок, слегка запрокинув голову.',
  'Если есть naloxone — используй немедленно.',
  'Набери 103. Скажи: "передозировка, нужна скорая".',
  'Не убирайся, не прячь вещи. Жизнь важнее.',
  'Не оставляй одного до приезда скорой.',
];

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function playBeep() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore
  }
}

function vibrateDevice(pattern: number | number[] = [300, 200, 300]) {
  try {
    if ((navigator as any).vibrate) {
      (navigator as any).vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

export default function Safety() {
  const { addTimer, removeTimer } = useAppStore();

  // --- NORS state ---
  const [norsInterval, setNorsInterval] = useState<number>(10);
  const [norsSession, setNorsSession] = useState<NorsSession | null>(null);
  const [norsCountdown, setNorsCountdown] = useState<number>(0);
  const [norsPromptOpen, setNorsPromptOpen] = useState(false);
  const [norsEmergencyOpen, setNorsEmergencyOpen] = useState(false);
  const norsPromptStartRef = useRef<number>(0);
  const norsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const norsWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Overdose checklist ---
  const [checkedSigns, setCheckedSigns] = useState<Record<number, boolean>>({});
  const checkedCount = Object.values(checkedSigns).filter(Boolean).length;
  const showOverdoseBanner = checkedCount >= 3;

  // --- Substance timer ---
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [subTimerActive, setSubTimerActive] = useState(false);
  const [subElapsed, setSubElapsed] = useState(0);
  const subTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Breathing ---
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const breathTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathPhaseRef = useRef<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');

  // --- Collapsible sections ---
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    samaritan: false,
    helpFriend: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- NORS logic ---
  const startNors = useCallback(async () => {
    const now = Date.now();
    const id = `nors-${now}`;
    const session: NorsSession = {
      id,
      startedAt: now,
      checkInInterval: norsInterval,
      lastCheckIn: now,
      status: 'active',
    };
    await addNors(session);
    setNorsSession(session);
    setNorsCountdown(norsInterval * 60 * 1000);
    setNorsPromptOpen(false);
    setNorsEmergencyOpen(false);

    const timer: TimerState = {
      id,
      type: 'nors',
      startedAt: now,
      durationMinutes: norsInterval,
      alarmAt: now + norsInterval * 60 * 1000,
      active: true,
      label: 'NORS',
    };
    addTimer(timer);
  }, [norsInterval, addTimer]);

  const stopNors = useCallback(() => {
    if (norsTimerRef.current) clearInterval(norsTimerRef.current);
    if (norsWatchRef.current) clearInterval(norsWatchRef.current);
    norsTimerRef.current = null;
    norsWatchRef.current = null;
    if (norsSession) {
      removeTimer(norsSession.id);
    }
    setNorsSession(null);
    setNorsCountdown(0);
    setNorsPromptOpen(false);
    setNorsEmergencyOpen(false);
  }, [norsSession, removeTimer]);

  const checkInNors = useCallback(() => {
    if (!norsSession) return;
    const now = Date.now();
    const updated: NorsSession = { ...norsSession, lastCheckIn: now, status: 'checked' };
    setNorsSession(updated);
    addNors(updated);
    setNorsPromptOpen(false);
    setNorsEmergencyOpen(false);
    setNorsCountdown(norsSession.checkInInterval * 60 * 1000);
  }, [norsSession]);

  // NORS countdown + watch for prompt
  useEffect(() => {
    if (!norsSession || norsSession.status === 'ended') return;

    const tick = () => {
      const now = Date.now();
      const nextCheck = norsSession.lastCheckIn + norsSession.checkInInterval * 60 * 1000;
      const remaining = nextCheck - now;
      setNorsCountdown(Math.max(0, remaining));

      if (remaining <= 0 && !norsPromptOpen && !norsEmergencyOpen) {
        setNorsPromptOpen(true);
        norsPromptStartRef.current = now;
        playBeep();
        vibrateDevice([500, 300, 500, 300, 500]);
      }
    };

    tick();
    norsTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (norsTimerRef.current) clearInterval(norsTimerRef.current);
    };
  }, [norsSession, norsPromptOpen, norsEmergencyOpen]);

  // NORS emergency watch (2 min after prompt)
  useEffect(() => {
    if (!norsPromptOpen || norsEmergencyOpen) return;
    const check = () => {
      const elapsed = Date.now() - norsPromptStartRef.current;
      if (elapsed > 120000) {
        setNorsEmergencyOpen(true);
        setNorsPromptOpen(false);
        playBeep();
        vibrateDevice([1000, 500, 1000, 500, 1000]);
      }
    };
    norsWatchRef.current = setInterval(check, 1000);
    return () => {
      if (norsWatchRef.current) clearInterval(norsWatchRef.current);
    };
  }, [norsPromptOpen, norsEmergencyOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (norsTimerRef.current) clearInterval(norsTimerRef.current);
      if (norsWatchRef.current) clearInterval(norsWatchRef.current);
      if (subTimerRef.current) clearInterval(subTimerRef.current);
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, []);

  // --- Substance timer ---
  const startSubTimer = useCallback(() => {
    if (!selectedSubstance) return;
    const now = Date.now();
    setSubTimerActive(true);
    setSubElapsed(0);

    const id = `sub-${now}`;
    const timer: TimerState = {
      id,
      type: 'effect',
      substanceId: selectedSubstance.id,
      startedAt: now,
      durationMinutes: Math.round((selectedSubstance.durationHours || 1) * 60),
      alarmAt: now + Math.round((selectedSubstance.durationHours || 1) * 60) * 60 * 1000,
      active: true,
      label: selectedSubstance.name,
    };
    addTimer(timer);

    if (subTimerRef.current) clearInterval(subTimerRef.current);
    subTimerRef.current = setInterval(() => {
      setSubElapsed(Date.now() - now);
    }, 1000);
  }, [selectedSubstance, addTimer]);

  const stopSubTimer = useCallback(() => {
    if (subTimerRef.current) clearInterval(subTimerRef.current);
    setSubTimerActive(false);
    setSubElapsed(0);
  }, []);

  // --- Breathing ---
  const startBreathing = useCallback(() => {
    setBreathingActive(true);
    setBreathPhase('inhale');
    breathPhaseRef.current = 'inhale';

    const phases: Array<'inhale' | 'hold1' | 'exhale' | 'hold2'> = ['inhale', 'hold1', 'exhale', 'hold2'];
    let idx = 0;

    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    breathTimerRef.current = setInterval(() => {
      idx = (idx + 1) % 4;
      const next = phases[idx];
      breathPhaseRef.current = next;
      setBreathPhase(next);
    }, 4000);
  }, []);

  const stopBreathing = useCallback(() => {
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    setBreathingActive(false);
    setBreathPhase('inhale');
  }, []);

  const breathScale =
    breathPhase === 'inhale'
      ? 1.15
      : breathPhase === 'hold1'
      ? 1.15
      : breathPhase === 'exhale'
      ? 0.85
      : 0.85;

  const breathText =
    breathPhase === 'inhale'
      ? 'Вдох...'
      : breathPhase === 'hold1'
      ? 'Задержка...'
      : breathPhase === 'exhale'
      ? 'Выдох...'
      : 'Задержка...';

  // Substance timer progress
  const subProgress = selectedSubstance && selectedSubstance.durationHours
    ? Math.min(100, (subElapsed / (selectedSubstance.durationHours * 60 * 60 * 1000)) * 100)
    : 0;
  const subPeakMs = selectedSubstance && selectedSubstance.peakHours
    ? selectedSubstance.peakHours * 60 * 60 * 1000
    : 0;
  const isOpioid = selectedSubstance?.category === 'opioids';

  return (
    <div className="min-h-screen bg-usnee-bg text-usnee-text pb-24">
      {/* Header */}
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Shield className="w-6 h-6 text-usnee-accent" />
          Безопасность
        </h1>
        <p className="text-usnee-text-secondary text-sm">Этот раздел буквально спасает жизни. Не игнорь.</p>
      </div>

      <div className="px-4 space-y-4">
        {/* 1. NORS */}
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <Siren className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-lg text-red-100">NORS / Never Use Alone</h2>
              <p className="text-red-200/80 text-sm mt-1">
                69% фатальных передозировок — в одиночку. Не будь статистикой.
              </p>
            </div>
          </div>

          {!norsSession ? (
            <>
              <div className="flex gap-2 mb-3 flex-wrap">
                {NORS_INTERVALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setNorsInterval(m)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[48px] transition-all active:scale-95 ${
                      norsInterval === m
                        ? 'bg-red-500 text-white'
                        : 'bg-usnee-surface text-usnee-text border border-usnee-border'
                    }`}
                  >
                    {m} мин
                  </button>
                ))}
              </div>
              <button
                onClick={startNors}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl min-h-[56px] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-5 h-5" />
                Запустить NORS-таймер
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-usnee-surface/60 rounded-lg p-4 text-center">
                <div className="text-xs text-usnee-text-secondary uppercase tracking-wider mb-1">
                  До следующей проверки
                </div>
                <div className="text-4xl font-mono font-bold text-red-300">
                  {formatTime(norsCountdown)}
                </div>
                <div className="text-xs text-red-200/60 mt-1">
                  Интервал: {norsSession.checkInInterval} мин
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={checkInNors}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <CheckCircle className="w-5 h-5" />
                  Я в порядке
                </button>
                <button
                  onClick={stopNors}
                  className="px-4 bg-usnee-surface text-usnee-text border border-usnee-border font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center transition-all active:scale-95"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Overdose signs */}
        <div className="bg-usnee-surface border border-usnee-border rounded-xl p-4">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-usnee-danger" />
            Признаки передозировки
          </h2>

          <div className="space-y-2 mb-3">
            {OVERDOSE_SIGNS.map((sign, i) => (
              <label
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg bg-usnee-bg/50 cursor-pointer hover:bg-usnee-bg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!checkedSigns[i]}
                  onChange={(e) => {
                    setCheckedSigns((prev) => ({ ...prev, [i]: e.target.checked }));
                  }}
                  className="w-5 h-5 accent-red-500 shrink-0"
                />
                <span className="text-sm">{sign}</span>
              </label>
            ))}
          </div>

          {showOverdoseBanner && (
            <div className="bg-red-600 text-white rounded-lg p-4 mb-3 animate-pulse">
              <div className="font-bold text-lg mb-2">Это передозировка.</div>
              <div className="text-sm mb-3">
                Набирай 103. Положи на бок. Не оставляй одного. Нет времени на стыд — есть время на действия.
              </div>
              <a
                href="tel:103"
                onClick={(e) => {
                  if (!confirm('Вызвать скорую помощь 103?')) {
                    e.preventDefault();
                  }
                }}
                className="block w-full bg-white text-red-600 font-bold py-3 rounded-xl min-h-[56px] flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
              >
                <Phone className="w-5 h-5" />
                Позвонить 103
              </a>
            </div>
          )}

          {!showOverdoseBanner && (
            <a
              href="tel:103"
              onClick={(e) => {
                if (!confirm('Вызвать скорую помощь 103?')) {
                  e.preventDefault();
                }
              }}
              className="block w-full bg-red-600/20 text-red-300 border border-red-500/30 font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
            >
              <Phone className="w-5 h-5" />
              Позвонить 103
            </a>
          )}
        </div>

        {/* 3. Naloxone */}
        <div className="bg-usnee-surface border border-usnee-border rounded-xl p-4">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Heart className="w-5 h-5 text-usnee-accent" />
            Naloxone (Налоксон)
          </h2>
          <p className="text-sm text-usnee-text-secondary mb-3">
            Лекарство, которое реверсирует опиоидную передозировку. Доступно бесплатно в harm reduction программах. Не панацея, но шанс.
          </p>

          <div className="space-y-2 mb-3">
            {NALOXONE_STEPS.map((step, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="font-bold text-usnee-accent shrink-0">{i + 1}.</span>
                <span className="text-usnee-text-secondary">{step}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => alert('Поиск по геолокации в разработке')}
            className="w-full bg-usnee-surface border border-usnee-border text-usnee-text font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Найти пункты выдачи naloxone
          </button>
        </div>

        {/* 4. Substance timer */}
        <div className="bg-usnee-surface border border-usnee-border rounded-xl p-4">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Timer className="w-5 h-5 text-usnee-accent" />
            Таймер действия вещества
          </h2>

          <div className="mb-3">
            <select
              value={selectedSubstance?.id || ''}
              onChange={(e) => {
                const sub = SUBSTANCES.find((s) => s.id === e.target.value) || null;
                setSelectedSubstance(sub);
                stopSubTimer();
              }}
              className="w-full bg-usnee-bg border border-usnee-border rounded-lg p-3 text-usnee-text min-h-[48px]"
            >
              <option value="">Выбери ПАВ</option>
              {SUBSTANCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSubstance && (
            <div className="bg-usnee-bg/50 rounded-lg p-3 mb-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-usnee-text-secondary">Пик:</span>
                <span>{selectedSubstance.peakHours || '?'} ч</span>
              </div>
              <div className="flex justify-between">
                <span className="text-usnee-text-secondary">Общая длительность:</span>
                <span>{selectedSubstance.durationHours || '?'} ч</span>
              </div>
              {isOpioid && (
                <div className="flex justify-between">
                  <span className="text-usnee-text-secondary">Ломка (привычка):</span>
                  <span>через ~{selectedSubstance.halfLifeHours || '?'} ч</span>
                </div>
              )}
            </div>
          )}

          {subTimerActive && selectedSubstance && (
            <div className="mb-3">
              <div className="text-xs text-usnee-text-secondary uppercase tracking-wider mb-1">
                Прошло с употребления
              </div>
              <div className="text-2xl font-mono font-bold mb-2">{formatTime(subElapsed)}</div>
              <div className="w-full h-3 bg-usnee-bg rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${subProgress}%`,
                    backgroundColor: selectedSubstance.color || '#666',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-usnee-text-secondary">Старт</span>
                <span className="text-usnee-text-secondary">{selectedSubstance.durationHours || 1} ч</span>
              </div>
              {subElapsed < subPeakMs && (
                <div className="mt-1 text-xs text-usnee-accent">→ Пиковый эффект</div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={startSubTimer}
              disabled={!selectedSubstance || subTimerActive}
              className="flex-1 bg-usnee-accent text-usnee-bg font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            >
              <Play className="w-5 h-5" />
              Старт
            </button>
            <button
              onClick={stopSubTimer}
              disabled={!subTimerActive}
              className="flex-1 bg-usnee-surface border border-usnee-border text-usnee-text font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            >
              <Square className="w-5 h-5" />
              Стоп
            </button>
          </div>

          {selectedSubstance?.category === 'opioids' && (
            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/20 rounded-lg text-xs text-yellow-200">
              После 3+ дней без употребления толерантность падает. Не начинай с прежней дозы — это классический сценарий передозировки.
            </div>
          )}
        </div>

        {/* 5. Breathing */}
        <div className="bg-usnee-surface border border-usnee-border rounded-xl p-4">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Wind className="w-5 h-5 text-usnee-accent" />
            Дыхательное упражнение
          </h2>
          <p className="text-sm text-usnee-text-secondary mb-4">
            Паранойя после стимов — нормально. Дыши. Это пройдёт.
          </p>

          <div className="flex flex-col items-center mb-4">
            <div
              className="w-32 h-32 rounded-full border-2 border-usnee-accent flex items-center justify-center transition-transform"
              style={{
                transform: `scale(${breathScale})`,
                transitionDuration: breathingActive ? '4000ms' : '600ms',
                transitionTimingFunction: 'ease-in-out',
                boxShadow: breathingActive
                  ? '0 0 20px rgba(100, 200, 200, 0.3)'
                  : 'none',
              }}
            >
              <span className="text-sm font-medium text-usnee-accent">
                {breathingActive ? breathText : 'Готов?'}
              </span>
            </div>
          </div>

          <button
            onClick={breathingActive ? stopBreathing : startBreathing}
            className={`w-full font-bold py-3 rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
              breathingActive
                ? 'bg-usnee-surface border border-usnee-border text-usnee-text'
                : 'bg-usnee-accent text-usnee-bg'
            }`}
          >
            {breathingActive ? (
              <>
                <Square className="w-5 h-5" />
                Стоп
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Начать
              </>
            )}
          </button>
        </div>

        {/* 6. Good Samaritan Laws */}
        <div className="bg-usnee-surface border border-usnee-border rounded-xl p-4">
          <button
            onClick={() => toggleSection('samaritan')}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-usnee-accent" />
              Good Samaritan Laws
            </h2>
            {openSections.samaritan ? (
              <ChevronUp className="w-5 h-5 text-usnee-text-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-usnee-text-secondary" />
            )}
          </button>
          {openSections.samaritan && (
            <p className="text-sm text-usnee-text-secondary mt-3">
              В большинстве стран закон защищает того, кто вызывает скорую при передозировке. Не бойся звонить. Полиция редко приезжает на передозировки, а если приезжает — Good Samaritan Laws (или аналоги) защищают от преследования за вызов помощи. Жизнь дороже бумажки.
            </p>
          )}
        </div>

        {/* 7. How to help a friend */}
        <div className="bg-usnee-surface border border-usnee-border rounded-xl p-4">
          <button
            onClick={() => toggleSection('helpFriend')}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="font-bold text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-usnee-accent" />
              Как помочь другу
            </h2>
            {openSections.helpFriend ? (
              <ChevronUp className="w-5 h-5 text-usnee-text-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-usnee-text-secondary" />
            )}
          </button>
          {openSections.helpFriend && (
            <div className="mt-3 space-y-2">
              {HELP_FRIEND_STEPS.map((step, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-bold text-usnee-accent shrink-0">{i + 1}.</span>
                  <span className="text-usnee-text-secondary">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NORS Prompt Modal */}
      {norsPromptOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-usnee-surface border border-usnee-border rounded-xl p-6 max-w-sm w-full text-center">
            <Volume2 className="w-10 h-10 text-usnee-accent mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Ты в порядке?</h3>
            <p className="text-sm text-usnee-text-secondary mb-4">
              NORS-таймер. Если не ответишь — активируем экстренный протокол.
            </p>
            <button
              onClick={checkInNors}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl min-h-[56px] flex items-center justify-center gap-2 transition-all active:scale-95 mb-2"
            >
              <CheckCircle className="w-5 h-5" />
              Да, я ОК
            </button>
            <p className="text-xs text-usnee-text-secondary mt-2">
              Осталось: {formatTime(120000 - (Date.now() - norsPromptStartRef.current))}
            </p>
          </div>
        </div>
      )}

      {/* NORS Emergency Modal */}
      {norsEmergencyOpen && (
        <div className="fixed inset-0 z-50 bg-red-950/95 flex items-center justify-center p-4">
          <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-6 max-w-sm w-full text-center">
            <Siren className="w-12 h-12 text-red-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-bold text-red-100 mb-2">ЭКСТРЕННАЯ СИТУАЦИЯ</h3>
            <p className="text-red-200/90 mb-4">
              Пользователь не ответил на NORS-проверку. Возможна передозировка или потеря сознания.
            </p>

            <div className="bg-red-800/50 rounded-lg p-3 mb-4 text-sm text-left">
              <div className="text-red-200 font-bold mb-1">Что делать:</div>
              <div className="text-red-200/80">1. Немедленно проверь состояние человека.</div>
              <div className="text-red-200/80">2. Если нет реакции — вызови 103.</div>
              <div className="text-red-200/80">3. Положи на бок, не оставляй одного.</div>
              <div className="text-red-200/80">4. Если есть naloxone — используй.</div>
            </div>

            <a
              href="tel:103"
              className="block w-full bg-white text-red-700 font-bold py-4 rounded-xl min-h-[56px] flex items-center justify-center gap-2 transition-all active:scale-95 mb-3"
            >
              <Phone className="w-5 h-5" />
              Позвонить 103
            </a>
            <button
              onClick={() => {
                setNorsEmergencyOpen(false);
                stopNors();
              }}
              className="w-full bg-red-800/50 text-red-200 font-bold py-3 rounded-xl min-h-[48px] transition-all active:scale-95"
            >
              Это ложная тревога — закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Safety };
