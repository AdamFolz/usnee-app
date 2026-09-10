import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBatches, getEntries, getMoods, getSleep, getWater } from '../utils/db';
import { Progress } from './Progress';

vi.mock('../utils/db', () => ({
  getEntries: vi.fn(),
  getMoods: vi.fn(),
  getSleep: vi.fn(),
  getWater: vi.fn(),
  getBatches: vi.fn()
}));
vi.mock('../integrations/analytics', () => ({ trackEvent: vi.fn() }));

const mockedEntries = vi.mocked(getEntries);
const mockedMoods = vi.mocked(getMoods);
const mockedSleep = vi.mocked(getSleep);
const mockedWater = vi.mocked(getWater);
const mockedBatches = vi.mocked(getBatches);

beforeEach(() => {
  vi.clearAllMocks();
  mockedMoods.mockResolvedValue([]);
  mockedSleep.mockResolvedValue([]);
  mockedWater.mockResolvedValue([]);
  mockedBatches.mockResolvedValue([]);
});

const baseEntry = { methodId: 'inject', dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1 };

function renderProgress() {
  return render(<MemoryRouter><Progress /></MemoryRouter>);
}

describe('Progress summary', () => {
  it('renders simple totals by days and substances', async () => {
    mockedEntries.mockResolvedValue([
      { ...baseEntry, id: '1', substanceId: 'meph', timestamp: Date.now() },
      { ...baseEntry, id: '2', substanceId: 'meph', timestamp: Date.now(), dose: 20, doseUnit: 'мг' }
    ]);
    renderProgress();
    const summary = await screen.findByRole('region', { name: 'Сводка' });
    expect(within(summary).getByText('Всего записей')).toBeInTheDocument();
    expect(within(summary).getAllByText('2')).toHaveLength(3);
    expect(within(summary).getByText('Мефедрон')).toBeInTheDocument();
  });

  it('renders neutral empty state', async () => {
    mockedEntries.mockResolvedValue([]);
    renderProgress();
    const summary = await screen.findByRole('region', { name: 'Сводка' });
    expect(within(summary).getByText('Недостаточно данных. Добавь первую запись.')).toBeInTheDocument();
  });

  it('switches between recent and all-time periods', async () => {
    mockedEntries.mockResolvedValue([
      { ...baseEntry, id: 'recent', substanceId: 'meph', timestamp: Date.now() },
      { ...baseEntry, id: 'old', substanceId: 'mdma', timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 }
    ]);
    renderProgress();
    const summary = await screen.findByRole('region', { name: 'Сводка' });
    expect(within(summary).getByText('Мефедрон')).toBeInTheDocument();
    expect(within(summary).queryByText('MDMA')).not.toBeInTheDocument();
    await userEvent.click(within(summary).getByRole('button', { name: 'Всё время' }));
    expect(within(summary).getByText('MDMA')).toBeInTheDocument();
  });

  it('shows a period-specific empty state', async () => {
    mockedEntries.mockResolvedValue([
      { ...baseEntry, id: 'old', substanceId: 'mdma', timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 }
    ]);
    renderProgress();
    const summary = await screen.findByRole('region', { name: 'Сводка' });
    expect(within(summary).getByText('За выбранный период записей нет.')).toBeInTheDocument();
  });
});
