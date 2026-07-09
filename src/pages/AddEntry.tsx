import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  Leaf,
  Brain,
  Pill,
  HeartPulse,
  Wine,
  PenTool,
  Syringe,
  Flame,
  Wind,
  Users,
  Activity,
  PartyPopper,
  TestTube,
  RotateCcw,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Save,
  ArrowLeft,
  CheckCircle2,
  Home,
  FileText,
  User,
  AlertTriangle,
  Star,
  Heart
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { ConsumptionEntry, MethodField } from '../types';
import { addEntry } from '../utils/db';
import { generateId } from '../utils/date';
import { SUBSTANCES, CATEGORY_LABELS, CATEGORY_ORDER } from '../constants/substances';
import { METHODS, METHOD_ABBREVIATIONS } from '../constants/methods';
import { TRIGGERS } from '../constants/triggers';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  euphorics: Sparkles,
  stimulants: Zap,
  cannabinoids: Leaf,
  dissociatives: Brain,
  benzodiazepines: Pill,
  opioids: HeartPulse,
  alcohol: Wine,
  custom: PenTool
};

const CATEGORY_COLORS: Record<string, string> = {
  euphorics: '#e63946',
  stimulants: '#fb8500',
  cannabinoids: '#2a9d8f',
  dissociatives: '#9b5de5',
  benzodiazepines: '#457b9d',
  opioids: '#e63946',
  alcohol: '#e9c46a',
  custom: '#a0a0a0'
};

const METHOD_ICONS: Record<string, React.ElementType> = {
  Syringe: Syringe,
  Flame: Flame,
  Pill: Pill,
  Wind: Wind
};

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  Zap: Zap,
  Clock: Clock,
  Users: Users,
  Activity: Activity,
  PartyPopper: PartyPopper,
  Flame: Flame,
  TestTube: TestTube,
  RotateCcw: RotateCcw,
  Search: Search,
  PenTool: PenTool
};

function getLocalDatetimeInputValue(ts = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AddEntry() {
  const navigate = useNavigate();
  const refreshEntries = useAppStore((s) => s.refreshEntries);

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string | null>(null);
  const [customSubstanceName, setCustomSubstanceName] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [methodDetails, setMethodDetails] = useState<Record<string, unknown>>({});
  const [triggerId, setTriggerId] = useState<string | null>(null);
  const [customTrigger, setCustomTrigger] = useState('');
  const [pulse, setPulse] = useState<number | ''>('');
  const [qualityNote, setQualityNote] = useState('');
  const [missedShot, setMissedShot] = useState(false);
  const [fentanylTestResult, setFentanylTestResult] = useState<'positive' | 'negative' | 'inconclusive' | null>(null);
  const [notes, setNotes] = useState('');
  const [alone, setAlone] = useState(true);
  const [timestamp, setTimestamp] = useState(getLocalDatetimeInputValue());
  const [saved, setSaved] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps = 6;

  const filteredSubstances = useMemo(() => {
    if (!selectedCategory) return [];
    return SUBSTANCES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  const selectedMethod = useMemo(() => METHODS.find((m) => m.id === selectedMethodId), [selectedMethodId]);
  const selectedSubstance = useMemo(() => SUBSTANCES.find((s) => s.id === selectedSubstanceId), [selectedSubstanceId]);
  const selectedTrigger = useMemo(() => TRIGGERS.find((t) => t.id === triggerId), [triggerId]);

  const isDoseMissing = useCallback(() => {
    if (!selectedMethod) return false;
    const doseField = selectedMethod.fields.find((f) => f.key === 'dose' || f.key === 'volume');
    if (!doseField) return false;
    const val = methodDetails[doseField.key];
    return val === undefined || val === '' || (typeof val === 'number' && val === 0);
  }, [selectedMethod, methodDetails]);

  const handleNext = () => {
    if (step === 4 && isDoseMissing()) {
      setHighlightMissing(true);
    } else {
      setHighlightMissing(false);
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    if (!selectedSubstanceId && !customSubstanceName) return;
    if (!selectedMethod) return;

    setSaving(true);

    const substanceId = selectedSubstanceId || 'custom';
    const substanceName = selectedSubstance?.name || customSubstanceName || 'Неизвестно';
    const methodName = selectedMethod.name;

    // Определяем dose и doseUnit из methodDetails
    let dose = 0;
    let doseUnit = '';
    if (selectedMethod.id === 'inject') {
      dose = Number(methodDetails.volume || 0);
      doseUnit = 'мл';
    } else {
      dose = Number(methodDetails.dose || 0);
      doseUnit = String(methodDetails.doseUnit || 'мг');
    }

    const entry: ConsumptionEntry = {
      id: generateId(),
      substanceId,
      substanceName,
      methodId: selectedMethod.id,
      methodName,
      timestamp: new Date(timestamp).getTime(),
      dose,
      doseUnit,
      methodDetails: { ...methodDetails },
      triggerId: triggerId || undefined,
      triggerName: selectedTrigger?.name || (triggerId === 'custom' ? customTrigger : undefined),
      customTrigger: triggerId === 'custom' ? customTrigger : undefined,
      notes: notes || undefined,
      qualityNote: qualityNote || undefined,
      pulse: pulse ? Number(pulse) : undefined,
      missedShot: missedShot || undefined,
      fentanylTestResult: fentanylTestResult || undefined,
      alone,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await addEntry(entry);
    await refreshEntries();
    setSaving(false);
    setSaved(true);
  };

  const handleAddNote = () => {
    // Пользователь может остаться на экране и редактировать заметку, но мы уже сохранили.
    // Для простоты: переход на главную, где можно редактировать.
    navigate('/');
  };

  const handleGoHome = () => navigate('/');

  const handleRepeat = () => {
    // Сбросить форму и начать сначала
    setStep(1);
    setSelectedCategory(null);
    setSelectedSubstanceId(null);
    setCustomSubstanceName('');
    setSelectedMethodId(null);
    setMethodDetails({});
    setTriggerId(null);
    setCustomTrigger('');
    setPulse('');
    setQualityNote('');
    setMissedShot(false);
    setFentanylTestResult(null);
    setNotes('');
    setAlone(true);
    setTimestamp(getLocalDatetimeInputValue());
    setSaved(false);
    setHighlightMissing(false);
  };

  // --- Рендер полей деталей способа ---
  const renderMethodField = (field: MethodField) => {
    const value = methodDetails[field.key];
    const missing = highlightMissing && !field.optional && (value === undefined || value === '' || value === false || (typeof value === 'number' && value === 0));

    const baseWrap = `rounded-xl border-2 p-3 transition-colors ${missing ? 'border-usnee-danger' : 'border-usnee-border'}`;

    if (field.type === 'number') {
      const num = typeof value === 'number' ? value : 0;
      const stepVal = field.unit === 'мл' ? 0.1 : field.unit === 'г' ? 0.05 : 1;
      return (
        <div key={field.key} className={baseWrap}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-usnee-text">{field.label}</span>
            {field.unit && <span className="text-xs text-usnee-text2">{field.unit}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: Math.max(0, +(num - stepVal).toFixed(3)) }))}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-surface text-usnee-text transition-transform active:scale-95"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              value={num || ''}
              onChange={(e) => setMethodDetails((prev) => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
              placeholder={field.placeholder}
              className="flex-1 rounded-lg bg-usnee-bg py-3 text-center text-xl font-bold text-usnee-text outline-none"
            />
            <button
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: +(num + stepVal).toFixed(3) }))}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-surface text-usnee-text transition-transform active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className={baseWrap}>
          <div className="mb-2 text-sm font-medium text-usnee-text">{field.label}</div>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: opt }))}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-transform active:scale-95 ${
                    active ? 'bg-usnee-accent text-white' : 'bg-usnee-surface text-usnee-text'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (field.type === 'boolean') {
      return (
        <div key={field.key} className={baseWrap}>
          <div className="mb-2 text-sm font-medium text-usnee-text">{field.label}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: true }))}
              className={`flex-1 rounded-lg py-3 text-sm font-medium transition-transform active:scale-95 ${
                value === true ? 'bg-usnee-danger text-white' : 'bg-usnee-surface text-usnee-text'
              }`}
            >
              Да
            </button>
            <button
              onClick={() => setMethodDetails((prev) => ({ ...prev, [field.key]: false }))}
              className={`flex-1 rounded-lg py-3 text-sm font-medium transition-transform active:scale-95 ${
                value === false ? 'bg-usnee-success text-white' : 'bg-usnee-surface text-usnee-text'
              }`}
            >
              Нет
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className={baseWrap}>
        <div className="mb-2 text-sm font-medium text-usnee-text">{field.label}</div>
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setMethodDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
          placeholder={field.placeholder}
          className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-sm text-usnee-text outline-none"
        />
      </div>
    );
  };

  // --- Экран успеха ---
  if (saved) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-usnee-success/10 p-6 animate-bounce">
          <CheckCircle2 className="h-12 w-12 text-usnee-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-usnee-text">Сохранено</h2>
          <p className="mt-1 text-sm text-usnee-text2">Данные в безопасности. Ты — в зоне риска.</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <button
            onClick={handleRepeat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-surface py-3 text-sm font-medium text-usnee-text transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4 text-usnee-accent" />
            Записать ещё
          </button>
          <button
            onClick={handleAddNote}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-surface py-3 text-sm font-medium text-usnee-text transition-transform active:scale-95"
          >
            <FileText className="h-4 w-4 text-usnee-info" />
            Добавить заметку
          </button>
          <button
            onClick={handleGoHome}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-accent py-3 text-sm font-bold text-white transition-transform active:scale-95"
          >
            <Home className="h-4 w-4" />
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* Шапка с прогрессом */}
      <div className="flex items-center gap-3">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="rounded-full bg-usnee-surface p-2 text-usnee-text transition-transform active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="rounded-full bg-usnee-surface p-2 text-usnee-text transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs text-usnee-text2">
            <span>Шаг {step} из {totalSteps}</span>
            <span>
              {step === 1 && 'Категория'}
              {step === 2 && 'Вещество'}
              {step === 3 && 'Способ'}
              {step === 4 && 'Детали'}
              {step === 5 && 'Триггер'}
              {step === 6 && 'Дополнительно'}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-usnee-surface">
            <div
              className="h-full rounded-full bg-usnee-accent transition-all"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* --- Шаг 1: Категория --- */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-usnee-text">Что употребляем?</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_ORDER.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || Pill;
              const color = CATEGORY_COLORS[cat] || '#a0a0a0';
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); handleNext(); }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10' : 'border-usnee-border bg-usnee-surface'
                  }`}
                >
                  <Icon className="h-6 w-6" style={{ color }} />
                  <span className="text-sm font-medium text-usnee-text">{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Шаг 2: Вещество --- */}
      {step === 2 && selectedCategory && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-usnee-text">Конкретнее</h2>
          <div className="grid grid-cols-3 gap-2">
            {filteredSubstances.map((sub) => {
              const active = selectedSubstanceId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => { setSelectedSubstanceId(sub.id); setCustomSubstanceName(''); handleNext(); }}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10' : 'border-usnee-border bg-usnee-surface'
                  }`}
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sub.color }} />
                  <span className="text-xs font-medium text-usnee-text text-center leading-tight">{sub.name}</span>
                </button>
              );
            })}
          </div>

          {selectedCategory === 'custom' && (
            <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
              <label className="mb-2 block text-sm font-medium text-usnee-text">Свой вариант</label>
              <input
                type="text"
                value={customSubstanceName}
                onChange={(e) => setCustomSubstanceName(e.target.value)}
                placeholder="Название..."
                className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-sm text-usnee-text outline-none"
              />
              {customSubstanceName && (
                <button
                  onClick={() => { setSelectedSubstanceId('custom'); handleNext(); }}
                  className="mt-2 w-full rounded-lg bg-usnee-accent py-2 text-sm font-bold text-white transition-transform active:scale-95"
                >
                  Далее
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Шаг 3: Способ --- */}
      {step === 3 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-usnee-text">Как?</h2>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((method) => {
              const Icon = METHOD_ICONS[method.icon] || Pill;
              const active = selectedMethodId === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => { setSelectedMethodId(method.id); handleNext(); }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10' : 'border-usnee-border bg-usnee-surface'
                  }`}
                >
                  <Icon className="h-6 w-6 text-usnee-text" />
                  <span className="text-sm font-medium text-usnee-text">{method.name}</span>
                  {method.abbreviations.length > 0 && (
                    <span className="text-[10px] text-usnee-text2">
                      {method.abbreviations.join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedMethodId && (
            <div className="flex flex-col gap-1">
              {METHODS.find(m => m.id === selectedMethodId)?.abbreviations.map((abbr) => (
                <div key={abbr} className="text-xs text-usnee-text2">
                  {abbr} — {METHOD_ABBREVIATIONS[abbr] || abbr}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Шаг 4: Детали способа --- */}
      {step === 4 && selectedMethod && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-usnee-text">Детали</h2>
          {selectedMethod.fields.map(renderMethodField)}
          {highlightMissing && isDoseMissing() && (
            <div className="rounded-lg bg-usnee-danger/10 p-3 text-xs text-usnee-danger">
              Доза/объём не указан — всё равно сохраним, но будь осторожен.
            </div>
          )}
        </div>
      )}

      {/* --- Шаг 5: Триггер --- */}
      {step === 5 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-usnee-text">Почему?</h2>
          <div className="grid grid-cols-2 gap-2">
            {TRIGGERS.map((tr) => {
              const Icon = TRIGGER_ICONS[tr.icon] || Zap;
              const active = triggerId === tr.id;
              return (
                <button
                  key={tr.id}
                  onClick={() => { setTriggerId(tr.id); if (tr.id !== 'custom') handleNext(); }}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-transform active:scale-95 ${
                    active ? 'border-usnee-accent bg-usnee-accent/10 text-usnee-text' : 'border-usnee-border bg-usnee-surface text-usnee-text'
                  }`}
                >
                  <Icon className="h-4 w-4 text-usnee-text2" />
                  {tr.name}
                </button>
              );
            })}
          </div>

          {triggerId === 'custom' && (
            <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
              <input
                type="text"
                value={customTrigger}
                onChange={(e) => setCustomTrigger(e.target.value)}
                placeholder="Своя причина..."
                className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-sm text-usnee-text outline-none"
              />
              {customTrigger && (
                <button
                  onClick={handleNext}
                  className="mt-2 w-full rounded-lg bg-usnee-accent py-2 text-sm font-bold text-white transition-transform active:scale-95"
                >
                  Далее
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full rounded-lg py-3 text-sm font-medium text-usnee-text2 transition-transform active:scale-95"
          >
            Пропустить
          </button>
        </div>
      )}

      {/* --- Шаг 6: Дополнительно --- */}
      {step === 6 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-usnee-text">Дополнительно</h2>

          {/* Время */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <label className="mb-2 block text-sm font-medium text-usnee-text">Когда?</label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full rounded-lg bg-usnee-bg py-3 px-3 text-lg font-bold text-usnee-text outline-none"
            />
            <p className="mt-1 text-xs text-usnee-text2">Можно указать ретроспективно</p>
          </div>

          {/* Пульс */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-usnee-text">
              <Heart className="h-4 w-4 text-usnee-danger" />
              Пульс
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPulse((p) => (p === '' ? 0 : Math.max(40, Number(p) - 5)))}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-bg text-usnee-text transition-transform active:scale-95"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={pulse}
                onChange={(e) => setPulse(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="---"
                className="flex-1 rounded-lg bg-usnee-bg py-3 text-center text-xl font-bold text-usnee-text outline-none"
              />
              <button
                onClick={() => setPulse((p) => (p === '' ? 60 : Number(p) + 5))}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-usnee-bg text-usnee-text transition-transform active:scale-95"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Качество */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-usnee-text">
              <Star className="h-4 w-4 text-usnee-warning" />
              Качество вещества
            </div>
            <div className="flex flex-wrap gap-2">
              {['🔥 Чистое', '👍 Норм', '🤔 Среднее', '👎 Мусор', '❓ Не знаю'].map((q) => (
                <button
                  key={q}
                  onClick={() => setQualityNote(q)}
                  className={`rounded-lg px-3 py-2 text-sm transition-transform active:scale-95 ${
                    qualityNote === q ? 'bg-usnee-accent text-white' : 'bg-usnee-bg text-usnee-text'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Missed shot */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-usnee-text">
              <AlertTriangle className="h-4 w-4 text-usnee-danger" />
              Промах (missed shot)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMissedShot(true)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-transform active:scale-95 ${
                  missedShot ? 'bg-usnee-danger text-white' : 'bg-usnee-bg text-usnee-text'
                }`}
              >
                Да
              </button>
              <button
                onClick={() => setMissedShot(false)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-transform active:scale-95 ${
                  !missedShot ? 'bg-usnee-success text-white' : 'bg-usnee-bg text-usnee-text'
                }`}
              >
                Нет
              </button>
            </div>
          </div>

          {/* Фентанил тест */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-usnee-text">
              <TestTube className="h-4 w-4 text-usnee-info" />
              Тест на фентанил
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'negative', label: 'Отрицательно' },
                { key: 'positive', label: 'Положительно' },
                { key: 'inconclusive', label: 'Неоднозначно' },
                { key: null, label: 'Не проверял' }
              ].map((opt) => (
                <button
                  key={String(opt.key)}
                  onClick={() => setFentanylTestResult(opt.key as any)}
                  className={`rounded-lg px-3 py-2 text-sm transition-transform active:scale-95 ${
                    fentanylTestResult === opt.key ? 'bg-usnee-info text-white' : 'bg-usnee-bg text-usnee-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Один / не один */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <div className="mb-2 text-sm font-medium text-usnee-text">Компания</div>
            <div className="flex gap-2">
              <button
                onClick={() => setAlone(true)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-transform active:scale-95 ${
                  alone ? 'bg-usnee-accent text-white' : 'bg-usnee-bg text-usnee-text'
                }`}
              >
                <User className="h-4 w-4" />
                Один
              </button>
              <button
                onClick={() => setAlone(false)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-transform active:scale-95 ${
                  !alone ? 'bg-usnee-success text-white' : 'bg-usnee-bg text-usnee-text'
                }`}
              >
                <Users className="h-4 w-4" />
                Не один
              </button>
            </div>
          </div>

          {/* Заметка */}
          <div className="rounded-xl border-2 border-usnee-border bg-usnee-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-usnee-text">
              <FileText className="h-4 w-4 text-usnee-text2" />
              Заметка
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Что угодно..."
              rows={3}
              className="w-full rounded-lg bg-usnee-bg p-3 text-sm text-usnee-text outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* Навигация внизу */}
      <div className="fixed bottom-20 left-4 right-4 z-30 flex flex-col gap-2">
        {step < totalSteps ? (
          <button
            onClick={handleNext}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-accent py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-95"
          >
            Далее <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-accent py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Сохранить
          </button>
        )}
      </div>
    </div>
  );
}
