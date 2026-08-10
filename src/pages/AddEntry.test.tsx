import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AddEntry from './AddEntry';

vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: { refreshEntries: () => Promise<void> }) => unknown) =>
    selector({ refreshEntries: vi.fn().mockResolvedValue(undefined) })
}));
vi.mock('../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn(),
  persistPreparedRecord: vi.fn(),
  reversePreparedRecord: vi.fn()
}));
vi.mock('../utils/db', () => ({ getEntries: vi.fn().mockResolvedValue([]) }));

describe('AddEntry route', () => {
  it('opens the unified Advanced Record form by default', () => {
    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    // TopBar title
    expect(screen.getByRole('heading', { name: 'Запись' })).toBeInTheDocument();
    // Category section is the first thing the user sees
    expect(screen.getByRole('heading', { name: 'Что употребляем?' })).toBeInTheDocument();
    // Sticky CTA — single primary action, no "Расширенная запись" tab anymore
    expect(screen.getByRole('button', { name: /Сохранить запись/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Расширенная запись/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Быстрая запись' })).not.toBeInTheDocument();
  });

  it('shows substance and method sections in a single scroll', () => {
    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Как?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Почему?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Когда и с кем' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Дополнительно' })).toBeInTheDocument();
  });

  it('save button stays disabled while substance/method/dose are missing', async () => {
    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    const save = screen.getByRole('button', { name: /Сохранить запись/ });
    expect(save).toBeEnabled(); // click reveals what's missing
    await userEvent.click(save);
    expect(await screen.findByText('Не хватает данных')).toBeInTheDocument();
  });
});
