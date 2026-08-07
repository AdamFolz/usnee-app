import { ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Mobile-first accessible confirmation dialog using the shared sheet behavior. */
export function Dialog(props: DialogProps) {
  return <BottomSheet {...props} className="sm:mb-6 sm:rounded-hero" />;
}
