import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConsumptionEntry } from '../../types';
import type { BatchHeroViewModel } from '../../utils/batchPresentation';
import { BatchHeroCard } from './BatchHeroCard';
import { IntervalCard } from './IntervalCard';
import { LastEntryCard } from './LastEntryCard';
import { QuickActionGrid } from './QuickActionGrid';
import { SyncStatus } from './SyncStatus';
import { WeeklySummaryCard } from './WeeklySummaryCard';

const view: BatchHeroViewModel = { id: 'b', name: '№014', substanceId: 'meph', form: 'solution', remainingMassMg: 260, remainingVolumeMl: 13, concentrationMgMl: 20, remainingPercent: 72, level: 'normal' };
const entry: ConsumptionEntry = { id: 'e', substanceId: 'meph', methodId: 'iv', methodName: 'В/в', timestamp: Date.now() - 60_000, dose: 20, doseUnit: 'мг', methodDetails: {}, alone: false, createdAt: 1, updatedAt: 1 };

describe('Home components', () => {
  it('renders batch ml and mg and handles click', async () => { const click = vi.fn(); render(<BatchHeroCard batch={view} onOpenBatch={click} />); expect(screen.getByText(/13/)).toHaveTextContent('13 мл'); expect(screen.getByText(/≈ 260 мг/)).toBeInTheDocument(); await userEvent.click(screen.getByRole('button')); expect(click).toHaveBeenCalled(); });
  it('renders no batch and malformed states', () => { const { rerender } = render(<BatchHeroCard onOpenBatch={() => {}} />); expect(screen.getByText('Активной партии нет')).toBeInTheDocument(); rerender(<BatchHeroCard malformed onOpenBatch={() => {}} />); expect(screen.getByText('Не удалось рассчитать остаток')).toBeInTheDocument(); });
  it('renders low batch text', () => { render(<BatchHeroCard batch={{ ...view, level: 'low', remainingPercent: 20 }} onOpenBatch={() => {}} />); expect(screen.getByText('Заканчивается')).toBeInTheDocument(); });
  it('renders offline, pending, failed and retry', async () => { const retry = vi.fn(); const { rerender } = render(<SyncStatus online={false} state="pending" pendingCount={2} />); expect(screen.getByText(/Нет сети/)).toBeInTheDocument(); rerender(<SyncStatus online state="pending" />); expect(screen.getByText(/Ждёт отправки/)).toBeInTheDocument(); rerender(<SyncStatus online state="failed" onRetry={retry} />); await userEvent.click(screen.getByRole('button', { name: /Повторить/ })); expect(retry).toHaveBeenCalled(); });
  it('renders last entry and empty action', async () => { const create = vi.fn(); const open = vi.fn(); const { rerender } = render(<LastEntryCard entry={null} substanceName="Мефедрон" onCreate={create} onOpenHistory={open} />); await userEvent.click(screen.getByRole('button', { name: /Записать/ })); expect(create).toHaveBeenCalled(); rerender(<LastEntryCard entry={entry} substanceName="Мефедрон" onCreate={create} onOpenHistory={open} />); expect(screen.getByText('Мефедрон')).toBeInTheDocument(); expect(screen.getByText(/20 мг/)).toBeInTheDocument(); await userEvent.click(screen.getByRole('button')); expect(open).toHaveBeenCalled(); });
  it('handles all quick actions', async () => { const handlers = [vi.fn(), vi.fn(), vi.fn(), vi.fn()]; render(<QuickActionGrid onRecord={handlers[0]} onBatch={handlers[1]} onAnalytics={handlers[2]} onSafety={handlers[3]} />); for (const [index, name] of ['Записать', 'Партия', 'Аналитика', 'Safety Hub'].entries()) { await userEvent.click(screen.getByRole('button', { name })); expect(handlers[index]).toHaveBeenCalled(); } });
  it('renders interval empty and elapsed', () => { const now = 10_000_000; const { rerender } = render(<IntervalCard now={now} />); expect(screen.getByText(/Появится/)).toBeInTheDocument(); rerender(<IntervalCard now={now} lastTimestamp={now - 90 * 60_000} />); expect(screen.getByText('1 ч 30 мин')).toBeInTheDocument(); });
  it('counts only entries in last seven days', () => { const now = Date.now(); render(<WeeklySummaryCard entries={[entry, { ...entry, id: 'old', timestamp: now - 8 * 86400000 }, { ...entry, id: 'future', timestamp: now + 1000 }]} todayCount={1} now={now} />); expect(screen.getByText('1 записей')).toBeInTheDocument(); });
});
