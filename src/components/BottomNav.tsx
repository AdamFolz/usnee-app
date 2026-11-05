import { BarChart3, History, Home, Plus, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cx } from './ui';
import { hapticSelection } from '../integrations/telegram';

const navItems = [
  { path: '/', icon: Home, label: 'Главная', end: true },
  { path: '/history', icon: History, label: 'История' },
  { path: '/add', icon: Plus, label: 'Запись', primary: true },
  { path: '/progress', icon: BarChart3, label: 'Прогресс' },
  { path: '/profile', icon: UserRound, label: 'Профиль' }
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-[calc(.75rem+var(--safe-area-left))] pr-[calc(.75rem+var(--safe-area-right))] pb-[calc(.75rem+var(--safe-area-bottom))]"
    >
      <div className="pointer-events-auto mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 rounded-[1.625rem] border border-usnee-border bg-usnee-surface px-1 shadow-card">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isPrimary = 'primary' in item;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={'end' in item ? item.end : undefined}
              aria-label={item.label}
              onClick={hapticSelection}
              className={({ isActive }) =>
                cx(
                  'group relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-[color,background-color] duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus',
                  isActive && !isPrimary && 'bg-usnee-brand/15 text-usnee-brand',
                  isPrimary && 'text-white'
                )
              }
            >
              {isPrimary ? (
                <span className="absolute -top-4 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-usnee-brand text-white shadow-hero transition-transform duration-normal ease-ui group-active:scale-95 motion-reduce:transform-none">
                  <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                </span>
              ) : (
                <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              )}
              <span
                className={cx(
                  'truncate text-[10px] font-bold leading-none',
                  isPrimary && 'absolute bottom-1.5'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
