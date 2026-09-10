import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFood,
  addMood,
  addSleep,
  addWater,
  getBatches,
  getEntries,
  getFood,
  getMoods,
  getSleep,
  getWater
} from '../utils/db';
import Profile from './Profile';

vi.mock('../utils/db', () => ({
  getEntries: vi.fn(),
  getMoods: vi.fn(),
  getSleep: vi.fn(),
  getFood: vi.fn(),
  getWater: vi.fn(),
  getBatches: vi.fn(),
  addMood: vi.fn(),
  addSleep: vi.fn(),
  addFood: vi.fn(),
  addWater: vi.fn()
}));

const store = vi.hoisted(() => ({
  current: {
    timers: [] as unknown[],
    addTimer: vi.fn(),
    removeTimer: vi.fn()
  }
}));

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: typeof store.current) => unknown) => selector(store.current)
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(getEntries).mockResolvedValue([]);
  vi.mocked(getMoods).mockResolvedValue([]);
  vi.mocked(getSleep).mockResolvedValue([]);
  vi.mocked(getFood).mockResolvedValue([]);
  vi.mocked(getWater).mockResolvedValue([]);
  vi.mocked(getBatches).mockResolvedValue([]);
  vi.mocked(addMood).mockResolvedValue(undefined);
  vi.mocked(addSleep).mockResolvedValue(undefined);
  vi.mocked(addFood).mockResolvedValue(undefined);
  vi.mocked(addWater).mockResolvedValue(undefined);
});

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile', () => {
  it('renders every section without data', async () => {
    renderProfile();
    expect(screen.getByRole('heading', { name: 'Самоконтроль' })).toBeInTheDocument();
    expect(screen.getByText('Трекер сна')).toBeInTheDocument();
    expect(screen.getByText('Дневник настроения')).toBeInTheDocument();
    expect(screen.getByText('Питание и вода')).toBeInTheDocument();
    expect(screen.getByText('Таймер до следующего')).toBeInTheDocument();
    expect(await screen.findByText(/Недостаточно данных для графика/)).toBeInTheDocument();
  });

  it('shows self-care controls on empty lists', async () => {
    renderProfile();
    expect(await screen.findByRole('button', { name: 'Я ложусь спать' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Хорошо' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Тревога' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Я поел' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+250 мл' })).toBeInTheDocument();
    expect(screen.getByText('Сегодня: 0 мл')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Что поел?')).toBeInTheDocument();
  });

  it('keeps timer hour/minute controls and starts with defaults', async () => {
    renderProfile();
    expect(screen.getByText('Часы')).toBeInTheDocument();
    expect(screen.getByText('Минуты')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Запустить таймер' }));
    expect(store.current.addTimer).toHaveBeenCalledWith(expect.objectContaining({
      durationMinutes: 120,
      active: true,
      type: 'break'
    }));
    expect(screen.getByText('02:00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Я сдержался' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сорвался' })).toBeInTheDocument();
  });

  it('records a mood with the selected intensity', async () => {
    renderProfile();
    await userEvent.click(screen.getByRole('button', { name: 'Хорошо' }));
    expect(addMood).toHaveBeenCalledWith(expect.objectContaining({ mood: 'good', intensity: 3 }));
  });

  it('does not claim server sync for locked achievements', async () => {
    renderProfile();
    expect(await screen.findByText('Первая запись')).toBeInTheDocument();
    expect(screen.queryByText('Разблокировано')).not.toBeInTheDocument();
    expect(screen.queryByText(/синхронизировано/i)).not.toBeInTheDocument();
  });

  it('persists a clean-day mark to localStorage', async () => {
    renderProfile();
    const section = screen.getByText('Планирование дней без').closest('section');
    expect(section).not.toBeNull();
    const days = within(section as HTMLElement).getAllByRole('button');
    expect(days).toHaveLength(7);
    await userEvent.click(days[0]);
    const saved = JSON.parse(localStorage.getItem('usnee-clean-days') ?? '[]');
    expect(saved).toHaveLength(1);
  });
});
