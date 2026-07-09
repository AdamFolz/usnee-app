import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBatches, getActiveBatch, addBatch, updateBatch } from '../utils/db';
import { SUBSTANCES } from '../constants/substances';
import { generateId } from '../utils/date';
import { Batch } from '../types';
import {
  Package, Plus, Minus, FlaskConical, History, AlertTriangle, AlertCircle,
  ChevronRight, Beaker, X, Check
} from 'lucide-react';

export default function Partials() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatch, setActiveBatch] = useState<Batch | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [calcMl, setCalcMl] = useState(0.5);

  // Create form state
  const [substanceId, setSubstanceId] = useState('');
  const [mass, setMass] = useState('');
  const [massUnit, setMassUnit] = useState('мг');
  const [volume, setVolume] = useState('');
  const [customName, setCustomName] = useState('');
  const [createError, setCreateError] = useState('');

  const load = async () => {
    const all = await getBatches();
    const active = await getActiveBatch();
    setBatches(all);
    setActiveBatch(active);
  };

  useEffect(() => {
    load();
  }, []);

  const concentration = useCalculateConcentration(substanceId, mass, massUnit, volume);

  const handleCreate = async () => {
    if (!substanceId || !mass || !volume) {
      setCreateError('Заполни все поля, химик.');
      return;
    }
    const massNum = Number(mass);
    const volNum = Number(volume);
    if (massNum <= 0 || volNum <= 0) {
      setCreateError('Масса и объём должны быть больше нуля. Даже если хочется верить в чудо.');
      return;
    }
    const massMg = massUnit === 'г' ? massNum * 1000 : massNum;
    const conc = massMg / volNum;
    const sub = SUBSTANCES.find((s) => s.id === substanceId);
    const name = customName.trim() || `${sub?.name || 'Партия'} — ${new Date().toLocaleDateString('ru-RU')}`;

    const batch: Batch = {
      id: generateId(),
      substanceId,
      name,
      totalWeight: massMg,
      weightUnit: 'мг',
      solutionVolume: volNum,
      volumeUnit: 'мл',
      concentration: conc,
      createdAt: Date.now(),
      active: true,
      remaining: massMg
    };
    await addBatch(batch);
    await load();
    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    setSubstanceId('');
    setMass('');
    setVolume('');
    setCustomName('');
    setCreateError('');
  };

  const closeBatch = async (batch: Batch) => {
    await updateBatch({ ...batch, active: false });
    await load();
  };

  const handleUseFromBatch = () => {
    if (!activeBatch) return;
    const dose = Math.round(calcMl * activeBatch.concentration * 100) / 100;
    navigate('/add', {
      state: {
        batchId: activeBatch.id,
        substanceId: activeBatch.substanceId,
        dose,
        doseUnit: 'мг'
      }
    });
  };

  const remainingPercent = activeBatch && activeBatch.totalWeight > 0
    ? (activeBatch.remaining / activeBatch.totalWeight) * 100
    : 0;

  const isLow = remainingPercent < 20 && remainingPercent >= 10;
  const isCritical = remainingPercent < 10;

  const calcDose = activeBatch ? Math.round(calcMl * activeBatch.concentration * 100) / 100 : 0;

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-usnee-text">Партии и дозировка</h1>

      {/* Активная партия */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Package className="h-4 w-4" /> Активная партия
        </h2>
        {activeBatch ? (
          <div className={`rounded-xl p-4 ${isCritical ? 'bg-usnee-accent/20 border border-usnee-accent' : isLow ? 'bg-usnee-warning/20 border border-usnee-warning' : 'bg-usnee-surface'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-usnee-text">{activeBatch.name}</p>
                <p className="text-sm text-usnee-text2">
                  {SUBSTANCES.find((s) => s.id === activeBatch.substanceId)?.name || 'Неизвестно'}
                </p>
              </div>
              <FlaskConical className={`h-6 w-6 ${isCritical ? 'text-usnee-accent' : isLow ? 'text-usnee-warning' : 'text-usnee-text2'}`} />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-usnee-text2">Остаток</span>
                <span className="font-medium text-usnee-text">{Math.round(activeBatch.remaining)} мг</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-usnee-text2">Концентрация</span>
                <span className="font-medium text-usnee-text">{Math.round(activeBatch.concentration * 100) / 100} мг/мл</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-usnee-border">
                <div
                  className={`h-full rounded-full transition-all ${
                    isCritical ? 'bg-usnee-accent' : isLow ? 'bg-usnee-warning' : 'bg-usnee-success'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, remainingPercent))}%` }}
                />
              </div>
              <p className="text-right text-xs text-usnee-text2">{Math.round(remainingPercent)}%</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-usnee-surface p-4 text-center">
            <p className="text-sm text-usnee-text2">Нет активной партии. Не повод останавливаться, но повод создать.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="big-tap mt-3 inline-flex items-center gap-2 rounded-xl bg-usnee-accent px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" /> Создать новую партию
            </button>
          </div>
        )}
      </section>

      {/* Предупреждение о заканчивающейся партии */}
      {activeBatch && isLow && (
        <div className={`rounded-xl p-4 ${isCritical ? 'bg-usnee-accent/20 border border-usnee-accent' : 'bg-usnee-warning/20 border border-usnee-warning'}`}>
          <div className="flex items-center gap-2">
            {isCritical ? <AlertCircle className="h-5 w-5 text-usnee-accent" /> : <AlertTriangle className="h-5 w-5 text-usnee-warning" />}
            <p className={`text-sm font-semibold ${isCritical ? 'text-usnee-accent' : 'text-usnee-warning'}`}>
              {isCritical ? 'Критический остаток! Партия почти закончилась.' : 'Партия заканчивается. Подумай о новой.'}
            </p>
          </div>
        </div>
      )}

      {/* Создание партии */}
      {showCreate && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
            <Beaker className="h-4 w-4" /> Создание партии
          </h2>
          <div className="rounded-xl bg-usnee-surface p-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-usnee-text">ПАВ</label>
              <select
                value={substanceId}
                onChange={(e) => setSubstanceId(e.target.value)}
                className="big-tap w-full rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none"
              >
                <option value="">Выбери ПАВ</option>
                {SUBSTANCES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-usnee-text">Масса</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  placeholder="1.0"
                  className="big-tap flex-1 rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none placeholder:text-usnee-text2"
                />
                <select
                  value={massUnit}
                  onChange={(e) => setMassUnit(e.target.value)}
                  className="big-tap rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none"
                >
                  <option value="г">г</option>
                  <option value="мг">мг</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-usnee-text">Объём раствора (мл)</label>
              <input
                type="number"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="10"
                className="big-tap w-full rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none placeholder:text-usnee-text2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-usnee-text">Название (опционально)</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Авто: ПАВ + дата"
                className="big-tap w-full rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none placeholder:text-usnee-text2"
              />
            </div>
            {concentration > 0 && (
              <div className="rounded-lg bg-usnee-surface2 p-3">
                <p className="text-sm text-usnee-text2">
                  Расчётная концентрация: <span className="font-semibold text-usnee-text">{Math.round(concentration * 100) / 100} мг/мл</span>
                </p>
              </div>
            )}
            {createError && (
              <p className="text-sm text-usnee-danger">{createError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="big-tap flex-1 rounded-xl bg-usnee-surface2 py-3 text-sm font-medium text-usnee-text transition-all active:scale-95"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
              <button
                onClick={handleCreate}
                className="big-tap flex-[3] rounded-xl bg-usnee-accent py-3 text-sm font-semibold text-white transition-all active:scale-95"
              >
                Создать партию
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Калькулятор дозировки */}
      {activeBatch && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
            <Beaker className="h-4 w-4" /> Калькулятор дозировки
          </h2>
          <div className="rounded-xl bg-usnee-surface p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-usnee-text2">Хочу (мл)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCalcMl(Math.max(0.1, +(calcMl - 0.1).toFixed(1)))} className="big-tap rounded-lg bg-usnee-surface2 p-2 text-usnee-text"><Minus className="h-4 w-4" /></button>
                  <span className="w-12 text-center text-lg font-semibold text-usnee-text">{calcMl}</span>
                  <button onClick={() => setCalcMl(+(calcMl + 0.1).toFixed(1))} className="big-tap rounded-lg bg-usnee-surface2 p-2 text-usnee-text"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-usnee-text2" />
              <div className="flex-1 text-center">
                <p className="text-xs text-usnee-text2">Это</p>
                <p className="text-lg font-bold text-usnee-text">{calcDose} мг</p>
              </div>
            </div>
            <button
              onClick={handleUseFromBatch}
              className="big-tap flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-info py-3 text-sm font-semibold text-white transition-all active:scale-95"
            >
              <Check className="h-4 w-4" /> Записать употребление из партии
            </button>
          </div>
        </section>
      )}

      {/* История партий */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <History className="h-4 w-4" /> История партий
        </h2>
        <div className="space-y-2">
          {batches.length === 0 ? (
            <p className="rounded-xl bg-usnee-surface p-4 text-center text-sm text-usnee-text2">
              История чиста как слеза. Пока что.
            </p>
          ) : (
            batches.map((batch) => {
              const pct = batch.totalWeight > 0 ? (batch.remaining / batch.totalWeight) * 100 : 0;
              return (
                <div key={batch.id} className={`rounded-xl p-4 ${batch.active ? 'bg-usnee-surface2' : 'bg-usnee-surface opacity-70'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-usnee-text">{batch.name}</p>
                      <p className="text-xs text-usnee-text2">
                        {SUBSTANCES.find((s) => s.id === batch.substanceId)?.name || 'Неизвестно'} • {Math.round(batch.concentration * 100) / 100} мг/мл
                      </p>
                    </div>
                    {batch.active ? (
                      <span className="rounded-full bg-usnee-success/20 px-2 py-1 text-[10px] font-medium uppercase text-usnee-success">Активна</span>
                    ) : (
                      <span className="rounded-full bg-usnee-border px-2 py-1 text-[10px] font-medium uppercase text-usnee-text2">Закрыта</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-usnee-text2">
                      <span>Остаток</span>
                      <span>{Math.round(batch.remaining)} / {Math.round(batch.totalWeight)} мг</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-usnee-border">
                      <div className="h-full rounded-full bg-usnee-info transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                    </div>
                  </div>
                  {batch.active && (
                    <button
                      onClick={() => closeBatch(batch)}
                      className="big-tap mt-3 w-full rounded-lg bg-usnee-surface py-2 text-xs font-medium text-usnee-text2 transition-all active:scale-95"
                    >
                      Закрыть партию
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

// Custom hook for concentration calculation
function useCalculateConcentration(substanceId: string, mass: string, massUnit: string, volume: string): number {
  return useMemo(() => {
    if (!substanceId || !mass || !volume) return 0;
    const massNum = Number(mass);
    const volNum = Number(volume);
    if (massNum <= 0 || volNum <= 0) return 0;
    const massMg = massUnit === 'г' ? massNum * 1000 : massNum;
    return massMg / volNum;
  }, [substanceId, mass, massUnit, volume]);
}
export { Partials };
