import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Batch } from '../../types';
import { AmountDisplay } from './AmountDisplay';
import { NumericKeypad } from './NumericKeypad';
import { RecordResult } from './RecordResult';

const batch: Batch = { id: 'b1', substanceId: 'meph', name: '№014', totalWeight: 400, weightUnit: 'мг', solutionVolume: 20, volumeUnit: 'мл', concentration: 20, createdAt: 1, active: true, remaining: 260 };

describe('record components', () => {
  it('numeric keypad enters decimal and backspaces', async () => {
    const change = vi.fn(); const { rerender } = render(<NumericKeypad value="1" onChange={change} />);
    await userEvent.click(screen.getByRole('button', { name: 'Десятичная запятая' })); expect(change).toHaveBeenLastCalledWith('1.');
    rerender(<NumericKeypad value="1.2" onChange={change} />); await userEvent.click(screen.getByRole('button', { name: 'Удалить цифру' })); expect(change).toHaveBeenLastCalledWith('1.');
  });
  it('shows ml, calculated mg and remaining balance', () => { render(<AmountDisplay value="1" unit="мл" batch={batch} />); expect(screen.getByText(/≈ 20 мг/)).toBeInTheDocument(); expect(screen.getByText(/≈ 240 мг · 12 мл/)).toBeInTheDocument(); });
  it('does not invent mass without batch', () => { render(<AmountDisplay value="2" unit="хиты" />); expect(screen.queryByText(/≈/)).not.toBeInTheDocument(); });
  it('result exposes pending copy and actions', async () => { const home = vi.fn(); const another = vi.fn(); const undo = vi.fn(); render(<RecordResult undoing={false} onHome={home} onAnother={another} onUndo={undo} />); expect(screen.getByText('Сохранено на устройстве')).toBeInTheDocument(); expect(screen.getByText('Ждёт отправки')).toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: /Отменить запись/ })); expect(undo).toHaveBeenCalled(); });
});
