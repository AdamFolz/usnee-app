import { ChevronDown } from 'lucide-react';
import { InlineNotice, Surface } from '../ui';
import {
  METHOD_GUIDANCE_DISCLOSURE,
  getMethodGuidance,
} from '../../constants/methodGuidance';

export interface MethodGuidanceProps {
  /** The chosen consumption method id (`inject`, `oral`, `sniff`, `smoke`). */
  methodId: string | null | undefined;
}

/**
 * Collapsible harm-reduction guidance for the selected method.
 *
 * - Renders nothing if the user has not picked a method, or the method has no
 *   curated guidance yet — we do not invent content for unknown ids.
 * - `<details>` is closed by default: the record screen keeps dose above the
 *   fold, guidance is opt-in reading below the save action.
 * - Static content from `constants/methodGuidance.ts`. No network. No telemetry.
 * - Includes a top-level disclosure so the surface is never mistaken for a
 *   medical guide.
 */
export function MethodGuidance({ methodId }: MethodGuidanceProps) {
  const guidance = getMethodGuidance(methodId);
  if (!guidance) return null;

  return (
    <Surface variant="raised" className="p-4" data-testid="method-guidance">
      <details className="group">
        <summary className="cursor-pointer list-none select-none">
          <span className="flex items-center justify-between">
            <span className="text-body font-bold text-usnee-text">Справка по способу</span>
            <ChevronDown className="h-5 w-5 text-usnee-text2 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="space-y-3 pt-3">
          <header>
            <h3 className="text-body font-bold text-usnee-text">{guidance.heading}</h3>
          </header>

          <ul className="space-y-2" aria-label="Общие правила снижения вреда">
            {guidance.items.map((line) => (
              <li key={line} className="flex gap-2 text-body-sm leading-relaxed text-usnee-text2">
                <span aria-hidden="true" className="select-none text-usnee-text3">
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p className="text-caption text-usnee-text3">{guidance.scopeNote}</p>

          <InlineNotice tone="info" title="Снижение вреда" data-testid="method-guidance-disclosure">
            {METHOD_GUIDANCE_DISCLOSURE}
          </InlineNotice>
        </div>
      </details>
    </Surface>
  );
}
