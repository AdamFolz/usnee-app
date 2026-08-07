import { useEffect } from 'react';
import { flushEntryOutbox } from '../services/outboxSync';

export function useOutboxSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let running = false;

    const flush = async () => {
      if (disposed || running || !navigator.onLine) return;
      running = true;
      try { await flushEntryOutbox(); }
      finally { running = false; }
    };
    const onOnline = () => { void flush(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') void flush(); };
    const onOutboxChanged = () => { void flush(); };
    const interval = window.setInterval(() => { void flush(); }, 30_000);

    void flush();
    window.addEventListener('online', onOnline);
    window.addEventListener('usnee:outbox-changed', onOutboxChanged);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('usnee:outbox-changed', onOutboxChanged);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
