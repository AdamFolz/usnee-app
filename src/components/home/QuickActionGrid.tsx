import { BarChart3, FlaskConical, Plus, ShieldCheck } from 'lucide-react';
import { cx, Surface } from '../ui';

export interface QuickActionGridProps { onRecord: () => void; onBatch: () => void; onAnalytics: () => void; onSafety: () => void; }
const actions = [
  ['Записать', Plus, 'record'], ['Партия', FlaskConical, 'batch'], ['Аналитика', BarChart3, 'analytics'], ['Safety Hub', ShieldCheck, 'safety']
] as const;
export function QuickActionGrid(props: QuickActionGridProps) {
  const callbacks = { record: props.onRecord, batch: props.onBatch, analytics: props.onAnalytics, safety: props.onSafety };
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{actions.map(([label, Icon, key]) => (
    <button key={key} type="button" onClick={callbacks[key]} className="rounded-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus">
      <Surface variant="interactive" className={cx('flex min-h-24 flex-col justify-between p-4', key === 'record' && 'border-usnee-brand/40 bg-usnee-brand/15')}>
        <Icon className={cx('h-5 w-5 text-usnee-text2', key === 'record' && 'text-purple-300')} aria-hidden="true" /><span className="text-body-sm font-bold">{label}</span>
      </Surface>
    </button>
  ))}</div>;
}
