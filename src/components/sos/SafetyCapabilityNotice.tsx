import { InlineNotice } from '../ui';
import { SAFETY_DISCLOSURE_RU } from '../../contracts/safety';

/**
 * The honest capability disclosure. Always visible inside the SOS sheet:
 * USNEE never calls anyone automatically.
 */
export function SafetyCapabilityNotice() {
  return (
    <InlineNotice tone="info" title="Как работает SOS" data-testid="safety-capability-notice">
      {SAFETY_DISCLOSURE_RU}
    </InlineNotice>
  );
}
