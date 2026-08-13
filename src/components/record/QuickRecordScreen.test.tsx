import { render, screen, waitFor, within } from '@testing-library/react';
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

vi.mock('../../hooks/useQuickRecordDefaults', () => ({
  useQuickRecordDefaults: () => ({ status: 'ready', entries, batch: null, draft: baseDraft })
}));
vi.mock('../../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../../stores/appStore', () => ({
  useAppStore: (selector: (state: { refreshEntries: () => Promise<void>; setLastRecordContext: (value: unknown) => void }) => unknown) =>
    selector({ refreshEntries: vi.fn().mockResolvedValue(undefined), setLastRecordContext: vi.fn() })
}));
vi.mock('../../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn((draft: QuickRecordDraft) => ({
    entry: {
      id: `entry-${draft.amountInput}`,
      substanceId: draft.substanceId!,
      methodId: draft.methodId!,
      timestamp: draft.occurredAt,
      dose: Number(draft.amountInput),
      doseUnit: draft.amountUnit,
      methodDetails: {},
      alone: draft.alone,
      createdAt: 1,
      updatedAt: 1
    },
    operation: { operationId: `operation-${draft.amountInput}`, entityId: `entry-${draft.amountInput}` },
    sync: { entityId: `entry-${draft.amountInput}`, operationId: `operation-${draft.amountInput}`, state: 'pending', revision: 0 }
  })),
  persistPreparedRecord: vi.fn(),
  reversePreparedRecord: vi.fn()
}));

const mockedPrepare = vi.mocked(prepareRecordCommand);
const mockedPersist = vi.mocked(persistPreparedRecord);

async function enterAmountAndReview(value: string) {
  const amount = screen.getByLabelText('Количество');
  await userEvent.clear(amount);
  await userEvent.type(amount, value);
  await userEvent.click(screen.getByRole('button', { name: 'Проверить запись' }));
  await screen.findByRole('dialog', { name: 'Проверьте запись' });
}

beforeEach(() => {
  entries = [];
  vi.clearAllMocks();
  mockedPersist.mockResolvedValue('created');
});

describe('QuickRecordScreen persistence guards', () => {
  it('prepares fresh data after a failed save and a draft change', async () => {
    mockedPersist.mockRejectedValueOnce(new Error('Временная ошибка')).mockResolvedValueOnce('created');
    render(<MemoryRouter><QuickRecordScreen onAdvanced={vi.fn()} /></MemoryRouter>);

    await enterAmountAndReview('1');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Временная ошибка');
    const failedReview = screen.getByRole('dialog', { name: 'Проверьте запись' });
    await userEvent.click(within(failedReview).getByRole('button', { name: 'Закрыть' }));

    await enterAmountAndReview('2');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
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
    render(<MemoryRouter><QuickRecordScreen onAdvanced={vi.fn()} /></MemoryRouter>);

    await enterAmountAndReview('1');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await screen.findByRole('dialog', { name: 'Похоже на повторную запись' });
    expect(mockedPersist).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Всё равно сохранить' }));
    await screen.findByText('Сохранено на устройстве');
    await waitFor(() => expect(mockedPersist).toHaveBeenCalledTimes(1));
    expect(mockedPrepare).toHaveBeenCalledTimes(1);
  });
});
