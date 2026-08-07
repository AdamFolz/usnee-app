import { afterEach, describe, expect, it, vi } from 'vitest';
import { initTelegramMiniApp, registerTelegramBackHandler, subscribeTelegramViewport } from './telegram';

afterEach(() => {
  delete window.Telegram;
  document.documentElement.style.removeProperty('--tg-viewport-height');
  document.documentElement.style.removeProperty('--tg-viewport-stable-height');
  vi.restoreAllMocks();
});

describe('Telegram Mini App adapter', () => {
  it('initializes the host only when Telegram is available', () => {
    expect(initTelegramMiniApp()).toBe(false);
    const ready = vi.fn();
    const expand = vi.fn();
    const setHeaderColor = vi.fn();
    const setBackgroundColor = vi.fn();
    window.Telegram = { WebApp: { ready, expand, setHeaderColor, setBackgroundColor } };
    expect(initTelegramMiniApp()).toBe(true);
    expect(expand).toHaveBeenCalledOnce();
    expect(setHeaderColor).toHaveBeenCalledWith('#0b0d1a');
    expect(setBackgroundColor).toHaveBeenCalledWith('#0b0d1a');
    expect(ready).toHaveBeenCalledOnce();
  });

  it('syncs Telegram viewport CSS variables', () => {
    let viewportHandler: (() => void) | undefined;
    const offEvent = vi.fn();
    window.Telegram = { WebApp: {
      viewportHeight: 640,
      viewportStableHeight: 620,
      onEvent: (_event, handler) => { viewportHandler = handler; },
      offEvent
    } };
    const unsubscribe = subscribeTelegramViewport();
    expect(document.documentElement.style.getPropertyValue('--tg-viewport-height')).toBe('640px');
    expect(document.documentElement.style.getPropertyValue('--tg-viewport-stable-height')).toBe('620px');
    expect(viewportHandler).toBeTypeOf('function');
    unsubscribe?.();
    expect(offEvent).toHaveBeenCalledWith('viewportChanged', viewportHandler);
  });

  it('gives the latest modal handler priority and restores the route handler', () => {
    let telegramHandler: (() => void) | undefined;
    const backButton = {
      show: vi.fn(), hide: vi.fn(),
      onClick: vi.fn((handler: () => void) => { telegramHandler = handler; }),
      offClick: vi.fn()
    };
    window.Telegram = { WebApp: { BackButton: backButton } };
    const route = vi.fn();
    const modal = vi.fn();
    const unregisterRoute = registerTelegramBackHandler(route);
    const unregisterModal = registerTelegramBackHandler(modal);
    telegramHandler?.();
    expect(modal).toHaveBeenCalledOnce();
    expect(route).not.toHaveBeenCalled();
    unregisterModal();
    telegramHandler?.();
    expect(route).toHaveBeenCalledOnce();
    unregisterRoute();
    expect(backButton.hide).toHaveBeenCalled();
  });
});
