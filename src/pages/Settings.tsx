import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { clearAllData, getEntries } from '../utils/db';
import { hashPin, encryptData } from '../utils/crypto';
import { SUBSTANCES } from '../constants/substances';
import {
  Shield,
  Trash2,
  Download,
  Bell,
  TrendingUp,
  Info,
  AlertTriangle,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const refreshEntries = useAppStore((s) => s.refreshEntries);
  const todayCount = useAppStore((s) => s.todayCount);

  const [pinModal, setPinModal] = useState(false);
  const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  const [deleteStage, setDeleteStage] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  const handlePinDigit = async (d: string, isConfirm: boolean) => {
    const target = isConfirm ? pinConfirm : pinNew;
    if (target.length >= 4) return;
    const next = target + d;
    if (isConfirm) {
      setPinConfirm(next);
      if (next.length === 4) {
        if (next === pinNew) {
          updateSettings({ pinHash: await hashPin(next) });
          setPinModal(false);
          setPinNew('');
          setPinConfirm('');
          setPinStep('new');
          setPinError('');
        } else {
          setPinError('PIN не совпадает. Попробуй ещё раз.');
          setTimeout(() => {
            setPinConfirm('');
            setPinError('');
          }, 800);
        }
      }
    } else {
      setPinNew(next);
      if (next.length === 4) {
        setPinStep('confirm');
      }
    }
  };

  const handlePinBack = (isConfirm: boolean) => {
    if (isConfirm) {
      setPinConfirm(pinConfirm.slice(0, -1));
    } else {
      setPinNew(pinNew.slice(0, -1));
    }
    setPinError('');
  };

  const openPinModal = () => {
    setPinNew('');
    setPinConfirm('');
    setPinStep('new');
    setPinError('');
    setPinModal(true);
  };

  const togglePin = () => {
    if (settings.pinHash) {
      updateSettings({ pinHash: undefined });
    } else {
      openPinModal();
    }
  };

  const handleDeleteData = async () => {
    if (deleteStage < 2) {
      setDeleteStage(deleteStage + 1);
      return;
    }
    await clearAllData();
    updateSettings({
      pinHash: undefined,
      dailyLimit: undefined,
      limitSubstance: undefined,
      onboardingCompleted: false
    });
    window.location.reload();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const entries = await getEntries();
      const data = {
        exportedAt: Date.now(),
        entries,
        settings: {
          ...settings,
          pinHash: undefined,
          dataExportPassword: undefined
        }
      };
      const password = window.prompt('Введи пароль для шифрования (или оставь пустым для простого JSON):');
      let content = JSON.stringify(data, null, 2);
      if (password && password.trim()) {
        try {
          content = await encryptData(content, password);
        } catch {
          window.alert('Не удалось зашифровать. Экспортирую как обычный JSON без пароля.');
        }
      }
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usnee-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const digits = ['1','2','3','4','5','6','7','8','9','0'];

  const deleteLabels = ['Удалить все данные', 'Точно?', 'Это навсегда.'];
  const deleteColors = [
    'bg-usnee-surface text-usnee-danger',
    'bg-usnee-warning text-usnee-bg',
    'bg-usnee-danger text-white'
  ];

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-usnee-text">Настройки</h1>

      {/* Безопасность */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Shield className="h-4 w-4" /> Безопасность
        </h2>
        <div className="space-y-3 rounded-xl bg-usnee-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.pinHash ? <Lock className="h-5 w-5 text-usnee-accent" /> : <Unlock className="h-5 w-5 text-usnee-text2" />}
              <div>
                <p className="text-sm font-medium text-usnee-text">PIN-код</p>
                <p className="text-xs text-usnee-text2">{settings.pinHash ? 'Установлен' : 'Не установлен'}</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!!settings.pinHash}
                onChange={togglePin}
                className="peer sr-only"
              />
              <div className="h-6 w-12 rounded-full bg-usnee-border transition-colors peer-checked:bg-usnee-accent" />
              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-6" />
            </label>
          </div>

          {settings.pinHash && (
            <button
              onClick={openPinModal}
              className="big-tap flex w-full items-center justify-between rounded-lg bg-usnee-surface2 px-4 py-3 text-sm font-medium text-usnee-text transition-all active:scale-95"
            >
              Сменить PIN
              <ChevronRight className="h-4 w-4 text-usnee-text2" />
            </button>
          )}

          <div className="rounded-lg bg-usnee-surface2 p-3">
            <p className="text-sm font-medium text-usnee-text">Паник-кнопка</p>
            <p className="mt-1 text-xs text-usnee-text2">
              Держи 2 секунды в правом верхнем углу для мгновенного выхода из приложения. Полезно, если кто-то заглядывает через плечо.
            </p>
          </div>
        </div>
      </section>

      {/* Приватность */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Lock className="h-4 w-4" /> Приватность
        </h2>
        <div className="space-y-3 rounded-xl bg-usnee-surface p-4">
          <button
            onClick={handleDeleteData}
            className={`big-tap flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 ${deleteColors[deleteStage]}`}
          >
            <Trash2 className="h-4 w-4" />
            {deleteLabels[deleteStage]}
            {deleteStage > 0 && <span className="text-xs opacity-70">({deleteStage}/3)</span>}
          </button>
          {deleteStage > 0 && (
            <button
              onClick={() => setDeleteStage(0)}
              className="w-full text-center text-xs text-usnee-text2 underline"
            >
              Отменить
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="big-tap flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-info py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Экспорт...' : 'Экспорт данных'}
          </button>
          <p className="text-xs text-usnee-text2">
            JSON со всеми записями. Можно защитить паролем — просто введи его в промпт.
          </p>
        </div>
      </section>

      {/* Уведомления */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Bell className="h-4 w-4" /> Уведомления
        </h2>
        <div className="space-y-3 rounded-xl bg-usnee-surface p-4">
          {[
            { key: 'reminderEat' as const, label: 'Напоминать поесть', sub: 'Потому что амфетамин ≠ завтрак' },
            { key: 'reminderWater' as const, label: 'Напоминать пить воду', sub: 'Дегидратация — не круто' },
            { key: 'reminderBreak' as const, label: 'Напоминать о перерыве', sub: 'Сердце тоже устаёт' }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-usnee-text">{item.label}</p>
                <p className="text-xs text-usnee-text2">{item.sub}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={!!settings[item.key]}
                  onChange={() => updateSettings({ [item.key]: !settings[item.key] })}
                  className="peer sr-only"
                />
                <div className="h-6 w-12 rounded-full bg-usnee-border transition-colors peer-checked:bg-usnee-accent" />
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-6" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Дневной лимит */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <TrendingUp className="h-4 w-4" /> Дневной лимит
        </h2>
        <div className="space-y-3 rounded-xl bg-usnee-surface p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-usnee-text">ПАВ для лимита</label>
            <select
              value={settings.limitSubstance || ''}
              onChange={(e) => updateSettings({ limitSubstance: e.target.value || undefined })}
              className="big-tap w-full rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none"
            >
              <option value="">Любое / не задано</option>
              {SUBSTANCES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-usnee-text">Лимит записей в день</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.dailyLimit || ''}
              onChange={(e) => updateSettings({ dailyLimit: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="3"
              className="big-tap w-full rounded-lg bg-usnee-surface2 px-3 py-3 text-sm text-usnee-text outline-none"
            />
          </div>
          {settings.dailyLimit && (
            <div className="rounded-lg bg-usnee-surface2 p-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-usnee-text2">Сегодня</span>
                <span className={todayCount >= settings.dailyLimit ? 'text-usnee-danger font-semibold' : 'text-usnee-text'}>
                  {todayCount} из {settings.dailyLimit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-usnee-border">
                <div
                  className={`h-full rounded-full transition-all ${
                    todayCount >= settings.dailyLimit ? 'bg-usnee-danger' : todayCount >= settings.dailyLimit * 0.7 ? 'bg-usnee-warning' : 'bg-usnee-success'
                  }`}
                  style={{ width: `${Math.min(100, (todayCount / settings.dailyLimit) * 100)}%` }}
                />
              </div>
              {todayCount >= settings.dailyLimit && (
                <p className="mt-2 text-xs text-usnee-danger">Лимит достигнут. Может, сегодня хватит?</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* О приложении */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-usnee-text2">
          <Info className="h-4 w-4" /> О приложении
        </h2>
        <div className="space-y-3 rounded-xl bg-usnee-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-usnee-text">Версия</span>
            <span className="text-sm text-usnee-text2">1.0.0</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-usnee-text">Полезные ресурсы</p>
            <button
              onClick={() => window.open('https://harmreduction.org', '_blank')}
              className="big-tap flex w-full items-center justify-between rounded-lg bg-usnee-surface2 px-3 py-2 text-sm text-usnee-text transition-all active:scale-95"
            >
              Harm Reduction Coalition
              <ChevronRight className="h-4 w-4 text-usnee-text2" />
            </button>
            <button
              onClick={() => window.open('https://psychonautwiki.org', '_blank')}
              className="big-tap flex w-full items-center justify-between rounded-lg bg-usnee-surface2 px-3 py-2 text-sm text-usnee-text transition-all active:scale-95"
            >
              PsychonautWiki
              <ChevronRight className="h-4 w-4 text-usnee-text2" />
            </button>
          </div>
          <div className="flex gap-2 rounded-lg bg-usnee-surface2 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-usnee-warning" />
            <p className="text-xs leading-relaxed text-usnee-text2">
              USNEE не заменяет медицинскую помощь и не даёт рекомендаций по употреблению. 
              Если что-то пошло не так — звони в скорую. Не гугли симптомы, не спрашивай у приложения.
            </p>
          </div>
        </div>
      </section>

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-usnee-bg px-8">
          <button
            onClick={() => setPinModal(false)}
            className="absolute right-4 top-4 text-sm text-usnee-text2"
          >
            Отмена
          </button>
          <h2 className="mb-2 text-xl font-bold text-usnee-text">
            {pinStep === 'new' ? (settings.pinHash ? 'Новый PIN' : 'Установить PIN') : 'Повтори PIN'}
          </h2>
          <p className="mb-6 text-sm text-usnee-text2">
            {pinStep === 'new' ? 'Введи 4 цифры' : 'Ещё раз для проверки'}
          </p>
          <div className="mb-8 flex gap-3">
            {[0,1,2,3].map(i => {
              const currentVal = pinStep === 'confirm' ? pinConfirm : pinNew;
              return (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full transition-all ${
                    i < currentVal.length ? 'bg-usnee-accent' : 'bg-usnee-border'
                  }`}
                />
              );
            })}
          </div>
          {pinError && <p className="mb-4 text-sm text-usnee-danger">{pinError}</p>}
          <div className="grid grid-cols-3 gap-4">
            {digits.slice(0,9).map(d => (
              <button
                key={d}
                onClick={() => handlePinDigit(d, pinStep === 'confirm')}
                className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => handlePinBack(pinStep === 'confirm')}
              className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-sm text-usnee-text2 active:bg-usnee-surface2"
            >
              ←
            </button>
            <button
              onClick={() => handlePinDigit('0', pinStep === 'confirm')}
              className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2"
            >
              0
            </button>
            <button
              onClick={() => {
                if (pinStep === 'confirm') {
                  setPinStep('new');
                  setPinConfirm('');
                } else {
                  setPinNew('');
                }
              }}
              className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-sm text-usnee-text2 active:bg-usnee-surface2"
            >
              C
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export { Settings };
