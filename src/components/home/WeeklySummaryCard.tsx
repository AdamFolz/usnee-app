import { CalendarDays } from 'lucide-react';
import { Surface } from '../ui';
import type { ConsumptionEntry } from '../../types';
export function getWeekCount(entries: ConsumptionEntry[], now: number): number { const start = now - 7 * 24 * 60 * 60 * 1000; return entries.filter((entry) => entry.timestamp >= start && entry.timestamp <= now).length; }
export function WeeklySummaryCard({ entries, todayCount, now }: { entries: ConsumptionEntry[]; todayCount: number; now: number }) { const count = getWeekCount(entries, now); return <Surface variant="glass" className="p-4"><CalendarDays className="h-5 w-5 text-usnee-cyan" aria-hidden="true" /><p className="mt-3 text-label uppercase text-usnee-text3">За 7 дней</p><p className="mt-1 text-title-lg tabular-nums">{count} записей</p><p className="mt-1 text-caption text-usnee-text2">Сегодня: {todayCount}</p></Surface>; }
