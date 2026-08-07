import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './utils';

export interface TopBarProps {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  action?: ReactNode;
  className?: string;
}

export function TopBar({ title, eyebrow, onBack, action, className }: TopBarProps) {
  return (
    <header className={cx('flex min-h-14 items-center gap-3', className)}>
      {onBack && (
        <IconButton onClick={onBack} aria-label="Назад" className="shrink-0">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-label uppercase text-usnee-text3">{eyebrow}</p>}
        <h1 className="truncate font-display text-title-xl font-bold text-usnee-text">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
