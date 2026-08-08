import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './utils';
import { registerTelegramBackHandler } from '../../integrations/telegram';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(focusableSelector);
    window.requestAnimationFrame(() => firstFocusable?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const unregisterTelegramBack = registerTelegramBackHandler(onClose);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      unregisterTelegramBack();
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center pb-[var(--safe-area-bottom,0px)]"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(
          'animate-sheet-in relative z-10 flex max-h-[min(88dvh,calc(100dvh-var(--safe-area-top,0px)-var(--safe-area-bottom,0px)-3rem))] w-full max-w-lg flex-col overflow-hidden rounded-t-hero border border-usnee-borderStrong bg-usnee-surface shadow-card',
          className
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-usnee-borderStrong" aria-hidden="true" />
        <div className="flex shrink-0 items-start gap-4 px-5 pb-3 pt-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-title-xl font-bold text-usnee-text">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-body-sm text-usnee-text2">
                {description}
              </p>
            )}
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть" className="shrink-0">
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-usnee-border bg-usnee-surface2 px-5 pb-[calc(1rem+var(--safe-area-bottom,0px))] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
