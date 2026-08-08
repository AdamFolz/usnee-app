import { useRef, useState, type PointerEvent } from 'react';
import { useAppStore } from '../stores/appStore';
import { ShieldAlert } from 'lucide-react';

const HOLD_MS = 2000;

export function PanicButton() {
  const panic = useAppStore((s) => s.panic);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearHold();
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      panic();
    }, HOLD_MS);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore if capture was not set
    }
    clearHold();
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={clearHold}
      className={`fixed right-3 top-3 z-50 flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full transition-all active:scale-90 ${
        holding ? 'scale-110 bg-usnee-danger' : 'bg-usnee-surface2'
      }`}
      aria-label="Паника: удерживайте 2 секунды для выхода"
    >
      <ShieldAlert className="h-5 w-5 text-usnee-danger" aria-hidden="true" />
      {holding && (
        <div className="absolute right-0 top-14 w-40 rounded-lg bg-usnee-surface2 px-2 py-1 text-xs text-usnee-text shadow-card">
          Удерживайте для выхода…
        </div>
      )}
    </button>
  );
}
