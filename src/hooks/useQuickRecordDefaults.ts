import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Batch, ConsumptionEntry } from '../types';
import type { QuickRecordDraft } from '../domain/record';
import { resolveQuickRecordDefaults } from '../domain/record';
import { useAppStore } from '../stores/appStore';
import { getActiveBatch, getEntries } from '../utils/db';

export interface QuickDefaults { status: 'loading' | 'ready' | 'error'; draft: QuickRecordDraft; batch: Batch | null; entries: ConsumptionEntry[]; }
const emptyDraft = (): QuickRecordDraft => ({ substanceId: null, methodId: null, amountInput: '', amountUnit: 'мг', occurredAt: Date.now(), alone: true });

/** Legacy Partials calculator used dose/doseUnit — map into QuickRecordDraft fields. */
function normalizeRouteState(raw: unknown): Partial<QuickRecordDraft> {
  if (!raw || typeof raw !== 'object') return {};
  const route = raw as Partial<QuickRecordDraft> & { dose?: number | string; doseUnit?: string };
  const amountFromDose =
    route.amountInput === undefined && route.dose !== undefined && route.dose !== null && route.dose !== ''
      ? String(route.dose)
      : undefined;
  return {
    ...route,
    amountInput: route.amountInput ?? amountFromDose,
    amountUnit: route.amountUnit ?? (route.doseUnit as QuickRecordDraft['amountUnit'] | undefined)
  };
}

export function useQuickRecordDefaults(): QuickDefaults {
  const location = useLocation();
  const lastContext = useAppStore((state) => state.lastRecordContext);
  const [state, setState] = useState<QuickDefaults>({ status: 'loading', draft: emptyDraft(), batch: null, entries: [] });
  useEffect(() => {
    let mounted = true;
    Promise.all([getEntries(), getActiveBatch()]).then(([entries, activeBatch]) => {
      if (!mounted) return;
      const route = normalizeRouteState(location.state);
      const last = entries.length ? entries[entries.length - 1] : undefined;
      const resolved = resolveQuickRecordDefaults(route, lastContext, last, activeBatch ?? null);
      setState({ status: 'ready', entries, batch: resolved.batch, draft: resolved.draft });
    }).catch(() => mounted && setState({ status: 'error', draft: emptyDraft(), batch: null, entries: [] }));
    return () => { mounted = false; };
  }, [location.state, lastContext]);
  return state;
}
