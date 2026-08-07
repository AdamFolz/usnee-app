import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AddEntry from './AddEntry';

vi.mock('../hooks/useQuickRecordDefaults', () => ({
  useQuickRecordDefaults: () => ({
    status: 'ready',
    entries: [],
    batch: null,
    draft: {
      substanceId: 'meph', substanceName: 'Мефедрон', methodId: 'inject', methodName: 'Инъекция',
      amountInput: '', amountUnit: 'мл', occurredAt: Date.now(), alone: true
    }
  })
}));
vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../stores/appStore', () => ({ useAppStore: (selector: (state: { refreshEntries: () => Promise<void> }) => unknown) => selector({ refreshEntries: vi.fn().mockResolvedValue(undefined) }) }));

describe('AddEntry route', () => {
  it('opens Quick Record by default', () => {
    render(<MemoryRouter><AddEntry /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Быстрая запись' })).toBeInTheDocument();
    expect(screen.getByLabelText('Количество')).toBeInTheDocument();
  });

  it('keeps the advanced six-step form available', async () => {
    render(<MemoryRouter><AddEntry /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /Расширенная запись/ }));
    expect(screen.getByText('Шаг 1 из 6')).toBeInTheDocument();
    expect(screen.getByText('Что употребляем?')).toBeInTheDocument();
  });
});
