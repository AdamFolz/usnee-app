import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Batch, ConsumptionEntry } from '../types';
import type { QuickRecordDraft } from '../domain/record';
import { METHODS } from '../constants/methods';
import { SUBSTANCES } from '../constants/substances';
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
    Promise.all([getEntries(), getActiveBatch()]).then(([entries, batch]) => {
      if (!mounted) return;
      const route = normalizeRouteState(location.state);
      const last = entries.length ? entries[entries.length - 1] : undefined;
      const lastSite = typeof last?.methodDetails?.site === 'string' ? last.methodDetails.site : last?.injectionSite;
      const substanceId = route.substanceId ?? lastContext?.substanceId ?? last?.substanceId ?? batch?.substanceId ?? null;
      const methodId = route.methodId ?? lastContext?.methodId ?? last?.methodId ?? (batch ? 'inject' : null);
      const method = METHODS.find((item) => item.id === methodId);
      const substance = SUBSTANCES.find((item) => item.id === substanceId);
      const requestedBatchId = route.batchId ?? lastContext?.batchId;
      const compatibleBatch =
        batch && batch.substanceId === substanceId
          ? !requestedBatchId || requestedBatchId === batch.id
            ? batch
            : null
          : null;
      const amountUnit = route.amountUnit ?? lastContext?.amountUnit ?? (methodId === 'inject' ? 'мл' : last?.doseUnit ?? 'мг');
      const injectionSite = lastContext?.injectionSite ?? lastSite;
      setState({
        status: 'ready', entries, batch: compatibleBatch,
        draft: {
          ...emptyDraft(),
          ...route,
          substanceId,
          substanceName: substance?.name ?? lastContext?.substanceName ?? last?.substanceName,
          methodId,
          methodName: method?.name ?? lastContext?.methodName ?? last?.methodName,
          amountInput: route.amountInput ?? '',
          amountUnit,
          batchId: compatibleBatch?.id,
          occurredAt: Date.now(),
          alone: route.alone ?? true,
          methodDetails: injectionSite ? { ...(route.methodDetails ?? {}), site: injectionSite } : route.methodDetails
        }
      });
    }).catch(() => mounted && setState({ status: 'error', draft: emptyDraft(), batch: null, entries: [] }));
    return () => { mounted = false; };
  }, [location.state, lastContext]);
  return state;
}
