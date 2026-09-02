import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Batch, ConsumptionEntry } from '../types';
import { ToastProvider } from '../components/ui/Toast';
import { persistPreparedRecord } from '../services/recordPersistence';
import Home from './Home';

const homeState = vi.hoisted(() => ({
  online: true,
  data: {} as any,
  store: { timers: [], refreshEntries: vi.fn(), setLastRecordContext: vi.fn() }
}));

vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => homeState.online }));
vi.mock('../hooks/useHomeData', () => ({ useHomeData: () => homeState.data }));
vi.mock('../stores/appStore', () => ({ useAppStore: (selector: (state: typeof homeState.store) => unknown) => selector(homeState.store) }));
vi.mock('../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn((draft: { substanceId: string; substanceName?: string; methodId: string; methodName?: string; amountInput: string; amountUnit: string; alone: boolean; batchId?: string }) => ({
    entry: {
      substanceId: draft.substanceId, substanceName: draft.substanceName, methodId: draft.methodId,
      methodName: draft.methodName, timestamp: Date.now(), dose: Number(draft.amountInput) || 0,
      doseUnit: draft.amountUnit, alone: draft.alone, injectionSite: undefined
    },
    operation: { operationId: 'op-1', entityId: 'entry-1' },
    sync: { entityId: 'entry-1', operationId: 'op-1', state: 'pending', revision: 0 },
    batchId: undefined, expectedBatchRemaining: undefined, nextBatchRemaining: undefined
  })),
  persistPreparedRecord: vi.fn().mockResolvedValue('created'),
  reversePreparedRecord: vi.fn()
}));
vi.mock('../utils/db', () => ({ getBatches: vi.fn().mockResolvedValue([]) }));

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
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

beforeEach(() => {
  homeState.online = true;
  homeState.store.refreshEntries.mockClear();
  homeState.data = {
    status: 'ready', entries: [entry], activeBatch: batch, activeSleep: null, activeCheckIn: null,
    errors: {}, reload: vi.fn(), hasLoadedOnce: true
  };
});

describe('Home', () => {
  it('renders loading without false empty states', () => {
    homeState.data = { ...homeState.data, status: 'loading', hasLoadedOnce: false, entries: [], activeBatch: null };
    renderHome();
    expect(screen.getByRole('status', { name: 'Загрузка главного экрана' })).toBeInTheDocument();
    expect(screen.queryByText('Активной партии нет')).not.toBeInTheDocument();
    expect(screen.queryByText('Пока нет записей')).not.toBeInTheDocument();
  });

  it('renders existing entries even while the first load flag is still false', () => {
    homeState.data = { ...homeState.data, status: 'loading', hasLoadedOnce: false };
    renderHome();
    expect(screen.queryByRole('status', { name: 'Загрузка главного экрана' })).not.toBeInTheDocument();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    expect(screen.getByText('Сводка')).toBeInTheDocument();
    expect(screen.queryByText('Пока нет записей')).not.toBeInTheDocument();
  });

  it('keeps the previous home frame while a later reload is in flight', () => {
    homeState.data = { ...homeState.data, status: 'loading', hasLoadedOnce: true };
    renderHome();
    expect(screen.queryByRole('status', { name: 'Загрузка главного экрана' })).not.toBeInTheDocument();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
  });

  it('renders real solution balance in ml and mg with the last entry', () => {
    renderHome();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.trim() === '13 мл')).toBeInTheDocument();
    expect(screen.getByText(/≈ 260 мг/)).toBeInTheDocument();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
  });

  it('renders a clean first-record empty state', () => {
    homeState.data = { ...homeState.data, entries: [], activeBatch: null };
    renderHome();
    expect(screen.getByText('Пока нет записей')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сделать первую запись/ })).toBeInTheDocument();
    expect(screen.queryByText('Партии пока нет')).not.toBeInTheDocument();
    expect(screen.queryByText('Записей пока нет')).not.toBeInTheDocument();
    expect(screen.queryByText('Сводка')).not.toBeInTheDocument();
  });

  it('keeps an active batch visible on the first-record empty state', () => {
    homeState.data = { ...homeState.data, entries: [] };
    renderHome();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.trim() === '13 мл')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сделать первую запись/ })).toBeInTheDocument();
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

  it('repeats the last entry in one tap', async () => {
    renderHome();
    await userEvent.click(screen.getByRole('button', { name: /Повторить/ }));
    await waitFor(() => expect(vi.mocked(persistPreparedRecord)).toHaveBeenCalledTimes(1));
    expect(homeState.store.setLastRecordContext).toHaveBeenCalled();
    expect(screen.getByText('Записано')).toBeInTheDocument();
  });

  it('shows a partial local-data error without hiding available content', () => {
    homeState.data = { ...homeState.data, status: 'partial-error', errors: { sleep: 'unavailable' } };
    renderHome();
    expect(screen.getByText('Часть локальных данных недоступна')).toBeInTheDocument();
    expect(screen.getByText(/≈ 260 мг/)).toBeInTheDocument();
  });

  it('shows a full load error with retry and keeps the home frame', async () => {
    const reload = vi.fn();
    homeState.data = {
      ...homeState.data,
      status: 'error',
      entries: [],
      activeBatch: null,
      errors: { entries: 'fail', batch: 'fail', sleep: 'fail', checkIn: 'fail' },
      reload
    };
    renderHome();
    expect(screen.getByText('Не удалось загрузить локальные данные')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(reload).toHaveBeenCalled();
    expect(screen.getByText('USNEE')).toBeInTheDocument();
  });

  it('keeps the last entry visible when a later entries read fails', () => {
    homeState.data = { ...homeState.data, status: 'partial-error', errors: { entries: 'unavailable' } };
    renderHome();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    expect(screen.queryByText('История временно недоступна')).not.toBeInTheDocument();
  });
});
