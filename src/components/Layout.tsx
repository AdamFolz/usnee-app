import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { PanicButton } from './PanicButton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-full flex-col bg-usnee-bg">
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-4">
        {children}
      </main>
      <PanicButton />
      <BottomNav />
    </div>
  );
}
