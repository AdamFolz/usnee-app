import { HTMLAttributes } from 'react';
import { cx } from './utils';

export type SurfaceVariant = 'default' | 'raised' | 'glass' | 'interactive' | 'danger';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
}

const variants: Record<SurfaceVariant, string> = {
  default: 'border-usnee-border bg-usnee-surface',
  raised: 'border-usnee-borderStrong bg-usnee-surface2 shadow-card',
  glass: 'border-usnee-border bg-usnee-surface shadow-card',
  interactive: 'border-usnee-border bg-usnee-glass shadow-card transition-[transform,border-color,background-color,box-shadow] duration-normal ease-ui hover:-translate-y-1 hover:border-usnee-brand/50 hover:bg-usnee-glassStrong hover:shadow-hero active:scale-[.985] motion-reduce:transform-none',
  danger: 'border-usnee-danger/35 bg-usnee-danger/10 shadow-sos'
};

export function Surface({ variant = 'default', className, ...props }: SurfaceProps) {
  return <div className={cx('rounded-card border', variants[variant], className)} {...props} />;
}
