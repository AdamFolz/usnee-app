import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../constants/substances';
import type { Substance } from '../../types';

export interface SubstancePickerProps {
  substances: Substance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Активны только для строки «Свой вариант» (id 'custom'). */
  customName?: string;
  onCustomNameChange?: (value: string) => void;
}

const rowClass = (selected: boolean) =>
  `flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-usnee-focus ${
    selected ? 'bg-usnee-brand/15 ring-2 ring-usnee-brand' : 'bg-usnee-surface'
  }`;

export function SubstancePicker({
  substances,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  customName,
  onCustomNameChange
}: SubstancePickerProps) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? substances.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.aliases ?? []).some((a) => a.toLowerCase().includes(q))
      )
    : substances;
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: filtered.filter((s) => s.category === category)
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-3">
      <input
        id="substance-search"
        type="text"
        aria-label="Поиск вещества"
        placeholder="Название или алиас"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="min-h-12 w-full rounded-lg border border-usnee-border bg-usnee-surface px-4 text-body-sm text-usnee-text outline-none placeholder:text-usnee-text3 focus-visible:ring-2 focus-visible:ring-usnee-focus"
      />
      <div role="listbox" aria-label="Выбор вещества" className="space-y-3">
        {groups.map(({ category, items }) => (
          <section key={category} aria-label={CATEGORY_LABELS[category] ?? category} className="space-y-1">
            <p className="px-1 text-caption uppercase text-usnee-text3">{CATEGORY_LABELS[category] ?? category}</p>
            {items.map((substance) => {
              const selected = substance.id === selectedId;
              return (
                <button key={substance.id} type="button" role="option" aria-selected={selected} onClick={() => onSelect(substance.id)} className={rowClass(selected)}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: substance.color }} aria-hidden="true" />
                  <span className="text-body-sm font-semibold text-usnee-text">{substance.name}</span>
                  {substance.aliases && substance.aliases.length > 0 && (
                    <span className="truncate text-caption text-usnee-text3">{substance.aliases.join(', ')}</span>
                  )}
                </button>
              );
            })}
          </section>
        ))}
        <button type="button" role="option" aria-selected={selectedId === 'custom'} onClick={() => onSelect('custom')} className={rowClass(selectedId === 'custom')}>
          <span className="h-3 w-3 shrink-0 rounded-full border border-usnee-border" aria-hidden="true" />
          <span className="text-body-sm font-semibold text-usnee-text">{CATEGORY_LABELS.custom}</span>
        </button>
        {selectedId === 'custom' && (
          <div className="rounded-lg bg-usnee-surface p-3">
            <label className="mb-2 block text-caption text-usnee-text3" htmlFor="custom-substance-name">
              Название
            </label>
            <input
              id="custom-substance-name"
              type="text"
              value={customName ?? ''}
              onChange={(event) => onCustomNameChange?.(event.target.value)}
              placeholder="Что именно?"
              className="min-h-12 w-full rounded-lg border border-usnee-border bg-usnee-surface px-3 text-body-sm text-usnee-text outline-none placeholder:text-usnee-text3 focus-visible:ring-2 focus-visible:ring-usnee-focus"
            />
          </div>
        )}
      </div>
    </div>
  );
}
