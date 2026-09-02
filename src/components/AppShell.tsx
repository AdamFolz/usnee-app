import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { PanicButton } from './PanicButton';
import { SosButton } from './SosButton';
import { AmbientField, cx } from './ui';
import { ToastProvider } from './ui/Toast';
import { registerTelegramBackHandler } from '../integrations/telegram';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const immersive = location.pathname === '/add';
  const routeKey = location.pathname;

  useEffect(() => {
    if (!immersive) return undefined;
    return registerTelegramBackHandler(() => navigate('/'));
  }, [immersive, navigate]);

  return (
    <ToastProvider>
      <div className="app-shell relative flex min-h-0 flex-col overflow-hidden bg-usnee-bg text-usnee-text">
        <AmbientField />
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[120] -translate-y-24 rounded-md bg-usnee-brand px-4 py-3 font-semibold text-white transition-transform focus:translate-y-0"
        >
          К основному содержимому
        </a>
        <main
          id="main-content"
          tabIndex={-1}
          className={cx(
            'app-scroll relative z-[1] min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[calc(1rem+var(--safe-area-left))] pr-[calc(1rem+var(--safe-area-right))] pt-[calc(1rem+var(--content-safe-area-top))]',
            immersive
              ? 'flex flex-col pb-[calc(1rem+var(--content-safe-area-bottom))]'
              : 'pb-[calc(6.5rem+var(--safe-area-bottom))]'
          )}
        >
          <div key={routeKey} className={cx('mx-auto w-full max-w-lg animate-route-in', immersive && 'flex min-h-0 flex-1 flex-col')}>{children}</div>
        </main>
        <PanicButton />
        <SosButton />
        {!immersive && <BottomNav />}
      </div>
    </ToastProvider>
  );
}