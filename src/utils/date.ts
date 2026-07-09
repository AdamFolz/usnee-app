import { format, isToday, isYesterday, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatTime(ts: number): string {
  return format(ts, 'HH:mm', { locale: ru });
}

export function formatDate(ts: number): string {
  return format(ts, 'dd MMM', { locale: ru });
}

export function formatDateTime(ts: number): string {
  if (isToday(ts)) return `Сегодня, ${formatTime(ts)}`;
  if (isYesterday(ts)) return `Вчера, ${formatTime(ts)}`;
  return format(ts, 'dd MMM, HH:mm', { locale: ru });
}

export function timeSince(ts: number): string {
  const now = Date.now();
  const mins = differenceInMinutes(now, ts);
  if (mins < 1) return 'Только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = differenceInHours(now, ts);
  if (hours < 24) return `${hours} ч назад`;
  const days = differenceInDays(now, ts);
  if (days < 7) return `${days} д назад`;
  return formatDate(ts);
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
