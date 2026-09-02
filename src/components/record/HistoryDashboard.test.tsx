import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryDashboard } from './HistoryDashboard';
import type { ConsumptionEntry, Batch } from '../../types';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 8, 2, 18).getTime();

function entry(id: string, substanceId: string, ts: number, dose = 1, doseUnit = 'мл', batchId?: string): ConsumptionEntry {
  return {
    id, substanceId, substanceName: substanceId === 'meph' ? 'Мефедрон' : 'Тест',
    methodId: 'inject', methodName: 'Инъекция',
    timestamp: ts, dose, doseUnit,
    methodDetails: {}, alone: true, createdAt: ts, updatedAt: ts,
    batchId,
  };
}

function batch(id: string, substanceId: string, concentration: number): Batch {
  return {
    id, substanceId, name: 'Партия ' + id,
    totalWeight: 1, weightUnit: 'г',
    solutionVolume: 10, volumeUnit: 'мл',
    concentration, createdAt: 1, active: true, remaining: 10,
  };
}

describe('HistoryDashboard', () => {
  it('renders streak numbers', () => {
    const entries = [
      entry('1', 'meph', now),
      entry('2', 'meph', now - DAY),
    ];
    render(<HistoryDashboard entries={entries} batches={[]} />);
    const streakValues = screen.getAllByText('2');
    expect(streakValues.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('дней подряд')).toBeInTheDocument();
    expect(screen.getByText('дней без записей')).toBeInTheDocument();
  });

  it('renders heatmap with activity header and total count', () => {
    const entries = [entry('1', 'meph', now)];
    render(<HistoryDashboard entries={entries} batches={[]} />);
    expect(screen.getByText('Активность')).toBeInTheDocument();
    expect(screen.getByText('1 запись · 1 за 30д')).toBeInTheDocument();
  });

  it('renders heatmap cells with aria-labels', () => {
    const entries = [entry('1', 'meph', now)];
    render(<HistoryDashboard entries={entries} batches={[]} />);
    const heatmap = screen.getByLabelText('Тепловая карта активности по дням');
    expect(heatmap).toBeInTheDocument();
    const cells = heatmap.querySelectorAll('[aria-label]');
    expect(cells.length).toBeGreaterThan(70); // 84 days + Mon padding (~84-90)
  });

  it('shows mg sum when concentration is known', () => {
    const batches = [batch('b1', 'meph', 100)];
    const entries = [entry('1', 'meph', now, 0.5, 'мл', 'b1')];
    render(<HistoryDashboard entries={entries} batches={batches} />);
    expect(screen.getByText('Суммы доз')).toBeInTheDocument();
    expect(screen.getByText('Мефедрон')).toBeInTheDocument();
    // 0.5 мл × 100 мг/мл = 50 мг
    expect(screen.getByText('50 мг')).toBeInTheDocument();
  });

  it('shows counter (no mg) without concentration — no number duplication', () => {
    // substance has entries but no batch/concentration → fallback to formatCountRu
    const entries = [
      entry('1', 'meph', now),
      entry('2', 'meph', now - DAY),
    ];
    render(<HistoryDashboard entries={entries} batches={[]} />);
    // Should show "2 записи" — the count word, NOT "2 × 2 записи"
    expect(screen.getByText('2 записи')).toBeInTheDocument();
    // Must NOT show the duplicated form
    expect(screen.queryByText('2 × 2 записи')).not.toBeInTheDocument();
  });

  it('shows empty state gracefully', () => {
    render(<HistoryDashboard entries={[]} batches={[]} />);
    expect(screen.getByText('0 записей · 0 за 30д')).toBeInTheDocument();
    // No dose summary section when empty
    expect(screen.queryByText('Суммы доз')).not.toBeInTheDocument();
  });
});
