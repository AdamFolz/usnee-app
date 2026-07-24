import { useState } from 'react';
import { verifyPin } from '../utils/crypto';

interface PinLockProps {
  pinHash: string;
  onUnlock: () => void;
}

export function PinLock({ pinHash, onUnlock }: PinLockProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleDigit = (d: string) => {
    if (checking) return;
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    setError(false);
    if (next.length === 4) {
      setChecking(true);
      verifyPin(next, pinHash)
        .then((ok) => {
          if (ok) {
            setTimeout(onUnlock, 200);
          } else {
            setTimeout(() => {
              setInput('');
              setError(true);
              setChecking(false);
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
            disabled={checking}
            className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          onClick={handleBack}
          disabled={checking}
          className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-sm text-usnee-text2 active:bg-usnee-surface2 disabled:opacity-50"
        >
          ←
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={checking}
          className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2 disabled:opacity-50"
        >
          0
        </button>
      </div>
      {error && <p className="mt-6 text-sm text-usnee-danger">Неверный PIN</p>}
    </div>
  );
}
