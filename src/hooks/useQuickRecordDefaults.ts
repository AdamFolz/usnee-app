import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Batch, ConsumptionEntry } from '../types';
import type { QuickRecordDraft } from '../domain/record';
import { METHODS } from '../constants/methods';
import { SUBSTANCES } from '../constants/substances';
import { getActiveBatch, getEntries } from '../utils/db';

export interface QuickDefaults { status: 'loading' | 'ready' | 'error'; draft: QuickRecordDraft; batch: Batch | null; entries: ConsumptionEntry[]; }
const emptyDraft = (): QuickRecordDraft => ({ substanceId: null, methodId: null, amountInput: '', amountUnit: 'мг', occurredAt: Date.now(), alone: true });

export function useQuickRecordDefaults(): QuickDefaults {
  const location = useLocation();
  const [state, setState] = useState<QuickDefaults>({ status: 'loading', draft: emptyDraft(), batch: null, entries: [] });
  useEffect(() => {
    let mounted = true;
    Promise.all([getEntries(), getActiveBatch()]).then(([entries, batch]) => {
      if (!mounted) return;
      const route = (location.state ?? {}) as Partial<QuickRecordDraft>;
      const last = entries.length ? entries[entries.length - 1] : undefined;
      const substanceId = route.substanceId ?? last?.substanceId ?? batch?.substanceId ?? null;
      const methodId = route.methodId ?? last?.methodId ?? (batch ? 'inject' : null);
      const method = METHODS.find((item) => item.id === methodId);
      const substance = SUBSTANCES.find((item) => item.id === substanceId);
      const compatibleBatch = batch?.substanceId === substanceId ? batch : null;
      setState({
        status: 'ready', entries, batch: compatibleBatch,
        draft: {
          ...emptyDraft(), ...route, substanceId, substanceName: substance?.name ?? last?.substanceName,
          methodId, methodName: method?.name ?? last?.methodName,
          amountInput: route.amountInput ?? '', amountUnit: route.amountUnit ?? (methodId === 'inject' ? 'мл' : last?.doseUnit ?? 'мг'),
          batchId: compatibleBatch?.id, occurredAt: Date.now(), alone: route.alone ?? last?.alone ?? true
        }
      });
    }).catch(() => mounted && setState({ status: 'error', draft: emptyDraft(), batch: null, entries: [] }));
    return () => { mounted = false; };
  }, [location.state]);
  return state;
}
