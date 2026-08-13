import { useCallback, useEffect, useRef, useState } from 'react';
import type { Batch, ConsumptionEntry, NorsSession, SleepEntry } from '../types';
import { getActiveBatch, getEntries, getNorsSessions, getSleep } from '../utils/db';

export interface HomeDataErrors {
  entries?: string;
  batch?: string;
  sleep?: string;
  checkIn?: string;
}

export interface HomeDataState {
  status: 'loading' | 'ready' | 'partial-error' | 'error';
  entries: ConsumptionEntry[];
  activeBatch: Batch | null;
  activeSleep: SleepEntry | null;
  activeCheckIn: NorsSession | null;
  errors: HomeDataErrors;
  /** False until the first load settles — used to avoid blank flash on revisit. */
  hasLoadedOnce: boolean;
}

const initialState: HomeDataState = {
  status: 'loading',
  entries: [],
  activeBatch: null,
  activeSleep: null,
  activeCheckIn: null,
  errors: {},
  hasLoadedOnce: false
};

/** Survives Home remounts so revisit does not flash a blank skeleton. */
let cachedSnapshot: HomeDataState | null = null;

export function resetHomeDataCache(): void {
  cachedSnapshot = null;
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось прочитать локальные данные';
}

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function applyHomeBatchRemaining(batchId: string, remaining: number): void {
  if (!cachedSnapshot?.activeBatch || cachedSnapshot.activeBatch.id !== batchId) return;
  cachedSnapshot = {
    ...cachedSnapshot,
    activeBatch: { ...cachedSnapshot.activeBatch, remaining }
  };
}

export function useHomeData() {
  const [state, setState] = useState<HomeDataState>(() => cachedSnapshot ?? initialState);
  const [request, setRequest] = useState(0);
  const snapshotRef = useRef<HomeDataState>(cachedSnapshot ?? initialState);
  const reload = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const keepSnapshot = snapshotRef.current.hasLoadedOnce;

    if (!keepSnapshot) {
      setState((current) => ({ ...current, status: 'loading', errors: {} }));
    }

    Promise.allSettled([getEntries(), getActiveBatch(), getSleep(), getNorsSessions()]).then((results) => {
      const [entriesResult, batchResult, sleepResult, checkInResult] = results;
      const errors: HomeDataErrors = {};
      if (entriesResult.status === 'rejected') errors.entries = message(entriesResult.reason);
      if (batchResult.status === 'rejected') errors.batch = message(batchResult.reason);
      if (sleepResult.status === 'rejected') errors.sleep = message(sleepResult.reason);
      if (checkInResult.status === 'rejected') errors.checkIn = message(checkInResult.reason);
      const errorCount = Object.keys(errors).length;
      const next: HomeDataState = {
        status: errorCount === 4 ? 'error' : errorCount ? 'partial-error' : 'ready',
        entries: entriesResult.status === 'fulfilled'
          ? [...asList<ConsumptionEntry>(entriesResult.value)].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
          : keepSnapshot ? snapshotRef.current.entries : [],
        activeBatch: batchResult.status === 'fulfilled' ? batchResult.value ?? null : keepSnapshot ? snapshotRef.current.activeBatch : null,
        activeSleep: sleepResult.status === 'fulfilled' ? asList<SleepEntry>(sleepResult.value).find((item) => !item.endTime) ?? null : keepSnapshot ? snapshotRef.current.activeSleep : null,
        activeCheckIn: checkInResult.status === 'fulfilled' ? asList<NorsSession>(checkInResult.value).find((item) => item.status === 'active') ?? null : keepSnapshot ? snapshotRef.current.activeCheckIn : null,
        errors,
        hasLoadedOnce: true
      };
      snapshotRef.current = next;
      cachedSnapshot = next;
      if (!active) return;
      setState(next);
    });

    return () => { active = false; };
  }, [request]);

  return { ...state, reload };
}
