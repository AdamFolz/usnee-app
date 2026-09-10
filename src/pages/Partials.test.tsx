import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addBatch, getActiveBatch, getBatches } from '../utils/db';
import type { Batch } from '../types';
import { Partials } from './Partials';

vi.mock('../utils/db', () => ({
  getBatches: vi.fn(),
  getActiveBatch: vi.fn(),
  addBatch: vi.fn(),
  updateBatch: vi.fn(),
}));

const mockedBatches = vi.mocked(getBatches);
const mockedActive = vi.mocked(getActiveBatch);
const mockedAddBatch = vi.mocked(addBatch);

const batch = (id: string, overrides: Partial<Batch> = {}): Batch => ({
  id,
  substanceId: 'meph',
  name: 'Партия ' + id,
  totalWeight: 1000,
  weightUnit: 'мг',
  solutionVolume: 10,
  volumeUnit: 'мл',
  concentration: 100,
  createdAt: 1,
  active: false,
  remaining: 500,
  ...overrides,
});

function flush() {
  return act(async () => {});
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Partials />
    </MemoryRouter>
  );
}

function openCreateForm() {
  fireEvent.click(screen.getByRole('button', { name: /Создать новую партию/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedBatches.mockResolvedValue([]);
  mockedActive.mockResolvedValue(undefined);
  mockedAddBatch.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe('Partials', () => {
  it('empty state is neutral — no server/sync promises', async () => {
    renderPage();
    await flush();
    expect(screen.getByText('Партии и дозировка')).toBeInTheDocument();
    expect(screen.getByText(/Активной партии нет/)).toBeInTheDocument();
    expect(screen.getByText(/Здесь появятся созданные партии/)).toBeInTheDocument();
    expect(screen.queryByText(/синхронизац|сервер/i)).not.toBeInTheDocument();
  });

  it('create form refuses to save without substance/mass/volume', async () => {
    renderPage();
    await flush();
    openCreateForm();

    fireEvent.click(screen.getByRole('button', { name: 'Создать партию' }));
    expect(screen.getByText('Заполните вещество, массу и объём.')).toBeInTheDocument();
    expect(mockedAddBatch).not.toHaveBeenCalled();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'meph' } });
    fireEvent.change(screen.getByPlaceholderText('1.0'), { target: { value: '0' } });
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать партию' }));
    expect(screen.getByText('Масса и объём должны быть больше нуля.')).toBeInTheDocument();
    expect(mockedAddBatch).not.toHaveBeenCalled();
  });

  it('valid form computes concentration and saves the batch', async () => {
    renderPage();
    await flush();
    openCreateForm();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'meph' } });
    fireEvent.change(screen.getByPlaceholderText('1.0'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } });
    expect(screen.getByText('10 мг/мл')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Создать партию' }));
    await flush();
    expect(mockedAddBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        substanceId: 'meph',
        concentration: 10,
        totalWeight: 100,
        solutionVolume: 10,
        active: true,
      })
    );
    expect(screen.queryByText('Создание партии')).not.toBeInTheDocument();
  });

  it('renders history with active and closed batches', async () => {
    mockedBatches.mockResolvedValue([
      batch('b1', { active: true }),
      batch('b2', { active: false }),
    ]);
    mockedActive.mockResolvedValue(batch('b1', { active: true }));
    renderPage();
    await flush();
    expect(screen.getAllByText('Партия b1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Партия b2')).toBeInTheDocument();
    expect(screen.getByText('Активна')).toBeInTheDocument();
    expect(screen.getByText('Закрыта')).toBeInTheDocument();
    expect(screen.getByText('Калькулятор дозировки')).toBeInTheDocument();
  });
});
