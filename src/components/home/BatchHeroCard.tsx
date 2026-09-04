import { AlertTriangle, ChevronRight, FlaskConical, Plus } from 'lucide-react';
import type { BatchHeroViewModel } from '../../utils/batchPresentation';
import { formatAmount } from '../../utils/batchPresentation';
import { Button, StatusBadge, Surface } from '../ui';

export interface BatchHeroCardProps {
  loading?: boolean;
  batch?: BatchHeroViewModel | null;
  malformed?: boolean;
  onOpenBatch: () => void;
  onRecordWithoutBatch?: () => void;
}

export function BatchHeroCard({
  loading = false,
  batch = null,
  malformed = false,
  onOpenBatch,
  onRecordWithoutBatch
}: BatchHeroCardProps) {
  if (loading) return <div role="status" aria-label="Загрузка партии" className="h-60 animate-pulse rounded-hero bg-usnee-surface motion-reduce:animate-none" />;
  if (malformed) return (
    <Surface variant="danger" className="p-5">
      <AlertTriangle className="h-6 w-6 text-usnee-danger" aria-hidden="true" />
      <h2 className="mt-3 text-title-lg">Не удалось рассчитать остаток</h2>
      <p className="mt-2 text-body-sm text-usnee-text2">Проверь данные активной партии.</p>
      <Button variant="secondary" className="mt-4 w-full" onClick={onOpenBatch}>Проверить партию</Button>
    </Surface>
  );
  if (!batch) return (
    <Surface variant="glass" className="p-5 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-usnee-glass"><FlaskConical className="h-6 w-6 text-usnee-brand" aria-hidden="true" /></div>
      <h2 className="mt-3 text-title-lg">Партии пока нет</h2>
      <p className="mt-2 text-body-sm text-usnee-text2">
        Создай партию, чтобы считать остаток и концентрацию. Запись без партии тоже возможна.
      </p>
      <Button className="mt-4 w-full" onClick={onOpenBatch}><Plus className="h-4 w-4" aria-hidden="true" />Создать партию</Button>
      {onRecordWithoutBatch && (
        <Button variant="ghost" className="mt-2 w-full" onClick={onRecordWithoutBatch}>Записать без партии</Button>
      )}
    </Surface>
  );
  return (
    <button type="button" onClick={onOpenBatch} className="group w-full rounded-hero text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus">
      <div className="ambient-sheen relative overflow-hidden rounded-hero bg-usnee-brand p-5 shadow-hero transition-[transform,box-shadow] duration-normal group-hover:-translate-y-1 group-hover:shadow-hero group-active:scale-[.99] motion-reduce:transform-none">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-label uppercase text-white/70">Остаток партии</p><h2 className="mt-1 truncate text-title-lg text-white">{batch.name}</h2></div>
          {batch.level !== 'normal' && <StatusBadge tone={batch.level === 'critical' ? 'failed' : 'warning'}>{batch.level === 'critical' ? 'Критический остаток' : 'Заканчивается'}</StatusBadge>}
        </div>
        <p className="mt-7 font-display text-display-xl font-extrabold tabular-nums text-white">{formatAmount(batch.remainingVolumeMl)} <span className="text-title-lg text-white/75">мл</span></p>
        <p className="mt-2 text-body-md text-white/75">≈ {formatAmount(batch.remainingMassMg)} мг · {formatAmount(batch.concentrationMgMl, 2)} мг/мл · {Math.round(batch.remainingPercent)}%</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-white/85" style={{ width: `${batch.remainingPercent}%` }} /></div>
        <div className="mt-4 flex items-center justify-between text-body-sm font-bold text-white"><span>Открыть партию</span><ChevronRight className="h-5 w-5" aria-hidden="true" /></div>
      </div>
    </button>
  );
}
