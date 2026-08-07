import { HTMLAttributes } from 'react';
import { cx } from './utils';

export type StatusTone = 'synced' | 'offline' | 'pending' | 'warning' | 'active' | 'failed';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  dot?: boolean;
}

const tones: Record<StatusTone, string> = {
  synced: 'border-usnee-success/25 bg-usnee-success/10 text-usnee-success',
  offline: 'border-usnee-border bg-usnee-surface2 text-usnee-text2',
  pending: 'border-usnee-info/25 bg-usnee-info/10 text-usnee-info',
  warning: 'border-usnee-warning/25 bg-usnee-warning/10 text-usnee-warning',
  active: 'border-usnee-brand/30 bg-usnee-brand/12 text-purple-200',
  failed: 'border-usnee-danger/30 bg-usnee-danger/10 text-usnee-danger'
};

export function StatusBadge({ tone, dot = true, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cx('inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none', tones[tone], className)}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
