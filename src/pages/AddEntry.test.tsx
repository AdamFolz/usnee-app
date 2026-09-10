import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuickRecordDraft } from '../domain/record';
import { persistPreparedRecord, prepareRecordCommand } from '../services/recordPersistence';
import AddEntry from './AddEntry';

const preparedDraft: QuickRecordDraft = {
  substanceId: 'meph',
  substanceName: 'Мефедрон',
  methodId: 'inject',
  methodName: 'Инъекция',
  amountInput: '1',
  amountUnit: 'мл',
  occurredAt: Date.now(),
  alone: true,
  methodDetails: { site: 'Вена локтя' }
};

vi.mock('../hooks/useQuickRecordDefaults', () => ({
  useQuickRecordDefaults: () => ({ status: 'ready', entries: [], batch: null, draft: preparedDraft })
}));

vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: { refreshEntries: () => Promise<void>; setLastRecordContext: (value: unknown) => void }) => unknown) =>
    selector({ refreshEntries: vi.fn().mockResolvedValue(undefined), setLastRecordContext: vi.fn() })
}));

vi.mock('../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn(),
  persistPreparedRecord: vi.fn(),
  reversePreparedRecord: vi.fn()
}));

describe('AddEntry route (quick record)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the quick record flow by default', () => {
    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Новая запись' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Записать/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Расширенная/ })).not.toBeInTheDocument();
  });

  it('prefills substance, method and dose from the last record context', () => {
    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    expect(screen.getByText('Инъекция')).toBeInTheDocument();
    expect(screen.getByLabelText('Количество')).toHaveValue('1');
  });

  it('enables closing confirmation until the record is saved', async () => {
    const enable = vi.fn();
    const disable = vi.fn();
    window.Telegram = { WebApp: { enableClosingConfirmation: enable, disableClosingConfirmation: disable } };
    const savedCommand = {
      entry: {
        id: 'entry-1',
        substanceId: 'meph',
        substanceName: 'Мефедрон',
        methodId: 'inject',
        methodName: 'Инъекция',
        timestamp: Date.now(),
        dose: 1,
        doseUnit: 'мл',
        methodDetails: {},
        alone: true,
        createdAt: 1,
        updatedAt: 1
      },
      operation: {},
      sync: {}
    } as unknown as ReturnType<typeof prepareRecordCommand>;
    vi.mocked(prepareRecordCommand).mockReturnValue(savedCommand);
    vi.mocked(persistPreparedRecord).mockResolvedValue('created');

    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    expect(enable).toHaveBeenCalledOnce();
    expect(disable).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Записать/ }));
    expect(await screen.findByText('Сохранено на устройстве')).toBeInTheDocument();
    expect(disable).toHaveBeenCalled();
    delete window.Telegram;
  });
});