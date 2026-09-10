import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPin } from '../utils/crypto';
import { PinLock } from './PinLock';

vi.mock('../utils/crypto', () => ({ verifyPin: vi.fn(), hashPin: vi.fn() }));
vi.mock('../utils/db', () => ({ resetUserData: vi.fn() }));

interface StoreShape {
  pinAttempts: number;
  pinLockedUntil: number;
  registerPinFailure: ReturnType<typeof vi.fn>;
  resetPinAttempts: ReturnType<typeof vi.fn>;
}

const store = vi.hoisted(() => ({ current: null as unknown as {
  pinAttempts: number;
  pinLockedUntil: number;
  registerPinFailure: ReturnType<typeof vi.fn>;
  resetPinAttempts: ReturnType<typeof vi.fn>;
} }));

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: never) => unknown) => selector(store.current as never)
}));

const mockedVerifyPin = vi.mocked(verifyPin);

function setStore(overrides: Partial<StoreShape> = {}) {
  store.current = {
    pinAttempts: 0,
    pinLockedUntil: 0,
    registerPinFailure: vi.fn(),
    resetPinAttempts: vi.fn(),
    ...overrides
  };
}

describe('PinLock', () => {
  let onUnlock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setStore();
    onUnlock = vi.fn();
  });

  it('unlocks after the correct 4-digit pin', async () => {
    mockedVerifyPin.mockResolvedValue(true);
    render(<PinLock pinHash="stored-hash" onUnlock={onUnlock} />);
    for (const digit of '1234') {
      await userEvent.click(screen.getByRole('button', { name: digit }));
    }
    expect(mockedVerifyPin).toHaveBeenCalledWith('1234', 'stored-hash');
    await waitFor(() => expect(onUnlock).toHaveBeenCalled());
    expect(store.current.resetPinAttempts).toHaveBeenCalled();
  });

  it('shows an error and registers a failure for a wrong pin', async () => {
    mockedVerifyPin.mockResolvedValue(false);
    render(<PinLock pinHash="stored-hash" onUnlock={onUnlock} />);
    for (const digit of '9999') {
      await userEvent.click(screen.getByRole('button', { name: digit }));
    }
    expect(await screen.findByText('Неверный PIN')).toBeInTheDocument();
    expect(store.current.registerPinFailure).toHaveBeenCalled();
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('does not claim storage encryption in the UI', () => {
    render(<PinLock pinHash="stored-hash" onUnlock={onUnlock} />);
    expect(screen.getByText('PIN блокирует интерфейс, но не шифрует хранилище.')).toBeInTheDocument();
  });

  it('blocks input while locked after repeated failures', () => {
    setStore({ pinLockedUntil: Date.now() + 60_000 });
    render(<PinLock pinHash="stored-hash" onUnlock={onUnlock} />);
    expect(screen.getByText(/Слишком много попыток/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
  });
});
