'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { LocaleSwitch } from './LocaleSwitch';
import { NavigationPending } from './NavigationPending';
import { signOutAction } from '@/app/actions/auth';
import {
  IconPlanner,
  IconTasks,
  IconCalendar,
  IconLightbulb,
  IconSettings,
  IconClock,
  IconLogOut,
} from '@/components/common/Icons';

export function DesktopSidebar() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction(locale);
    });
  };

  const navItems = [
    {
      id: 'planner',
      label: t('nav.planner'),
      href: `/${locale}/planner`,
      icon: IconPlanner,
      active: pathname.includes('/planner') || pathname === `/${locale}`,
    },
    {
      id: 'tasks',
      label: t('nav.tasks'),
      href: `/${locale}/tasks`,
      icon: IconTasks,
      active: pathname.includes('/tasks'),
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
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#FBF7F5] text-[#2D2526] border-r border-[#F0E6E3] sticky top-0 h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#F0E6E3] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8D324C] via-[#A13F5B] to-[#C26880] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#A13F5B]/30">
            CP
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#2D2526] flex items-center gap-1.5">
              <span>{t('app.title')}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#A13F5B]" />
            </h1>
            <p className="text-[11px] text-[#746365] font-medium">
              {t('app.personalWorkspace')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5" aria-label={t('nav.mainNavAria')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                item.active
                  ? 'bg-[#F5E4E8] text-[#A13F5B] border border-[#E8CCD2]'
                  : 'text-[#746365] hover:text-[#2D2526] hover:bg-[#F5E4E8]/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    item.active ? 'text-[#A13F5B]' : 'text-[#746365] group-hover:text-[#2D2526]'
                  }`}
                  size={20}
                />
                <span>{item.label}</span>
              </div>
              <NavigationPending variant="desktop" />
            </Link>
          );
        })}
      </nav>

      {/* Footer Info & Actions */}
      <div className="p-4 border-t border-[#F0E6E3] space-y-3 bg-[#FBF7F5] shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#746365] font-medium">{t('common.currentLocale')}</span>
          <LocaleSwitch variant="compact" />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#746365] font-mono bg-[#F5E4E8]/60 px-2.5 py-1.5 rounded-lg border border-[#E8CCD2]">
          <IconClock className="w-3.5 h-3.5 text-[#A13F5B] shrink-0" size={14} />
          <span className="truncate">{t('app.timezoneBadge')}</span>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#746365] hover:text-[#A13F5B] hover:bg-[#F5E4E8] rounded-lg border border-[#E8CCD2] hover:border-[#E8CCD2] transition-all cursor-pointer disabled:opacity-50"
        >
          <IconLogOut className="w-4 h-4" size={16} />
          <span>{isPending ? t('auth.signingOut') : t('auth.signOut')}</span>
        </button>
      </div>
    </aside>
  );
}
