import { Flame, Pill, Syringe, Wind, type LucideIcon } from 'lucide-react';

export interface MethodPickerProps {
  methods: Array<{ id: string; name: string; icon: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Заливка выбранной плитки (обычно substance.color). Без — usnee-brand. */
  accentColor?: string;
}

const METHOD_ICONS: Record<string, LucideIcon> = { Syringe, Flame, Pill, Wind };

export function MethodPicker({ methods, selectedId, onSelect, accentColor }: MethodPickerProps) {
  return (
    <div role="group" aria-label="Способ употребления" className="grid grid-cols-4 gap-2">
      {methods.map((method) => {
        const Icon = METHOD_ICONS[method.icon] ?? Pill;
        const selected = method.id === selectedId;
        return (
          <button
            key={method.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(method.id)}
            style={selected && accentColor ? { backgroundColor: accentColor } : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-all focus-visible:ring-2 focus-visible:ring-usnee-focus ${
              selected
                ? 'border-transparent bg-usnee-brand text-white ring-2 ring-usnee-brand scale-[1.04]'
                : 'border-usnee-border bg-usnee-surface text-usnee-text2'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-caption font-semibold leading-tight">{method.name}</span>
          </button>
        );
      })}
    </div>
  );
}
