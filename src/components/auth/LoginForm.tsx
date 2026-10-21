'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { sendMagicLinkAction, signInWithPasswordAction } from '@/app/actions/auth';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';

export function LoginForm() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<'password' | 'link'>('password');
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

    if (method === 'password' && !password) {
      setClientError(t('auth.passwordRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (method === 'password') {
        const result = await signInWithPasswordAction(trimmed, password);
        if (result.success) {
          window.location.replace(`/${locale}/planner`);
          return;
        }
        setClientError(result.error === 'invalid_credentials'
          ? t('auth.invalidCredentials')
          : t('auth.passwordErrorGeneric'));
      } else {
        const result = await sendMagicLinkAction(trimmed, locale);
        if (result.success) {
          setIsSent(true);
        } else {
          setClientError(t('auth.errorGeneric'));
        }
      }
    } catch {
      setClientError(method === 'password' ? t('auth.passwordErrorGeneric') : t('auth.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F5] flex flex-col justify-between p-4 sm:p-6 text-[#2D2526]">
      {/* Top Header: Brand & Language Switch */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8D324C] via-[#A13F5B] to-[#C26880] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#A13F5B]/30">
            CP
          </div>
          <span className="font-bold text-sm text-[#2D2526] tracking-tight">
            {t('app.title')}
          </span>
        </div>
        <LocaleSwitch variant="compact" />
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white border border-[#F0E6E3] rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
          {/* Card Header */}
          <div className="space-y-2 text-center">
            <span className="inline-block text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#F5E4E8] text-[#A13F5B] border border-[#E8CCD2]">
              {t('auth.ownerOnlyBadge')}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2D2526]">
              {t('auth.loginTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[#746365]">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          {/* URL Error Feedback */}
          {errorParam === 'unauthorized' && (
            <div
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm space-y-1"
              role="alert"
            >
              <span className="font-semibold block">{t('auth.unauthorizedTitle')}</span>
              <p className="text-rose-700 text-xs leading-relaxed">
                {t('auth.unauthorizedMessage')}
              </p>
            </div>
          )}

          {errorParam === 'auth_failed' && (
            <div
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm"
              role="alert"
            >
              <span>{t('auth.errorGeneric')}</span>
            </div>
          )}

          {/* Form Content: Sent State vs Entry Form */}
          {isSent ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F5E4E8] text-[#A13F5B] border border-[#E8CCD2] flex items-center justify-center mx-auto shadow-inner">
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
                <h2 className="text-base sm:text-lg font-bold text-[#2D2526]">
                  {t('auth.magicLinkSentTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-[#746365] leading-relaxed max-w-sm mx-auto">
                  {t('auth.neutralSuccessMessage')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSent(false);
                  setEmail('');
                }}
                className="text-xs sm:text-sm font-medium text-[#A13F5B] hover:text-[#8D324C] transition-colors cursor-pointer"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="sr-only">{t('auth.signInMethod')}</legend>
                <button
                  type="button"
                  aria-pressed={method === 'password'}
                  disabled={isSubmitting}
                  onClick={() => {
                    setMethod('password');
                    setClientError(null);
                    setPassword('');
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A13F5B] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${method === 'password' ? 'border-[#A13F5B] bg-[#A13F5B] text-white' : 'border-[#E8CCD2] bg-[#FBF7F5] text-[#746365] hover:bg-[#F5E4E8]'}`}
                >
                  {t('auth.passwordMethod')}
                </button>
                <button
                  type="button"
                  aria-pressed={method === 'link'}
                  disabled={isSubmitting}
                  onClick={() => {
                    setMethod('link');
                    setClientError(null);
                    setPassword('');
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A13F5B] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${method === 'link' ? 'border-[#A13F5B] bg-[#A13F5B] text-white' : 'border-[#E8CCD2] bg-[#FBF7F5] text-[#746365] hover:bg-[#F5E4E8]'}`}
                >
                  {t('auth.emailLinkMethod')}
                </button>
              </fieldset>
              <div className="space-y-1.5">
                <label
                  htmlFor="email-input"
                  className="block text-sm font-semibold text-[#2D2526]"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#9C8B8E] text-[#2D2526] placeholder:text-[#746365] text-base focus:outline-none focus:ring-2 focus:ring-[#A13F5B] focus:border-[#A13F5B] transition-colors"
                />
              </div>

              {method === 'password' && (
                <div className="space-y-1.5">
                  <label htmlFor="password-input" className="block text-sm font-semibold text-[#2D2526]">
                    {t('auth.passwordLabel')}
                  </label>
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#9C8B8E] text-[#2D2526] text-base focus:outline-none focus:ring-2 focus:ring-[#A13F5B] focus:border-[#A13F5B] transition-colors"
                  />
                </div>
              )}

              {clientError && (
                <p role="alert" className="text-sm text-rose-600 font-medium">{clientError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#A13F5B] hover:bg-[#8D324C] active:bg-[#78283E] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>{method === 'password' ? t('auth.signingIn') : t('auth.sending')}</span>
                ) : (
                  <span>{method === 'password' ? t('auth.signInWithPassword') : t('auth.sendMagicLink')}</span>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-[#746365]">
        <span>{t('app.timezoneBadge')}</span>
      </footer>
    </div>
  );
}
