import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveBatch, getEntries, getNorsSessions, getSleep } from '../utils/db';
import { resetHomeDataCache, useHomeData } from './useHomeData';

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
  resetHomeDataCache();
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

  it('reuses the last snapshot on remount instead of returning to a blank load', async () => {
    mockedEntries.mockResolvedValue([
      { id: 'new', substanceId: 'meph', methodId: 'iv', timestamp: 20, dose: 1, doseUnit: 'мг', methodDetails: {}, alone: false, createdAt: 20, updatedAt: 20 }
    ]);
    const first = renderHook(() => useHomeData());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    first.unmount();
    const second = renderHook(() => useHomeData());
    expect(second.result.current.hasLoadedOnce).toBe(true);
    expect(second.result.current.entries.map((entry) => entry.id)).toEqual(['new']);
    await waitFor(() => expect(mockedEntries).toHaveBeenCalledTimes(2));
    second.unmount();
  });

  it('treats a non-array entries payload as empty instead of getting stuck in loading', async () => {
    mockedEntries.mockResolvedValue(undefined as never);
    mockedSleep.mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.hasLoadedOnce).toBe(true));
    expect(result.current.status).toBe('ready');
    expect(result.current.entries).toEqual([]);
  });
});
