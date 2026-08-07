import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Batch, ConsumptionEntry } from '../types';
import Home from './Home';

const homeState = vi.hoisted(() => ({
  online: true,
  data: {} as any,
  store: { timers: [], refreshEntries: vi.fn() }
}));

vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => homeState.online }));
vi.mock('../hooks/useHomeData', () => ({ useHomeData: () => homeState.data }));
vi.mock('../stores/appStore', () => ({ useAppStore: (selector: (state: typeof homeState.store) => unknown) => selector(homeState.store) }));

const entry: ConsumptionEntry = {
  id: 'e1', substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'iv', methodName: 'В/в',
  timestamp: Date.now() - 60_000, dose: 20, doseUnit: 'мг', methodDetails: {}, alone: false,
  createdAt: Date.now() - 60_000, updatedAt: Date.now() - 60_000
};
const batch: Batch = {
  id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 360, weightUnit: 'мг',
  solutionVolume: 18, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260
};

function Location() { return <div data-testid="location">{useLocation().pathname}</div>; }
function renderHome() {
  return render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<Home />} /><Route path="*" element={<Location />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  homeState.online = true;
  homeState.store.refreshEntries.mockClear();
  homeState.data = {
    status: 'ready', entries: [entry], activeBatch: batch, activeSleep: null, activeCheckIn: null,
    errors: {}, reload: vi.fn()
  };
});

describe('Home', () => {
  it('renders loading without false empty states', () => {
    homeState.data = { ...homeState.data, status: 'loading' };
    renderHome();
    expect(screen.getByRole('status', { name: 'Загрузка главного экрана' })).toBeInTheDocument();
    expect(screen.queryByText('Активной партии нет')).not.toBeInTheDocument();
  });

  it('renders real solution balance in ml and mg with the last entry', () => {
    renderHome();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.trim() === '13 мл')).toBeInTheDocument();
    expect(screen.getByText(/≈ 260 мг/)).toBeInTheDocument();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
  });

  it('renders no-batch and no-entry empty states', () => {
    homeState.data = { ...homeState.data, entries: [], activeBatch: null };
    renderHome();
    expect(screen.getByText('Активной партии нет')).toBeInTheDocument();
    expect(screen.getByText('Записей пока нет')).toBeInTheDocument();
  });

  it('renders offline and low-batch states', () => {
    homeState.online = false;
    homeState.data = { ...homeState.data, activeBatch: { ...batch, remaining: 72 } };
    renderHome();
    expect(screen.getByText(/Нет сети · данные доступны/)).toBeInTheDocument();
    expect(screen.getByText('Заканчивается')).toBeInTheDocument();
    expect(screen.getByText('Работа без сети')).toBeInTheDocument();
  });

  it('navigates to Quick Record from the primary action', async () => {
    renderHome();
    await userEvent.click(screen.getAllByRole('button', { name: /Записать/ })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/add');
  });

  it('shows a partial local-data error without hiding available content', () => {
    homeState.data = { ...homeState.data, status: 'partial-error', errors: { sleep: 'unavailable' } };
    renderHome();
    expect(screen.getByText('Часть локальных данных недоступна')).toBeInTheDocument();
    expect(screen.getByText(/≈ 260 мг/)).toBeInTheDocument();
  });
});
