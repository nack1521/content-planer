'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import {
  IconPlanner,
  IconCalendar,
  IconLightbulb,
  IconSettings,
} from '@/components/common/Icons';

export function MobileNav() {
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
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-slate-400 py-1.5 px-3 flex justify-around items-center select-none"
      aria-label={t('nav.mobileNavAria')}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              item.active ? 'text-purple-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" size={20} />
            <span className="truncate max-w-[70px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
