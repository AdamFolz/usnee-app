import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuickRecordDraft } from '../domain/record';
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
});