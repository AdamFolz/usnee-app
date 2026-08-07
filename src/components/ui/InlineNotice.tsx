import { HTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Info } from 'lucide-react';
import { cx } from './utils';

export type NoticeTone = 'info' | 'success' | 'pending' | 'danger';

export interface InlineNoticeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: NoticeTone;
  title: string;
}

const tones: Record<NoticeTone, string> = {
  info: 'border-usnee-info/25 bg-usnee-info/10 text-usnee-info',
  success: 'border-usnee-success/25 bg-usnee-success/10 text-usnee-success',
  pending: 'border-usnee-warning/25 bg-usnee-warning/10 text-usnee-warning',
  danger: 'border-usnee-danger/30 bg-usnee-danger/10 text-usnee-danger'
};

const icons = {
  info: Info,
  success: CheckCircle2,
  pending: Clock3,
  danger: AlertCircle
};

export function InlineNotice({ tone = 'info', title, className, children, ...props }: InlineNoticeProps) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-lg border p-3', tones[tone], className)}
      {...props}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-current">{title}</p>
        {children && <div className="mt-1 text-xs leading-relaxed text-usnee-text2">{children}</div>}
      </div>
    </div>
  );
}
