import { ArrowRight, Clock3, Plus } from 'lucide-react';
import type { ConsumptionEntry } from '../../types';
import { formatTime, timeSince } from '../../utils/date';
import { Button, Surface } from '../ui';

export interface LastEntryCardProps { entry: ConsumptionEntry | null; substanceName: string; onOpenHistory: () => void; onCreate: () => void; }
export function LastEntryCard({ entry, substanceName, onOpenHistory, onCreate }: LastEntryCardProps) {
  if (!entry) return <Surface className="p-5 text-center"><Clock3 className="mx-auto h-6 w-6 text-usnee-text3" aria-hidden="true" /><h2 className="mt-3 text-title-md">Записей пока нет</h2><p className="mt-1 text-body-sm text-usnee-text2">Первая запись появится здесь после сохранения.</p><Button className="mt-4 w-full" onClick={onCreate}><Plus className="h-4 w-4" />Записать</Button></Surface>;
  return <button type="button" onClick={onOpenHistory} className="w-full rounded-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"><Surface variant="interactive" className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-label uppercase text-usnee-text3">Последняя запись</p><h2 className="mt-2 text-title-lg">{entry.substanceName || substanceName}</h2><p className="mt-1 text-body-sm text-usnee-text2">{entry.methodName || entry.methodId} · {entry.dose} {entry.doseUnit}</p><p className="mt-3 text-caption text-usnee-text3">{formatTime(entry.timestamp)} · {timeSince(entry.timestamp)}</p></div><ArrowRight className="mt-1 h-5 w-5 text-usnee-text2" aria-hidden="true" /></div></Surface></button>;
}
