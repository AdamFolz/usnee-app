import type { Batch } from '../../types';
import type { QuickRecordDraft } from '../../domain/record';
import { parseRecordAmount } from '../../domain/record';
import { formatAmount } from '../../utils/batchPresentation';
import { Surface } from '../ui';
export function RecordSummary({ draft, batch }: { draft: QuickRecordDraft; batch?: Batch | null }) { const amount = parseRecordAmount(draft.amountInput, draft.amountUnit, batch?.concentration); return <Surface className="space-y-3 p-4"><Row label="Вещество" value={draft.substanceName || draft.substanceId || '—'} /><Row label="Способ" value={draft.methodName || draft.methodId || '—'} /><Row label="Количество" value={`${draft.amountInput} ${draft.amountUnit}`} />{amount.calculatedMassMg !== undefined && <Row label="Расчётная масса" value={`≈ ${formatAmount(amount.calculatedMassMg)} мг`} />}{batch && <Row label="Партия" value={batch.name} />}<Row label="Компания" value={draft.alone ? 'Один' : 'Не один'} /></Surface>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-body-sm"><span className="text-usnee-text2">{label}</span><span className="text-right font-bold">{value}</span></div>; }
