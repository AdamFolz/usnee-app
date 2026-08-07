import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Siren } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { DEFAULT_EMERGENCY_NUMBER } from '../contracts/safety';
import { SosSheet } from './sos';

/**
 * Always-available SOS trigger. Opens the honest SOS sheet: explicit
 * user-initiated tel: actions, offline checklist, local check-in timer.
 * Hidden on the /add flow (which has its own full-width action bar).
 */
export function SosButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const emergencyContact = useAppStore((s) => s.settings.emergencyContact);
  const [open, setOpen] = useState(false);

  if (location.pathname === '/add') return null;

  // settings.emergencyContact is a user-configured number. When it differs
  // from the regional emergency default, we treat it as a trusted contact.
  const trimmed = emergencyContact?.trim();
  const trustedContact = trimmed && trimmed !== DEFAULT_EMERGENCY_NUMBER ? trimmed : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-3 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-danger-gradient text-white shadow-sos transition-transform duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus focus-visible:ring-offset-2 focus-visible:ring-offset-usnee-bg active:scale-90 motion-reduce:transform-none"
        aria-label="SOS — экстренные действия"
        aria-haspopup="dialog"
      >
        <Siren className="h-6 w-6" aria-hidden="true" />
      </button>

      <SosSheet
        open={open}
        onClose={() => setOpen(false)}
        trustedContact={trustedContact}
        onOpenSafetyHub={() => {
          setOpen(false);
          navigate('/safety');
        }}
      />
    </>
  );
}
