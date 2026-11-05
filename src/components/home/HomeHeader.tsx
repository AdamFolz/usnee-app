import { ReactNode } from 'react';

export function getGreeting(hour: number): string {
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 17) return 'Добрый день';
  if (hour < 22) return 'Добрый вечер';
  return 'Доброй ночи';
}

function formatDay(now: number): string {
  return new Date(now).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
}

export function HomeHeader({ now, status }: { now: number; status: ReactNode }) {
  return (
    <header className="pr-14">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-semibold uppercase tracking-[.2em] text-usnee-text3">USNEE</p>
        {status}
      </div>
      <p className="mt-4 text-caption uppercase tracking-[.14em] text-usnee-text3 capitalize">{formatDay(now)}</p>
      <h1 className="display mt-1 text-title-xl text-usnee-text">{getGreeting(new Date(now).getHours())}</h1>
      <p className="mt-1.5 max-w-[16rem] text-body-sm text-usnee-text2">Записи на этом телефоне. Сеть не нужна.</p>
    </header>
  );
}
