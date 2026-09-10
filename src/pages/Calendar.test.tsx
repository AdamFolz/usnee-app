import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endOfMonth, startOfMonth } from 'date-fns';
import { getEntriesBetween } from '../utils/db';
import type { ConsumptionEntry } from '../types';
import { Calendar } from './Calendar';

vi.mock('../utils/db', () => ({ getEntriesBetween: vi.fn() }));

const mockedBetween = vi.mocked(getEntriesBetween);

const base = {
  substanceId: 'meph',
  substanceName: 'Мефедрон',
  methodId: 'inject',
  methodName: 'Инъекция',
  dose: 1,
  doseUnit: 'мл',
  methodDetails: {},
  alone: true,
  createdAt: 1,
  updatedAt: 1,
};

function flush() {
  return act(async () => {});
}

// Сетка месяца строится от «сегодня» — фиксируем часы, иначе дрейф по календарю.
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-02T18:00:00'));
});
afterEach(() => vi.useRealTimers());

describe('Calendar', () => {
  it('renders month grid with caption and weekday headers', async () => {
    mockedBetween.mockResolvedValue([]);
    render(<Calendar />);
    await flush();
    expect(screen.getByText('сентябрь 2026')).toBeInTheDocument();
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach((wd) =>
      expect(screen.getByText(wd)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: '15' })).toBeInTheDocument();
    expect(mockedBetween).toHaveBeenCalledWith(
      startOfMonth(new Date(2026, 8, 1)).getTime(),
      endOfMonth(new Date(2026, 8, 1)).getTime()
    );
  });

  it('marks a day that has an entry and opens day details', async () => {
    const ts = new Date(2026, 8, 15, 12).getTime();
    mockedBetween.mockResolvedValue([{ ...base, id: 'e1', timestamp: ts } as ConsumptionEntry]);
    const { container } = render(<Calendar />);
    await flush();

    const day15 = screen.getByRole('button', { name: '15' });
    expect(day15.querySelector('span.bg-white\\/80')).not.toBeNull();
    expect(day15.style.backgroundColor).not.toBe('rgb(30, 30, 30)');

    const day31 = screen.getByRole('button', { name: '31' });
    expect(day31.querySelector('span')).toBeNull();
    expect(day31.style.backgroundColor).toBe('rgb(30, 30, 30)');

    fireEvent.click(day15);
    expect(screen.getByText('15 сентября')).toBeInTheDocument();
    expect(screen.getByText('1 запись — лёгкий')).toBeInTheDocument();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    expect(container).toBeDefined();
  });

  it('empty month does not crash and shows neutral summary', async () => {
    mockedBetween.mockResolvedValue([]);
    render(<Calendar />);
    await flush();
    expect(screen.getByText(/Месяц чистый/)).toBeInTheDocument();
    const day15 = screen.getByRole('button', { name: '15' });
    expect(day15.querySelector('span')).toBeNull();
    expect(day15.style.backgroundColor).toBe('rgb(30, 30, 30)');
  });
});
