'use client';

import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileHeader } from './MobileHeader';
import { MobileNav } from './MobileNav';
import { useLocale } from '@/context/LocaleContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased selection:bg-purple-500 selection:text-white">
      {/* Desktop Persistent Sidebar */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Milestone 1 Notice Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 border-b border-purple-100/60 px-4 sm:px-6 py-2 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-600 shrink-0" />
            <span className="font-semibold text-purple-900">
              {t('previewNotice.milestoneBannerTitle')}:
            </span>
            <span className="truncate hidden sm:inline text-slate-600">
              {t('previewNotice.milestoneBannerDesc')}
            </span>
          </div>
          <span className="text-[10px] font-mono text-purple-700 font-semibold px-2 py-0.5 rounded bg-purple-100/80 shrink-0">
            M1 Active
          </span>
        </div>

        {/* Dynamic Page Surface */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
