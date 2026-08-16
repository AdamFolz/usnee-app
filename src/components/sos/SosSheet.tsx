import { BottomSheet } from '../ui';
import { SafetyCapabilityNotice } from './SafetyCapabilityNotice';
import { EmergencyCallAction } from './EmergencyCallAction';
import { TrustedContactAction } from './TrustedContactAction';
import { EmergencyChecklist } from './EmergencyChecklist';
import { LocalCheckInTimer } from './LocalCheckInTimer';

export interface SosSheetProps {
  open: boolean;
  onClose: () => void;
  /** Trusted contact from settings; the action is hidden when absent. */
  trustedContact?: string;
  /** Navigate to the Safety Hub page. */
  onOpenSafetyHub: () => void;
}

/**
 * The honest SOS sheet. Everything here is user-initiated and local:
 * explicit tel: actions, an offline checklist, a foreground-only check-in
 * timer, and a link to the Safety Hub. No automatic escalation is promised.
 */
export function SosSheet({ open, onClose, trustedContact, onOpenSafetyHub }: SosSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="SOS"
      description="Экстренные действия. Всё запускается только вами."
    >
      <div className="space-y-4 pb-2">
        <SafetyCapabilityNotice />
        <EmergencyCallAction />
        <TrustedContactAction contact={trustedContact} />
        <EmergencyChecklist />
        <LocalCheckInTimer />
        <button
          type="button"
          onClick={onOpenSafetyHub}
          className="flex min-h-12 w-full items-center justify-center rounded-md border border-usnee-border bg-usnee-surface px-5 py-3 text-sm font-semibold text-usnee-text transition-colors duration-normal ease-ui hover:bg-usnee-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus focus-visible:ring-offset-2 focus-visible:ring-offset-usnee-bg"
        >
          Открыть безопасность
        </button>
      </div>
    </BottomSheet>
  );
}
