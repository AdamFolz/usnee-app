import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEntries, getEntrySyncRecords, getBatches, updateEntryDetailsTransaction } from '../utils/db';
import { reverseEntryById } from '../services/entryActions';
import { History } from './History';

vi.mock('../utils/db', () => ({ getEntries: vi.fn(), getEntrySyncRecords: vi.fn(), getBatches: vi.fn(), updateEntryDetailsTransaction: vi.fn() }));
vi.mock('../services/entryActions', () => ({ reverseEntryById: vi.fn() }));
const mockedEntries = vi.mocked(getEntries);
const mockedSync = vi.mocked(getEntrySyncRecords);
const mockedBatches = vi.mocked(getBatches);
const mockedUpdate = vi.mocked(updateEntryDetailsTransaction);
const mockedReverse = vi.mocked(reverseEntryById);
const base = { substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'inject', methodName: 'Инъекция', dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  mockedEntries.mockResolvedValue([
    { ...base, id: 'old', timestamp: new Date(2026, 0, 1, 12).getTime() },
    { ...base, id: 'new', timestamp: new Date(2026, 0, 2, 12).getTime() }
  ]);
  mockedSync.mockResolvedValue([{ entityId: 'new', operationId: 'op', createOperationId: 'op', state: 'pending', revision: 0 }]);
    mockedBatches.mockResolvedValue([]);
    mockedUpdate.mockResolvedValue({ ...base, id: 'new', timestamp: 20 });
  mockedReverse.mockResolvedValue('reversed');
});

describe('History', () => {
  it('sorts newest first and shows honest statuses', async () => {
    render(<History />);
    await screen.findByText('2 записи');
    const buttons = screen.getAllByRole('button', { name: /Мефедрон/ });
    expect(buttons[0]).toHaveTextContent('02 янв.');
    expect(buttons[1]).toHaveTextContent('01 янв.');
    expect(screen.getByText('На устройстве')).toBeInTheDocument();
    expect(screen.getByText('Только на устройстве')).toBeInTheDocument();
  });

  it('opens entry details', async () => {
    render(<History />);
    await screen.findByText('2 записи');
    await userEvent.click(screen.getAllByRole('button', { name: /Открыть/ })[0]);
    expect(screen.getByRole('dialog', { name: 'Запись' })).toBeInTheDocument();
  });

  it('edits time and note through atomic update', async () => {
    render(<History />);
    await screen.findByText('2 записи');
    await userEvent.click(screen.getAllByRole('button', { name: /Изменить/ })[0]);
    fireEvent.change(screen.getByLabelText('Время'), { target: { value: '2026-01-03T12:00' } });
    fireEvent.change(screen.getByLabelText('Заметка'), { target: { value: 'тест' } });
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith('new', expect.any(Number), 'тест'));
  });

  it('disables destructive action for legacy entries and reverses new entries', async () => {
    render(<History />);
    await screen.findByText('2 записи');
    const removes = screen.getAllByRole('button', { name: /Удалить/ });
    expect(removes[1]).toBeDisabled();
    await userEvent.click(removes[0]);
    const dialog = screen.getByRole('dialog', { name: 'Удалить запись?' });
    await userEvent.click(dialog.querySelector('button.bg-usnee-danger') as HTMLButtonElement);
    await waitFor(() => expect(mockedReverse).toHaveBeenCalledWith('new'));
  });
});
