import { Delete } from 'lucide-react';
import { normalizeAmountInput } from '../../domain/record';
export function NumericKeypad({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const press = (key: string) => { if (key === 'back') onChange(value.slice(0, -1)); else onChange(normalizeAmountInput(`${value}${key}`)); };
  return <div className="grid grid-cols-3 gap-2" aria-label="Цифровая клавиатура">{['1','2','3','4','5','6','7','8','9',',','0','back'].map((key) => <button type="button" disabled={disabled} key={key} aria-label={key === 'back' ? 'Удалить цифру' : key === ',' ? 'Десятичная запятая' : key} onClick={() => press(key)} className="min-h-14 rounded-lg border border-usnee-border bg-usnee-glass text-title-lg font-bold active:scale-95 disabled:opacity-40">{key === 'back' ? <Delete className="mx-auto h-5 w-5" /> : key}</button>)}</div>;
}
