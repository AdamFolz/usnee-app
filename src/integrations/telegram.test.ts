import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  disableClosingConfirmation,
  enableClosingConfirmation,
  getTelegramStartParam,
  initTelegramMiniApp,
  registerTelegramBackHandler,
  startParamToPath,
  subscribeTelegramViewport
} from './telegram';

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

  it('maps start_param to hash routes', () => {
    expect(startParamToPath('add')).toBe('/add');
    expect(startParamToPath('record')).toBe('/add');
    expect(startParamToPath('history')).toBe('/history');
    expect(startParamToPath('safety')).toBe('/safety');
    expect(startParamToPath('sos')).toBe('/safety');
    expect(startParamToPath('progress')).toBe('/progress');
    expect(startParamToPath('stats')).toBe('/progress');
    expect(startParamToPath('settings')).toBe('/settings');
    expect(startParamToPath('unknown-thing')).toBe('/');
    expect(startParamToPath(null)).toBe('/');
    expect(startParamToPath('')).toBe('/');
  });

  it('reads start_param from initDataUnsafe, then query, else null', () => {
    expect(getTelegramStartParam()).toBeNull();
    window.Telegram = { WebApp: { initDataUnsafe: { start_param: 'record' } } };
    expect(getTelegramStartParam()).toBe('record');
    window.Telegram = { WebApp: {} };
    window.history.replaceState(null, '', '/?tgWebAppStartParam=history');
    expect(getTelegramStartParam()).toBe('history');
    window.history.replaceState(null, '', '/');
    expect(getTelegramStartParam()).toBeNull();
  });

  it('derives header and background from themeParams', () => {
    const setHeaderColor = vi.fn();
    const setBackgroundColor = vi.fn();
    window.Telegram = { WebApp: {
      ready: vi.fn(),
      expand: vi.fn(),
      setHeaderColor,
      setBackgroundColor,
      themeParams: { bg_color: '#17212b', secondary_bg_color: '#232e3c' }
    } };
    initTelegramMiniApp();
    expect(setHeaderColor).toHaveBeenCalledWith('#232e3c');
    expect(setBackgroundColor).toHaveBeenCalledWith('#17212b');
  });

  it('falls back to the brand surface when themeParams lack colors', () => {
    const setHeaderColor = vi.fn();
    const setBackgroundColor = vi.fn();
    window.Telegram = { WebApp: {
      ready: vi.fn(),
      expand: vi.fn(),
      setHeaderColor,
      setBackgroundColor,
      themeParams: {}
    } };
    initTelegramMiniApp();
    expect(setHeaderColor).toHaveBeenCalledWith('#0b0d1a');
    expect(setBackgroundColor).toHaveBeenCalledWith('#0b0d1a');
  });

  it('toggles closing confirmation when the host supports it', () => {
    enableClosingConfirmation();
    disableClosingConfirmation();
    const enable = vi.fn();
    const disable = vi.fn();
    window.Telegram = { WebApp: { enableClosingConfirmation: enable, disableClosingConfirmation: disable } };
    enableClosingConfirmation();
    disableClosingConfirmation();
    expect(enable).toHaveBeenCalledOnce();
    expect(disable).toHaveBeenCalledOnce();
  });
});
