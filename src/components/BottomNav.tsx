import { History, NotebookText, Plus, ScrollText, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cx } from './ui';
import { hapticSelection } from '../integrations/telegram';

const navItems = [
  { path: '/', icon: NotebookText, label: 'Дневник', end: true },
  { path: '/history', icon: History, label: 'Журнал' },
  { path: '/add', icon: Plus, label: 'Запись', primary: true },
  { path: '/progress', icon: ScrollText, label: 'Выписка' },
  { path: '/profile', icon: UserRound, label: 'Профиль' }
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-[calc(.75rem+var(--safe-area-left))] pr-[calc(.75rem+var(--safe-area-right))] pb-[calc(.75rem+var(--safe-area-bottom))]"
    >
      <div className="pointer-events-auto relative mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 rounded-[1.125rem] border border-usnee-border bg-usnee-surface px-1 shadow-card">
        <span className="paper-grain pointer-events-none absolute inset-0 overflow-hidden rounded-[1.125rem]" aria-hidden="true" />
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
                  'group relative z-[1] flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-[color,background-color] duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus',
                  isActive && !isPrimary && 'bg-usnee-brand/12 text-usnee-brand',
                  isPrimary && 'text-usnee-text'
                )
              }
            >
              {isPrimary ? (
                <span className="absolute -top-4 grid h-14 w-14 place-items-center rounded-[0.875rem] border border-usnee-borderStrong bg-usnee-brand text-white shadow-hero transition-transform duration-normal ease-ui group-active:scale-95 motion-reduce:transform-none">
                  <Icon className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
                </span>
              ) : (
                <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              )}
              <span
                className={cx(
                  'truncate text-[10px] font-semibold leading-none tracking-[.04em]',
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
