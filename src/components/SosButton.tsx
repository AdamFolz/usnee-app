import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Siren, Phone, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

// Always-available emergency call button. Lives above the bottom nav on every
// screen except the Add-entry flow (which has its own full-width action bar).
export function SosButton() {
  const location = useLocation();
  const emergencyContact = useAppStore((s) => s.settings.emergencyContact);
  const [open, setOpen] = useState(false);

  if (location.pathname === '/add') return null;

  const number = emergencyContact && emergencyContact.trim() ? emergencyContact.trim() : '103';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-3 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-usnee-danger text-white shadow-lg shadow-red-900/40 transition-transform active:scale-90"
        aria-label="SOS — вызвать помощь"
      >
        <Siren className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full space-y-3 bg-usnee-surface p-4 pb-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-usnee-danger">SOS</h2>
              <button onClick={() => setOpen(false)} className="text-usnee-text2" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-usnee-text2">
              Нужна помощь прямо сейчас? Звони — это бесплатно и анонимно.
            </p>
            <a
              href={`tel:${number}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-danger py-4 text-lg font-bold text-white transition-transform active:scale-95"
            >
              <Phone className="h-5 w-5" /> Позвонить {number}
            </a>
            {emergencyContact && emergencyContact.trim() && (
              <a
                href="tel:103"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-usnee-surface2 py-3 text-sm font-semibold text-usnee-text transition-transform active:scale-95"
              >
                <Phone className="h-4 w-4" /> Или скорая 103
              </a>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-usnee-surface2 py-3 text-sm font-medium text-usnee-text"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
}
