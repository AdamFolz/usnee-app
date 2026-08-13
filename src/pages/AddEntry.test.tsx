import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LastRecordContext } from '../types';
import AddEntry from './AddEntry';

const store = vi.hoisted(() => ({
  refreshEntries: vi.fn().mockResolvedValue(undefined),
  lastRecordContext: null as LastRecordContext | null,
  setLastRecordContext: vi.fn()
}));

vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: typeof store) => unknown) => selector(store)
}));
vi.mock('../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn(),
  persistPreparedRecord: vi.fn(),
  reversePreparedRecord: vi.fn()
}));
vi.mock('../utils/db', () => ({ getEntries: vi.fn().mockResolvedValue([]), getActiveBatch: vi.fn().mockResolvedValue(undefined) }));

describe('AddEntry route', () => {
  beforeEach(() => {
    store.lastRecordContext = null;
    store.setLastRecordContext.mockClear();
  });

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

  it('restores last substance, method and injection site', async () => {
    store.lastRecordContext = {
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'inject',
      methodName: 'Инъекция',
      injectionSite: 'Вена локтя',
      amountUnit: 'мл'
    };
    render(
      <MemoryRouter>
        <AddEntry />
      </MemoryRouter>
    );
    expect(await screen.findByRole('button', { name: /Мефедрон/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Инъекция/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Вена локтя' })).toHaveAttribute('aria-pressed', 'true');
  });
});
