import { BarChart3, History, Home, Plus, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cx } from './ui';

const navItems = [
  { path: '/', icon: Home, label: 'Главная', end: true },
  { path: '/history', icon: History, label: 'История' },
  { path: '/add', icon: Plus, label: 'Запись', primary: true },
  { path: '/stats', icon: BarChart3, label: 'Аналитика' },
  { path: '/profile', icon: UserRound, label: 'Профиль' }
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-[calc(.75rem+var(--safe-area-left))] pr-[calc(.75rem+var(--safe-area-right))] pb-[calc(.75rem+var(--safe-area-bottom))]"
    >
      <div className="pointer-events-auto mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 items-center rounded-[1.625rem] border border-usnee-border bg-usnee-surface/90 px-1 shadow-card backdrop-blur-glass">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={'end' in item ? item.end : undefined}
              aria-label={item.label}
              className={({ isActive }) =>
                cx(
                  'group relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-usnee-text3 transition-[color,transform,background-color] duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus active:scale-[.96] motion-reduce:transform-none',
                  isActive && !('primary' in item) && 'bg-usnee-glass text-usnee-text',
                  'primary' in item && '-translate-y-4 text-white'
                )
              }
            >
              {'primary' in item && (
                <span className="absolute grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-brand-gradient shadow-hero transition-transform duration-normal group-active:scale-95">
                  <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                </span>
              )}
              {!('primary' in item) && <Icon className="h-5 w-5" aria-hidden="true" />}
              <span className={cx('truncate text-[10px] font-bold', 'primary' in item && 'translate-y-[2.15rem]')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
