import { useEffect, useState } from 'react';
import { verifyPin } from '../utils/crypto';
import { resetUserData } from '../utils/db';
import { useAppStore } from '../stores/appStore';

interface PinLockProps {
  pinHash: string;
  onUnlock: () => void;
}

const WIPE_AFTER_ATTEMPTS = 5;

export function PinLock({ pinHash, onUnlock }: PinLockProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const pinAttempts = useAppStore((s) => s.pinAttempts);
  const pinLockedUntil = useAppStore((s) => s.pinLockedUntil);
  const registerPinFailure = useAppStore((s) => s.registerPinFailure);
  const resetPinAttempts = useAppStore((s) => s.resetPinAttempts);

  const lockRemainingMs = Math.max(0, pinLockedUntil - now);
  const locked = lockRemainingMs > 0;

  // Tick once per second while locked so the countdown updates.
  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [locked]);

  const handleWipe = async () => {
    await resetUserData();
    window.location.reload();
  };

  const handleDigit = (d: string) => {
    if (checking || locked) return;
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    setError(false);
    if (next.length === 4) {
      setChecking(true);
      verifyPin(next, pinHash)
        .then(async (ok) => {
          if (ok) {
            resetPinAttempts();
            setTimeout(onUnlock, 200);
          } else {
            const attemptsAfter = pinAttempts + 1;
            registerPinFailure();
            setTimeout(() => {
              setInput('');
              setError(true);
              setChecking(false);
              if (attemptsAfter >= WIPE_AFTER_ATTEMPTS) {
                void handleWipe();
              }
            }, 200);
          }
        })
        .catch(() => {
          setTimeout(() => {
            setInput('');
            setError(true);
            setChecking(false);
          }, 200);
        });
    }
  };

  const handleBack = () => {
    setInput(input.slice(0, -1));
    setError(false);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="flex h-full flex-col items-center justify-center bg-usnee-bg px-8">
      <h1 className="mb-2 text-2xl font-bold text-usnee-text">USNEE</h1>
      <p className="mb-8 text-sm text-usnee-text2">Введи PIN для входа</p>
      <p className="mb-6 max-w-xs text-center text-xs text-usnee-text2">
        PIN блокирует интерфейс, но не шифрует хранилище.
      </p>
      <div className="mb-8 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full transition-all ${
              i < input.length ? 'bg-usnee-accent' : 'bg-usnee-border'
            } ${error ? 'animate-pulse bg-usnee-danger' : ''}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {digits.slice(0, 9).map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={checking || locked}
            className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          onClick={handleBack}
          disabled={checking || locked}
          className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-sm text-usnee-text2 active:bg-usnee-surface2 disabled:opacity-50"
        >
          ←
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={checking || locked}
          className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2 disabled:opacity-50"
        >
          0
        </button>
      </div>
      {locked && (
        <p className="mt-6 text-sm text-usnee-warning">
          Слишком много попыток. Подожди {Math.ceil(lockRemainingMs / 1000)} сек.
        </p>
      )}
      {!locked && error && <p className="mt-6 text-sm text-usnee-danger">Неверный PIN</p>}
    </div>
  );
}
