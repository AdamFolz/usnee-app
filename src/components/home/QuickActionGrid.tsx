import { BarChart3, FlaskConical, ShieldCheck } from 'lucide-react';
import { cx, Surface } from '../ui';

export interface QuickActionGridProps {
  onBatch: () => void;
  onAnalytics: () => void;
  onSafety: () => void;
}

const actions = [
  ['Партия', FlaskConical, 'batch'] as const,
  ['Аналитика', BarChart3, 'analytics'] as const,
  ['Безопасность', ShieldCheck, 'safety'] as const
];

export function QuickActionGrid(props: QuickActionGridProps) {
  const callbacks = { batch: props.onBatch, analytics: props.onAnalytics, safety: props.onSafety };
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="home-quick-actions">
      {actions.map(([label, Icon, key]) => (
        <button
          key={key}
          type="button"
          onClick={callbacks[key]}
          className="rounded-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
        >
          <Surface variant="interactive" className={cx('flex min-h-[4.25rem] flex-col justify-between gap-2 p-3')}>
            <Icon className="h-5 w-5 text-usnee-text2" aria-hidden="true" />
            <span className="text-caption font-bold">{label}</span>
          </Surface>
        </button>
      ))}
    </div>
  );
}
