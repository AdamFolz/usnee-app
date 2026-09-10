import type { Batch } from '../../types';
import { parseRecordAmount } from '../../domain/record';
import { formatAmount } from '../../utils/batchPresentation';
import { Surface } from '../ui';

export interface AmountDisplayProps {
  value: string;
  unit: string;
  batch?: Batch | null;
  error?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export function AmountDisplay({ value, unit, batch, error, disabled, onChange }: AmountDisplayProps) {
  const amount = parseRecordAmount(value, unit, batch?.concentration);
  const remaining = batch && amount.calculatedMassMg !== undefined ? batch.remaining - amount.calculatedMassMg : undefined;
  return (
    <Surface variant="glass" className="p-5 text-center">
      <label htmlFor="record-amount" className="text-label uppercase text-usnee-text3">Количество</label>
      <input
        id="record-amount"
        aria-label="Количество"
        inputMode="decimal"
        enterKeyHint="done"
        value={value}
        readOnly={onChange === undefined}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={`0 ${unit}`}
        className="mt-1 w-full bg-transparent text-center font-display text-display-xl tabular-nums text-usnee-text outline-none placeholder:text-usnee-text3"
      />
      {amount.calculatedMassMg !== undefined && <p className="mt-2 text-body-md text-usnee-text2">≈ {formatAmount(amount.calculatedMassMg)} мг</p>}
      {remaining !== undefined && remaining >= 0 && <p className="mt-1 text-caption text-usnee-text3">После записи: ≈ {formatAmount(remaining)} мг · {formatAmount(remaining / batch!.concentration)} мл</p>}
      {error && <p role="alert" className="mt-3 text-body-sm text-usnee-danger">{error}</p>}
    </Surface>
  );
}
