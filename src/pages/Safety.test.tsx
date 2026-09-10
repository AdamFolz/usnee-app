import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addNors } from '../utils/db';
import { Safety } from './Safety';

vi.mock('../utils/db', () => ({ addNors: vi.fn() }));
vi.mock('../integrations/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('../stores/appStore', () => ({
  useAppStore: () => ({ addTimer: vi.fn(), removeTimer: vi.fn() }),
}));

const mockedAddNors = vi.mocked(addNors);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAddNors.mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-02T18:00:00'));
});
afterEach(() => vi.useRealTimers());

async function startNors(interval?: string) {
  render(<Safety />);
  if (interval) {
    fireEvent.click(screen.getByRole('button', { name: interval }));
  }
  fireEvent.click(screen.getByRole('button', { name: /Запустить NORS-таймер/ }));
  await act(async () => {});
}

describe('Safety', () => {
  it('shows NORS intervals and local-only disclosure', () => {
    render(<Safety />);
    ['5 мин', '10 мин', '15 мин', '30 мин'].forEach((m) =>
      expect(screen.getByRole('button', { name: m })).toBeInTheDocument()
    );
    expect(screen.getByText(/работает локально на устройстве/)).toBeInTheDocument();
  });

  it('call 103 is a plain tel: link, never an auto-call promise', () => {
    render(<Safety />);
    const calls = screen.getAllByRole('link', { name: /Позвонить 103/ });
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((c) => expect(c).toHaveAttribute('href', 'tel:103'));
    expect(
      screen.queryByText(/мы сами позвоним|отправим SMS|автоматически вызов(ем|ет)/i)
    ).not.toBeInTheDocument();
  });

  it('start NORS writes session with chosen interval and shows countdown', async () => {
    await startNors('15 мин');
    expect(mockedAddNors).toHaveBeenCalledWith(
      expect.objectContaining({ checkInInterval: 15, status: 'active' })
    );
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getByText('Интервал: 15 мин')).toBeInTheDocument();
  });

  it('NORS prompt discloses "works only while open, no auto-call" and check-in resets', async () => {
    await startNors();
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(screen.getByText('Ты в порядке?')).toBeInTheDocument();
    expect(screen.getByText(/только пока приложение открыто/)).toBeInTheDocument();
    expect(screen.getByText(/не вызывает помощь автоматически/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Да, я ОК/ }));
    await act(async () => {});
    expect(mockedAddNors).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'checked' })
    );
    expect(screen.queryByText('Ты в порядке?')).not.toBeInTheDocument();
  });

  it('emergency modal: instructions and tel:103 link only, false alarm closes session', async () => {
    await startNors();
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    act(() => {
      vi.advanceTimersByTime(121 * 1000);
    });
    expect(screen.getByText('ЭКСТРЕННАЯ СИТУАЦИЯ')).toBeInTheDocument();
    expect(screen.getByText(/не ответил на NORS-проверку/)).toBeInTheDocument();
    screen.getAllByRole('link', { name: /Позвонить 103/ }).forEach((c) =>
      expect(c).toHaveAttribute('href', 'tel:103')
    );
    fireEvent.click(screen.getByRole('button', { name: /ложная тревога/ }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: /Запустить NORS-таймер/ })).toBeInTheDocument();
  });
});
