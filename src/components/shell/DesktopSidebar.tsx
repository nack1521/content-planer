'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { LocaleSwitch } from './LocaleSwitch';
import {
  IconPlanner,
  IconCalendar,
  IconLightbulb,
  IconSettings,
  IconClock,
} from '@/components/common/Icons';

export function DesktopSidebar() {
  const { t, locale } = useLocale();
  const pathname = usePathname();

  const navItems = [
    {
      id: 'planner',
      label: t('nav.planner'),
      href: `/${locale}/planner`,
      icon: IconPlanner,
      active: pathname.includes('/planner') || pathname === `/${locale}`,
    },
    {
      id: 'calendar',
      label: t('nav.calendar'),
      href: `/${locale}/calendar`,
      icon: IconCalendar,
      active: pathname.includes('/calendar'),
    },
    {
      id: 'ideas',
      label: t('nav.ideas'),
      href: `/${locale}/ideas`,
      icon: IconLightbulb,
      active: pathname.includes('/ideas'),
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      href: `/${locale}/settings`,
      icon: IconSettings,
      active: pathname.includes('/settings'),
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-slate-950 text-slate-200 border-r border-slate-800/80 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-orchid-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-900/30">
            CP
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>{t('app.title')}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {t('app.personalWorkspace')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5" aria-label={t('nav.mainNavAria')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                item.active
                  ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    item.active ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                  size={20}
                />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info & Locale Switch */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">{t('common.currentLocale')}</span>
          <LocaleSwitch variant="compact" />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <IconClock className="w-3.5 h-3.5 text-purple-400 shrink-0" size={14} />
          <span className="truncate">{t('app.timezoneBadge')}</span>
        </div>
      </div>
    </aside>
  );
}
