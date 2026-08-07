import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEntries } from '../utils/db';
import { Stats } from './Stats';

vi.mock('../utils/db', () => ({ getEntries: vi.fn() }));
const mockedEntries = vi.mocked(getEntries);

beforeEach(() => vi.clearAllMocks());

const baseEntry = { methodId: 'inject', dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1 };

describe('Stats', () => {
  it('renders simple totals by days and substances', async () => {
    mockedEntries.mockResolvedValue([
      { ...baseEntry, id: '1', substanceId: 'meph', timestamp: Date.now() },
      { ...baseEntry, id: '2', substanceId: 'meph', timestamp: Date.now(), dose: 20, doseUnit: 'мг' }
    ]);
    render(<Stats />);
    expect(await screen.findByText('Всего записей')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(3);
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    expect(screen.queryByText(/Общая доза/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Динамика/)).not.toBeInTheDocument();
  });

  it('renders neutral empty state', async () => {
    mockedEntries.mockResolvedValue([]);
    render(<Stats />);
    expect(await screen.findByText('Недостаточно данных. Добавьте первую запись.')).toBeInTheDocument();
  });

  it('switches between recent and all-time periods', async () => {
    mockedEntries.mockResolvedValue([
      { ...baseEntry, id: 'recent', substanceId: 'meph', timestamp: Date.now() },
      { ...baseEntry, id: 'old', substanceId: 'mdma', timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 }
    ]);
    render(<Stats />);
    await screen.findByText('Всего записей');
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    expect(screen.queryByText('MDMA')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Всё время' }));
    expect(screen.getByText('MDMA')).toBeInTheDocument();
  });

  it('shows a period-specific empty state', async () => {
    mockedEntries.mockResolvedValue([
      { ...baseEntry, id: 'old', substanceId: 'mdma', timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 }
    ]);
    render(<Stats />);
    expect(await screen.findByText('За выбранный период записей нет.')).toBeInTheDocument();
  });
});
