import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { InlineNotice } from '../ui';
import { SAFETY_CALL_UNVERIFIED_RU } from '../../contracts/safety';

export interface TrustedContactActionProps {
  /** Configured trusted contact phone number. Component renders nothing without it. */
  contact?: string;
}

/**
 * User-initiated call to a trusted contact. Shown only when a contact is
 * actually configured — we never pretend a contact exists or was notified.
 */
export function TrustedContactAction({ contact }: TrustedContactActionProps) {
  const [attempted, setAttempted] = useState(false);
  const cleanContact = contact?.trim();

  if (!cleanContact) return null;

  return (
    <div className="space-y-2">
      <a
        href={`tel:${cleanContact}`}
        onClick={() => setAttempted(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-usnee-border bg-usnee-surface2 px-5 py-3 text-sm font-semibold text-usnee-text transition-[transform,background-color] duration-normal ease-ui hover:bg-usnee-surface3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus focus-visible:ring-offset-2 focus-visible:ring-offset-usnee-bg active:scale-[.97] motion-reduce:transform-none"
      >
        <PhoneCall className="h-4 w-4" aria-hidden="true" />
        Позвонить доверенному контакту · {cleanContact}
      </a>
      {attempted && (
        <InlineNotice tone="pending" title="Звонок не подтверждён">
          {SAFETY_CALL_UNVERIFIED_RU}
        </InlineNotice>
      )}
    </div>
  );
}
