import { RefreshCw, WifiOff } from 'lucide-react';
import type { SyncState } from '../../contracts';
import { StatusBadge } from '../ui';

export interface SyncStatusProps {
  online: boolean;
  state: SyncState;
  pendingCount?: number;
  onRetry?: () => void;
}

const labels: Record<SyncState, string> = {
  'local-only': 'Сохранено на устройстве',
  // We deliberately surface "На устройстве" for pending too: without a
  // configured sync transport (VITE_API_BASE_URL + Telegram initData) the
  // outbox will never flush, so "Ждёт отправки" would be a lie. The other
  // labels remain honest because each requires a real transport event.
  pending: 'На устройстве',
  syncing: 'Синхронизация…',
  synced: 'Синхронизировано',
  failed: 'Не удалось синхронизировать',
  conflicted: 'Требуется проверить данные'
};

const tones = {
  'local-only': 'offline', pending: 'pending', syncing: 'pending', synced: 'synced', failed: 'failed', conflicted: 'warning'
} as const;

export function SyncStatus({ online, state, pendingCount = 0, onRetry }: SyncStatusProps) {
  const effectiveState: SyncState = online ? state : 'local-only';
  const label = online ? labels[effectiveState] : 'Нет сети · данные доступны';
  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-end gap-2">
      <StatusBadge tone={online ? tones[effectiveState] : 'offline'}>
        {!online && <WifiOff className="h-3 w-3" aria-hidden="true" />}
        {label}{pendingCount > 0 ? ` · ${pendingCount}` : ''}
      </StatusBadge>
      {state === 'failed' && <span className="sr-only">Данные сохранены на устройстве.</span>}
      {state === 'failed' && onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center gap-1 rounded-md px-3 text-xs font-bold text-usnee-danger focus-visible:ring-2 focus-visible:ring-usnee-focus">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Повторить
        </button>
      )}
    </div>
  );
}
