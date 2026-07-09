import { useState } from 'react';

interface PinLockProps {
  pin: string;
  onUnlock: () => void;
}

export function PinLock({ pin, onUnlock }: PinLockProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    setError(false);
    if (next.length === 4) {
      if (next === pin) {
        setTimeout(onUnlock, 200);
      } else {
        setTimeout(() => {
          setInput('');
          setError(true);
        }, 200);
      }
    }
  };

  const handleBack = () => {
    setInput(input.slice(0, -1));
    setError(false);
  };

  const digits = ['1','2','3','4','5','6','7','8','9','0'];

  return (
    <div className="flex h-full flex-col items-center justify-center bg-usnee-bg px-8">
      <h1 className="mb-2 text-2xl font-bold text-usnee-text">USNEE</h1>
      <p className="mb-8 text-sm text-usnee-text2">Введи PIN для входа</p>
      <div className="mb-8 flex gap-3">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full transition-all ${
              i < input.length ? 'bg-usnee-accent' : 'bg-usnee-border'
            } ${error ? 'animate-pulse bg-usnee-danger' : ''}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {digits.slice(0,9).map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2"
          >
            {d}
          </button>
        ))}
        <button onClick={handleBack} className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-sm text-usnee-text2 active:bg-usnee-surface2">
          ←
        </button>
        <button
          onClick={() => handleDigit('0')}
          className="big-tap flex h-14 w-14 items-center justify-center rounded-xl bg-usnee-surface text-lg font-semibold text-usnee-text active:bg-usnee-surface2"
        >
          0
        </button>
      </div>
      {error && (
        <p className="mt-6 text-sm text-usnee-danger">Неверный PIN</p>
      )}
    </div>
  );
}
