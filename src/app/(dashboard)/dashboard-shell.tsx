'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
