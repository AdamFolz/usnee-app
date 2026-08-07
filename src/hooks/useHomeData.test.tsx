import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveBatch, getEntries, getNorsSessions, getSleep } from '../utils/db';
import { useHomeData } from './useHomeData';

vi.mock('../utils/db', () => ({
  getEntries: vi.fn(),
  getActiveBatch: vi.fn(),
  getSleep: vi.fn(),
  getNorsSessions: vi.fn()
}));

const mockedEntries = vi.mocked(getEntries);
const mockedBatch = vi.mocked(getActiveBatch);
const mockedSleep = vi.mocked(getSleep);
const mockedCheckIn = vi.mocked(getNorsSessions);

beforeEach(() => {
  vi.clearAllMocks();
  mockedEntries.mockResolvedValue([]);
  mockedBatch.mockResolvedValue(undefined);
  mockedSleep.mockResolvedValue([]);
  mockedCheckIn.mockResolvedValue([]);
});

describe('useHomeData', () => {
  it('moves from loading to ready and sorts entries newest first', async () => {
    mockedEntries.mockResolvedValue([
      { id: 'old', substanceId: 'meph', methodId: 'iv', timestamp: 10, dose: 1, doseUnit: 'мг', methodDetails: {}, alone: false, createdAt: 10, updatedAt: 10 },
      { id: 'new', substanceId: 'meph', methodId: 'iv', timestamp: 20, dose: 1, doseUnit: 'мг', methodDetails: {}, alone: false, createdAt: 20, updatedAt: 20 }
    ]);
    const { result } = renderHook(() => useHomeData());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.entries.map((entry) => entry.id)).toEqual(['new', 'old']);
  });

  it('keeps available data on a partial batch error', async () => {
    mockedBatch.mockRejectedValue(new Error('batch unavailable'));
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.status).toBe('partial-error'));
    expect(result.current.entries).toEqual([]);
    expect(result.current.errors.batch).toBe('batch unavailable');
  });

  it('retries all local reads when reload is requested', async () => {
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.reload());
    await waitFor(() => expect(mockedEntries).toHaveBeenCalledTimes(2));
    expect(mockedBatch).toHaveBeenCalledTimes(2);
  });
});
