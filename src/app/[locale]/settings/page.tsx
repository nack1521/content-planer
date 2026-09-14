'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { signOutAction } from '@/app/actions/auth';
import { getPreferencesAction, updateDefaultPlatformsAction } from '@/app/actions/preferences';
import { IconSettings, IconPlanner, IconClock, IconLogOut } from '@/components/common/Icons';
import { UserPreferences } from '@/utils/supabase/preferences';
import { Platform } from '@/types/planner';

const AVAILABLE_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'x'];

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPreferencesAction().then((prefs) => {
      if (isMounted && prefs) {
        setPreferences(prefs);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction(locale);
    });
  };

  const handleTogglePlatform = (platform: Platform) => {
    const current = preferences?.default_platforms || [];
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];

    setPreferences((prev) => (prev ? { ...prev, default_platforms: next } : null));

    startTransition(async () => {
      const ok = await updateDefaultPlatformsAction(next);
      if (ok) {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      }
    });
  };

  const defaultPlatforms = preferences?.default_platforms || [];

  return (
    <div className="py-8 px-2 sm:px-4 max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
            <IconSettings className="w-5 h-5" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t('settings.title')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        {/* Setting Items */}
        <div className="space-y-4 text-sm">
          {/* Language Setting */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 block text-sm">
                {t('settings.languageLabel')}
              </span>
              <span className="text-xs text-slate-500">
                {t('settings.languageDesc')}
              </span>
            </div>
            <LocaleSwitch variant="full" />
          </div>

          {/* Timezone Setting */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 block text-sm">
                {t('settings.timezoneLabel')}
              </span>
              <span className="text-xs text-slate-500">
                {t('settings.timezoneDesc')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
              <IconClock className="w-3.5 h-3.5" size={14} />
              <span>{preferences?.timezone || t('settings.timezoneValue')}</span>
            </div>
          </div>

          {/* Default Platforms Setting */}
          <div className="py-2 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block text-sm">
                  {t('settings.defaultPlatformsLabel')}
                </span>
                <span className="text-xs text-slate-500">
                  {t('settings.defaultPlatformsDesc')}
                </span>
              </div>
              {savedNotice && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {t('settings.saved')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isSelected = defaultPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handleTogglePlatform(platform)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t(`platforms.${platform}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Out Action Row */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 block text-sm">
                {t('auth.signOut')}
              </span>
              <span className="text-xs text-slate-500">
                {t('auth.ownerOnlyBadge')}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <IconLogOut className="w-3.5 h-3.5" size={14} />
              <span>{isPending ? t('auth.signingOut') : t('auth.signOut')}</span>
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/${locale}/planner`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <IconPlanner className="w-4 h-4" size={16} />
            <span>{t('settings.backToPlanner')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
