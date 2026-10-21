'use client';

import React, { useState, useEffect } from 'react';
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
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingPlatforms, setIsSavingPlatforms] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutAction(locale);
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleTogglePlatform = async (platform: Platform) => {
    // Disable or serialize platform updates while saving
    if (isSavingPlatforms) return;

    const previous = preferences?.default_platforms || [];
    const next = previous.includes(platform)
      ? previous.filter((p) => p !== platform)
      : [...previous, platform];

    // Optimistic update
    setPreferences((prev) => (prev ? { ...prev, default_platforms: next } : null));
    setIsSavingPlatforms(true);
    setSaveError(null);
    setSavedNotice(false);

    try {
      const ok = await updateDefaultPlatformsAction(next);
      if (ok) {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      } else {
        // Revert optimistic state and show error notice
        setPreferences((prev) => (prev ? { ...prev, default_platforms: previous } : null));
        setSaveError(t('settings.saveError'));
        setTimeout(() => setSaveError(null), 4000);
      }
    } catch {
      // Revert optimistic state on exception
      setPreferences((prev) => (prev ? { ...prev, default_platforms: previous } : null));
      setSaveError(t('settings.saveError'));
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setIsSavingPlatforms(false);
    }
  };

  const defaultPlatforms = preferences?.default_platforms || [];

  return (
    <div className="py-8 px-2 sm:px-4 max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-[#F0E6E3] shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-[#F0E6E3] pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#F5E4E8] text-[#A13F5B] flex items-center justify-center border border-[#E8CCD2]">
            <IconSettings className="w-5 h-5" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2D2526]">
              {t('settings.title')}
            </h2>
            <p className="text-xs text-[#746365]">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        {/* Setting Items */}
        <div className="space-y-4 text-sm">
          {/* Language Setting */}
          <div className="flex items-center justify-between py-2 border-b border-[#F0E6E3]">
            <div>
              <span className="font-semibold text-[#2D2526] block text-sm">
                {t('settings.languageLabel')}
              </span>
              <span className="text-xs text-[#746365]">
                {t('settings.languageDesc')}
              </span>
            </div>
            <LocaleSwitch variant="full" />
          </div>

          {/* Timezone Setting */}
          <div className="flex items-center justify-between py-2 border-b border-[#F0E6E3]">
            <div>
              <span className="font-semibold text-[#2D2526] block text-sm">
                {t('settings.timezoneLabel')}
              </span>
              <span className="text-xs text-[#746365]">
                {t('settings.timezoneDesc')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#A13F5B] bg-[#F5E4E8] px-3 py-1.5 rounded-lg border border-[#E8CCD2]">
              <IconClock className="w-3.5 h-3.5" size={14} />
              <span>{preferences?.timezone || t('settings.timezoneValue')}</span>
            </div>
          </div>

          {/* Default Platforms Setting */}
          <div className="py-2 border-b border-[#F0E6E3] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#2D2526] block text-sm">
                  {t('settings.defaultPlatformsLabel')}
                </span>
                <span className="text-xs text-[#746365]">
                  {t('settings.defaultPlatformsDesc')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {savedNotice && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {t('settings.saved')}
                  </span>
                )}
                {saveError && (
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    {saveError}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isSelected = defaultPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handleTogglePlatform(platform)}
                    disabled={isSavingPlatforms}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isSavingPlatforms ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-[#A13F5B] text-white border-[#A13F5B] shadow-xs'
                        : 'bg-[#FBF7F5] text-[#2D2526] border-[#E8CCD2] hover:bg-[#F5E4E8]'
                    }`}
                  >
                    {t(`platform.${platform}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Out Action Row */}
          <div className="flex items-center justify-between py-2 border-b border-[#F0E6E3]">
            <div>
              <span className="font-semibold text-[#2D2526] block text-sm">
                {t('auth.signOut')}
              </span>
              <span className="text-xs text-[#746365]">
                {t('auth.ownerOnlyBadge')}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <IconLogOut className="w-3.5 h-3.5" size={14} />
              <span>{isSigningOut ? t('auth.signingOut') : t('auth.signOut')}</span>
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/${locale}/planner`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#2D2526] bg-[#FBF7F5] hover:bg-[#F5E4E8] border-[#E8CCD2] rounded-lg transition-colors cursor-pointer"
          >
            <IconPlanner className="w-4 h-4" size={16} />
            <span>{t('settings.backToPlanner')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
