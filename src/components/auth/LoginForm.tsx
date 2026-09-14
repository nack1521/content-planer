'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { sendMagicLinkAction } from '@/app/actions/auth';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';

export function LoginForm() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setClientError(t('auth.invalidEmailMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendMagicLinkAction(trimmed, locale);
      if (result.success) {
        setIsSent(true);
      } else {
        setClientError(t('auth.errorGeneric'));
      }
    } catch {
      setClientError(t('auth.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Top Header: Brand & Language Switch */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-700 via-purple-600 to-orchid-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-900/30">
            CP
          </div>
          <span className="font-bold text-sm text-white tracking-tight">
            {t('app.title')}
          </span>
        </div>
        <LocaleSwitch variant="compact" />
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
          {/* Card Header */}
          <div className="space-y-2 text-center">
            <span className="inline-block text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
              {t('auth.ownerOnlyBadge')}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {t('auth.loginTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          {/* URL Error Feedback */}
          {errorParam === 'unauthorized' && (
            <div
              className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs sm:text-sm space-y-1"
              role="alert"
            >
              <span className="font-semibold block">{t('auth.unauthorizedTitle')}</span>
              <p className="text-rose-300/90 text-xs leading-relaxed">
                {t('auth.unauthorizedMessage')}
              </p>
            </div>
          )}

          {errorParam === 'auth_failed' && (
            <div
              className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-200 text-xs sm:text-sm"
              role="alert"
            >
              <span>{t('auth.errorGeneric')}</span>
            </div>
          )}

          {/* Form Content: Sent State vs Entry Form */}
          {isSent ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto shadow-inner">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {t('auth.magicLinkSentTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                  {t('auth.neutralSuccessMessage')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSent(false);
                  setEmail('');
                }}
                className="text-xs sm:text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email-input"
                  className="block text-xs sm:text-sm font-semibold text-slate-300"
                >
                  {t('auth.emailLabel')}
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>

              {clientError && (
                <p className="text-xs text-rose-400 font-medium">{clientError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-950 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>{t('auth.sending')}</span>
                ) : (
                  <span>{t('auth.sendMagicLink')}</span>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-slate-500">
        <span>{t('app.timezoneBadge')}</span>
      </footer>
    </div>
  );
}
