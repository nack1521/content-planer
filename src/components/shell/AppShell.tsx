'use client';

import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileHeader } from './MobileHeader';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased selection:bg-purple-500 selection:text-white">
      {/* Desktop Persistent Sidebar */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Dynamic Page Surface */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
