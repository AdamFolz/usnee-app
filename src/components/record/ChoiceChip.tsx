import { ButtonHTMLAttributes } from 'react';
import { cx } from '../ui';
export function ChoiceChip({ selected, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) { return <button type="button" aria-pressed={selected} className={cx('min-h-12 rounded-full border px-4 text-body-sm font-bold focus-visible:ring-2 focus-visible:ring-usnee-focus', selected ? 'border-usnee-brand bg-usnee-brand/20 text-purple-200' : 'border-usnee-border bg-usnee-glass text-usnee-text2', className)} {...props} />; }
