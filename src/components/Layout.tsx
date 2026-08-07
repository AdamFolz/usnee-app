import { ReactNode } from 'react';
import { AppShell } from './AppShell';

interface LayoutProps {
  children: ReactNode;
}

/** @deprecated Use AppShell for new composition. Kept for route compatibility. */
export function Layout({ children }: LayoutProps) {
  return <AppShell>{children}</AppShell>;
}
