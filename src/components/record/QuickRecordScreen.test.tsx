import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsumptionEntry } from '../../types';
import type { QuickRecordDraft } from '../../domain/record';
import { prepareRecordCommand, persistPreparedRecord } from '../../services/recordPersistence';
import { QuickRecordScreen } from './QuickRecordScreen';

const baseDraft: QuickRecordDraft = {
  substanceId: 'meph',
  substanceName: 'Мефедрон',
  methodId: 'inject',
  methodName: 'Инъекция',
  amountInput: '',
  amountUnit: 'мл',
  occurredAt: Date.now(),
  alone: true
};

let entries: ConsumptionEntry[] = [];
let dbEntries: ConsumptionEntry[] = [];

const store = vi.hoisted(() => ({
  refreshEntries: vi.fn().mockResolvedValue(undefined),
  setLastRecordContext: vi.fn()
}));

vi.mock('../../hooks/useQuickRecordDefaults', () => ({
  useQuickRecordDefaults: () => ({ status: 'ready', entries, batch: null, draft: baseDraft })
}));

vi.mock('../../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

vi.mock('../../stores/appStore', () => ({
  useAppStore: (selector: (state: typeof store) => unknown) => selector(store)
}));

vi.mock('../../utils/db', () => ({
  getEntries: () => Promise.resolve(dbEntries)
}));

vi.mock('../../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn((draft: QuickRecordDraft) => ({
    entry: {
      substanceId: draft.substanceId,
      substanceName: draft.substanceName,
      methodId: draft.methodId,
      methodName: draft.methodName,
      timestamp: draft.occurredAt,
      dose: Number(draft.amountInput) || 0,
      doseUnit: draft.amountUnit,
      alone: draft.alone,
      injectionSite: undefined
    },
    operation: { operationId: `operation-${draft.amountInput}`, entityId: `entry-${draft.amountInput}` },
    sync: { entityId: `entry-${draft.amountInput}`, operationId: `operation-${draft.amountInput}`, state: 'pending', revision: 0 }
  })),
  persistPreparedRecord: vi.fn(),
  reversePreparedRecord: vi.fn()
}));

const mockedPrepare = vi.mocked(prepareRecordCommand);
const mockedPersist = vi.mocked(persistPreparedRecord);

async function enterAmount(value: string) {
  const amount = screen.getByLabelText('Количество');
  await userEvent.clear(amount);
  await userEvent.type(amount, value);
}

beforeEach(() => {
  entries = [];
  dbEntries = [];
  vi.clearAllMocks();
  mockedPersist.mockResolvedValue('created');
});

describe('QuickRecordScreen one-tap save', () => {
  it('persists immediately on Записать without a review step', async () => {
    render(<MemoryRouter><QuickRecordScreen /></MemoryRouter>);

    await enterAmount('1');
    await userEvent.click(screen.getByRole('button', { name: /Записать/ }));
    await screen.findByText('Сохранено на устройстве');

    expect(mockedPrepare).toHaveBeenCalledTimes(1);
    expect(mockedPrepare.mock.calls[0][0].amountInput).toBe('1');
    expect(mockedPersist).toHaveBeenCalledTimes(1);
  });

  it('keeps saving fresh data after a failed save and a draft change', async () => {
    mockedPersist.mockRejectedValueOnce(new Error('Временная ошибка')).mockResolvedValueOnce('created');
    render(<MemoryRouter><QuickRecordScreen /></MemoryRouter>);

    await enterAmount('1');
    await userEvent.click(screen.getByRole('button', { name: /Записать/ }));
    await screen.findByText('Временная ошибка');

    await enterAmount('2');
    await userEvent.click(screen.getByRole('button', { name: /Записать/ }));
    await screen.findByText('Сохранено на устройстве');

    expect(mockedPrepare).toHaveBeenCalledTimes(2);
    expect(mockedPrepare.mock.calls[0][0].amountInput).toBe('1');
    expect(mockedPrepare.mock.calls[1][0].amountInput).toBe('2');
    expect(mockedPersist).toHaveBeenCalledTimes(2);
  });

  it('persists exactly once after explicit duplicate acknowledgement', async () => {
    entries = [{
      id: 'recent', substanceId: 'meph', methodId: 'inject', timestamp: baseDraft.occurredAt - 5 * 60_000,
      dose: 1, doseUnit: 'мл', methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1
    }];
    render(<MemoryRouter><QuickRecordScreen /></MemoryRouter>);

    await enterAmount('1');
    await userEvent.click(screen.getByRole('button', { name: /Записать/ }));
    await screen.findByRole('dialog', { name: 'Похоже на повторную запись' });
    expect(mockedPersist).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Всё равно сохранить' }));
    await screen.findByText('Сохранено на устройстве');
    await waitFor(() => expect(mockedPersist).toHaveBeenCalledTimes(1));
    expect(mockedPrepare).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the last-record context from surviving entries after undo', async () => {
    const survivor: ConsumptionEntry = {
      id: 'older', substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'sniff', methodName: 'Интраназально',
      timestamp: baseDraft.occurredAt - 24 * 60 * 60_000, dose: 100, doseUnit: 'мг',
      methodDetails: {}, alone: true, createdAt: 1, updatedAt: 1
    };
    dbEntries = [survivor];
    render(<MemoryRouter><QuickRecordScreen /></MemoryRouter>);

    await enterAmount('1');
    await userEvent.click(screen.getByRole('button', { name: /Записать/ }));
    await screen.findByText('Сохранено на устройстве');
    store.setLastRecordContext.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Отменить запись/ }));
    await waitFor(() => expect(store.setLastRecordContext).toHaveBeenCalled());
    expect(store.setLastRecordContext).toHaveBeenCalledWith({
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'sniff',
      methodName: 'Интраназально',
      amountUnit: 'мг',
      injectionSite: undefined
    });
  });
});