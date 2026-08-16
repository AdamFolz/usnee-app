import { useState } from 'react';
import { Phone } from 'lucide-react';
import { InlineNotice } from '../ui';
import {
  SAFETY_CALL_UNVERIFIED_RU,
  EMERGENCY_NUMBER_REGION_NOTE_RU,
  DEFAULT_EMERGENCY_NUMBER
} from '../../contracts/safety';

export interface EmergencyCallActionProps {
  /** The emergency service number to dial. Defaults to the regional default. */
  number?: string;
}

/**
 * User-initiated emergency call. Renders a real tel: link — the call starts
 * only after the user taps it and confirms in the phone app. After the tap we
 * honestly say that USNEE cannot verify whether the call happened.
 */
export function EmergencyCallAction({ number = DEFAULT_EMERGENCY_NUMBER }: EmergencyCallActionProps) {
  const [attempted, setAttempted] = useState(false);
  const cleanNumber = number.trim() || DEFAULT_EMERGENCY_NUMBER;

  return (
    <div className="space-y-2">
      <a
        href={`tel:${cleanNumber}`}
        onClick={() => setAttempted(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-md border border-transparent bg-usnee-danger px-6 py-3 text-base font-bold text-white shadow-sos transition-transform duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus focus-visible:ring-offset-2 focus-visible:ring-offset-usnee-bg active:scale-[.97] motion-reduce:transform-none"
      >
        <Phone className="h-5 w-5" aria-hidden="true" />
        Позвонить в экстренную службу · {cleanNumber}
      </a>
      {cleanNumber === DEFAULT_EMERGENCY_NUMBER && (
        <p className="text-xs leading-relaxed text-usnee-text2">{EMERGENCY_NUMBER_REGION_NOTE_RU}</p>
      )}
      {attempted && (
        <InlineNotice tone="pending" title="Звонок не подтверждён">
          {SAFETY_CALL_UNVERIFIED_RU}
        </InlineNotice>
      )}
    </div>
  );
}
