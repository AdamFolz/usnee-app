export interface TelegramBackButton {
  show: () => void;
  hide: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
}

export interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface TelegramWebApp {
  initData?: string;
  viewportHeight?: number;
  viewportStableHeight?: number;
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (event: 'viewportChanged', handler: () => void) => void;
  offEvent?: (event: 'viewportChanged', handler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const backHandlers: Array<() => void> = [];
let attachedBackButton: TelegramBackButton | null = null;

const handleTelegramBack = () => {
  backHandlers[backHandlers.length - 1]?.();
};

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;

  webApp.expand?.();
  webApp.setHeaderColor?.('#0b0d1a');
  webApp.setBackgroundColor?.('#0b0d1a');
  webApp.ready?.();
  return true;
}

export function subscribeTelegramViewport(): (() => void) | undefined {
  const webApp = getTelegramWebApp();
  if (!webApp) return undefined;

  const update = () => {
    const stableHeight = webApp.viewportStableHeight || webApp.viewportHeight;
    if (webApp.viewportHeight) {
      document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportHeight}px`);
    }
    if (stableHeight) {
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${stableHeight}px`);
    }
  };

  update();
  webApp.onEvent?.('viewportChanged', update);
  return () => webApp.offEvent?.('viewportChanged', update);
}

function syncTelegramBackButton() {
  const nextButton = getTelegramWebApp()?.BackButton ?? null;

  if (attachedBackButton && attachedBackButton !== nextButton) {
    attachedBackButton.offClick(handleTelegramBack);
    attachedBackButton.hide();
    attachedBackButton = null;
  }

  if (backHandlers.length === 0) {
    if (attachedBackButton) {
      attachedBackButton.offClick(handleTelegramBack);
      attachedBackButton.hide();
      attachedBackButton = null;
    }
    return;
  }

  if (!nextButton) return;
  if (attachedBackButton !== nextButton) {
    nextButton.onClick(handleTelegramBack);
    attachedBackButton = nextButton;
  }
  nextButton.show();
}

/**
 * Haptic feedback via Telegram WebApp. No-op outside Telegram (PWA).
 */
export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotification(type: 'error' | 'success' | 'warning'): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred(type);
}

export function hapticSelection(): void {
  getTelegramWebApp()?.HapticFeedback?.selectionChanged();
}

/**
 * Registers a Telegram BackButton handler. Only the most recently registered
 * handler runs, so an open sheet takes precedence over the current route.
 */
export function registerTelegramBackHandler(handler: () => void): () => void {
  backHandlers.push(handler);
  syncTelegramBackButton();

  return () => {
    const index = backHandlers.lastIndexOf(handler);
    if (index >= 0) backHandlers.splice(index, 1);
    syncTelegramBackButton();
  };
}
