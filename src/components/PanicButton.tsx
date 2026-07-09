import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { ShieldAlert } from 'lucide-react';

export function PanicButton() {
  const panic = useAppStore((s) => s.panic);
  const [holding, setHolding] = useState(false);

  const handlePointerDown = () => {
    setHolding(true);
    setTimeout(() => {
      setHolding(false);
      panic();
    }, 2000);
  };

  const handlePointerUp = () => {
    setHolding(false);
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`fixed right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90 ${
        holding ? 'bg-usnee-danger scale-110' : 'bg-usnee-surface2'
      }`}
      aria-label="Паника"
    >
      <ShieldAlert className="h-5 w-5 text-usnee-danger" />
      {holding && (
        <div className="absolute right-0 top-12 w-32 rounded-lg bg-usnee-surface2 px-2 py-1 text-xs text-usnee-text">
          Держи для выхода...
        </div>
      )}
    </button>
  );
}
