import type { Batch, ConsumptionEntry } from '../../types';
import { parseRecordAmount } from '../../domain/record';
import { formatAmount } from '../../utils/batchPresentation';
import { Surface } from '../ui';
import { METHODS } from '../../constants/methods';
import { SUBSTANCES } from '../../constants/substances';
import { TRIGGERS } from '../../constants/triggers';

interface RecordSummaryProps {
  /** Either a QuickRecordDraft preview or an already-persisted entry. */
  draft?: {
    substanceId?: string | null;
    substanceName?: string;
    methodId?: string | null;
    methodName?: string;
    amountInput?: string;
    amountUnit?: string;
    alone?: boolean;
    notes?: string;
    triggerId?: string | null;
    triggerName?: string;
    qualityNote?: string;
    pulse?: number | '';
    missedShot?: boolean;
    fentanylTestResult?: 'positive' | 'negative' | 'inconclusive' | null;
    methodDetails?: Record<string, unknown>;
    occurredAt?: number;
  };
  entry?: ConsumptionEntry;
  batch?: Batch | null;
}

function formatTime(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export function RecordSummary({ draft, entry, batch }: RecordSummaryProps) {
  // Normalise both shapes so the component works for both the in-progress
  // Quick Record preview and the already-persisted entry detail sheet.
  const substanceName =
    draft?.substanceName ||
    entry?.substanceName ||
    SUBSTANCES.find((s) => s.id === (entry?.substanceId ?? draft?.substanceId))?.name ||
    entry?.substanceId ||
    '—';
  const methodName =
    draft?.methodName ||
    entry?.methodName ||
    METHODS.find((m) => m.id === (entry?.methodId ?? draft?.methodId))?.name ||
    '—';
  const amountInput = draft?.amountInput ?? (entry ? String(entry.dose) : '');
  const amountUnit = draft?.amountUnit ?? entry?.doseUnit ?? '';
  const amount = parseRecordAmount(amountInput, amountUnit, batch?.concentration);
  const alone = draft?.alone ?? entry?.alone ?? true;
  const notes = draft?.notes ?? entry?.notes;
  const methodDetails = draft?.methodDetails ?? entry?.methodDetails ?? {};
  const triggerId = draft?.triggerId ?? entry?.triggerId;
  const triggerName =
    draft?.triggerName ||
    entry?.triggerName ||
    TRIGGERS.find((t) => t.id === triggerId)?.name ||
    (triggerId === 'custom' ? entry?.customTrigger : undefined);
  const quality = draft?.qualityNote ?? entry?.qualityNote;
  const pulse = draft?.pulse !== undefined && draft.pulse !== '' ? draft.pulse : entry?.pulse;
  const missedShot = draft?.missedShot ?? entry?.missedShot ?? false;
  const fentanyl = draft?.fentanylTestResult ?? entry?.fentanylTestResult;
  const occurredAt = draft?.occurredAt ?? entry?.timestamp;

  const fentanylLabel =
    fentanyl === 'positive'
      ? 'Положительно'
      : fentanyl === 'negative'
        ? 'Отрицательно'
        : fentanyl === 'inconclusive'
          ? 'Неоднозначно'
          : 'Не проверял';

  return (
    <Surface className="space-y-3 p-4">
      <Row label="Вещество" value={substanceName} />
      <Row label="Способ" value={methodName} />
      <Row label="Количество" value={`${amountInput || '—'} ${amountUnit || ''}`.trim()} />
      {amount.calculatedMassMg !== undefined && (
        <Row label="Расчётная масса" value={`≈ ${formatAmount(amount.calculatedMassMg)} мг`} />
      )}
      {batch && <Row label="Партия" value={batch.name} />}
      <Row label="Время" value={formatTime(occurredAt)} />
      <Row label="Компания" value={alone ? 'Один' : 'Не один'} />
      {triggerName && <Row label="Причина" value={triggerName} />}
      {quality && <Row label="Качество" value={quality} />}
      {pulse !== undefined && <Row label="Пульс" value={`${pulse} уд/мин`} />}
      <Row label="Промах" value={missedShot ? 'Да' : 'Нет'} />
      {fentanyl && <Row label="Тест на фентанил" value={fentanylLabel} />}

      {Object.entries(methodDetails).length > 0 && (
        <div className="space-y-1 border-t border-usnee-border pt-3">
          <p className="text-caption uppercase text-usnee-text3">Детали способа</p>
          {Object.entries(methodDetails).map(([key, value]) => {
            if (value === undefined || value === '' || value === null) return null;
            const display = typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : String(value);
            return <Row key={key} label={methodDetailLabel(key)} value={display} />;
          })}
        </div>
      )}

      {notes && (
        <div className="border-t border-usnee-border pt-3">
          <p className="text-caption uppercase text-usnee-text3">Заметка</p>
          <p className="mt-1 text-body-sm text-usnee-text">{notes}</p>
        </div>
      )}
    </Surface>
  );
}

function methodDetailLabel(key: string): string {
  const labels: Record<string, string> = {
    route: 'Способ введения',
    site: 'Место',
    device: 'Устройство',
    dose: 'Доза',
    doseUnit: 'Единица',
    volume: 'Объём',
    stomach: 'Желудок',
    missed: 'Промах'
  };
  return labels[key] ?? key;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-body-sm">
      <span className="text-usnee-text2">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

export default RecordSummary;
