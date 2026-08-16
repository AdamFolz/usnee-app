import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { InlineNotice, NoticeTone } from './InlineNotice';

interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
  tone: NoticeTone;
}

interface ToastContextValue {
  showToast: (message: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { ...message, id }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-[calc(1rem+var(--safe-area-top))] z-[100] mx-auto flex max-w-md flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto relative animate-toast-in">
            <InlineNotice tone={toast.tone} title={toast.title} className="bg-usnee-surface pr-12 shadow-card">
              {toast.detail}
            </InlineNotice>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-usnee-text2 hover:bg-usnee-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
              aria-label="Закрыть уведомление"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
