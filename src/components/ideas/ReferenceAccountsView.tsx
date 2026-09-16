'use client';

import React, { useState, useTransition, useEffect, useMemo, useRef, useCallback } from "react";
import { Platform, ReferenceAccount } from "@/types/planner";
import {
  getReferenceAccountsAction,
  createReferenceAccountAction,
  updateReferenceAccountAction,
  deleteReferenceAccountAction,
  ReferenceAccountInput,
} from "@/app/actions/reference-accounts";
import { useLocale } from "@/context/LocaleContext";
import { IconPlus, IconSearch, IconSparkles } from "@/components/common/Icons";
import { getLocalizedErrorMessage } from "@/utils/errors";

const ALL_PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "facebook", "x"];

interface ReferenceAccountsViewProps {
  initialAccounts?: ReferenceAccount[];
  initialError?: string | null;
}

export function ReferenceAccountsView({
  initialAccounts,
  initialError,
}: ReferenceAccountsViewProps) {
  const { t } = useLocale();

  const [accounts, setAccounts] = useState<ReferenceAccount[]>(initialAccounts ?? []);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialAccounts && !initialError);

  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getReferenceAccountsAction();
      if (res.error) {
        setFetchError(res.error);
      } else {
        setAccounts(res.accounts);
        setFetchError(null);
      }
    } catch {
      setFetchError("service_error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (initialAccounts === undefined && !initialError) {
      getReferenceAccountsAction().then((res) => {
        if (!isMounted) return;
        if (res.error) {
          setFetchError(res.error);
        } else {
          setAccounts(res.accounts);
          setFetchError(null);
        }
        setIsLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [initialAccounts, initialError]);

  // Filters
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ReferenceAccount | null>(null);

  // Focus trap refs
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formLabel, setFormLabel] = useState("");
  const [formPlatform, setFormPlatform] = useState<Platform>("tiktok");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Focus trap & Escape key handling
  useEffect(() => {
    if (!modalOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    labelInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [modalOpen]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormLabel("");
    setFormPlatform("tiktok");
    setFormUrl("");
    setFormNotes("");
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (acc: ReferenceAccount) => {
    setEditingAccount(acc);
    setFormLabel(acc.account_label || "");
    setFormPlatform(acc.platform);
    setFormUrl(acc.url);
    setFormNotes(acc.notes || "");
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      setFormError(t("referenceAccounts.errors.labelRequired"));
      return;
    }
    if (!formUrl.trim().startsWith("http")) {
      setFormError(t("referenceAccounts.errors.urlInvalid"));
      return;
    }

    startTransition(async () => {
      const payload: ReferenceAccountInput = {
        account_label: formLabel.trim(),
        platform: formPlatform,
        url: formUrl.trim(),
        notes: formNotes.trim() || null,
      };

      if (editingAccount) {
        const res = await updateReferenceAccountAction(editingAccount.id, payload);
        if (!res.success) {
          setFormError(getLocalizedErrorMessage(t, res.error));
          return;
        }
      } else {
        const res = await createReferenceAccountAction(payload);
        if (!res.success) {
          setFormError(getLocalizedErrorMessage(t, res.error));
          return;
        }
      }

      handleCloseModal();
      await loadData();
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("referenceAccounts.confirmDelete"))) return;
    startTransition(async () => {
      const res = await deleteReferenceAccountAction(id);
      if (res.success) {
        handleCloseModal();
        await loadData();
      } else {
        setFormError(getLocalizedErrorMessage(t, res.error));
      }
    });
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchLabel = acc.account_label?.toLowerCase().includes(q) || false;
        const matchUrl = acc.url.toLowerCase().includes(q);
        const matchNotes = acc.notes?.toLowerCase().includes(q) || false;
        if (!matchLabel && !matchUrl && !matchNotes) return false;
      }

      if (platformFilter !== "all" && acc.platform !== platformFilter) return false;

      return true;
    });
  }, [accounts, search, platformFilter]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t("ideas.referenceAccountsTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t("ideas.referenceAccountsSubtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" size={16} />
          <span>{t("ideas.newReferenceAccount")}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <IconSearch className="w-4 h-4" size={16} />
            </div>
            <label htmlFor="ref-search-input" className="sr-only">
              {t("filters.searchPlaceholder")}
            </label>
            <input
              id="ref-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="ref-platform-filter" className="sr-only">
              {t("planner.allPlatforms")}
            </label>
            <select
              id="ref-platform-filter"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{t("planner.allPlatforms")}</option>
              {ALL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {t(`platform.${p}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          {t("ideas.loading")}
        </div>
      ) : fetchError ? (
        <div className="py-12 px-6 text-center bg-white rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto my-8 space-y-3">
          <p className="text-sm font-semibold text-rose-600">
            {t("ideas.loadError")}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
          >
            {t("recordModal.retry")}
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <IconSparkles className="w-6 h-6" size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {t("ideas.emptyAccountsTitle")}
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {t("ideas.emptyAccountsDescription")}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {t("ideas.newReferenceAccount")}
          </button>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100">
            <IconSearch className="w-6 h-6" size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {t("empty.filteredTitle")}
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {t("empty.filteredDescription")}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPlatformFilter("all");
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
          >
            {t("empty.resetFilterBtn")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-200 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-slate-900 truncate">
                      {acc.account_label || t("referenceAccounts.unnamed")}
                    </h3>
                    <span className="inline-block mt-0.5 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {t(`platform.${acc.platform}`)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(acc)}
                    aria-label={t("referenceAccounts.editAccount")}
                    className="text-xs text-slate-500 hover:text-purple-600 p-1 rounded hover:bg-slate-50 transition-colors"
                  >
                    {t("tasks.edit")}
                  </button>
                </div>

                {acc.notes && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {acc.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={acc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium truncate max-w-[200px]"
                >
                  {t("referenceAccounts.openUrl")} &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog with real Tab/Shift+Tab focus trap */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ref-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 id="ref-modal-title" className="text-base font-bold text-slate-900">
                {editingAccount
                  ? t("referenceAccounts.editTitle")
                  : t("referenceAccounts.createTitle")}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label={t("recordModal.close")}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1 cursor-pointer"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              {/* Label */}
              <div className="space-y-1">
                <label htmlFor="ref-label-input" className="text-xs font-semibold text-slate-700">
                  {t("referenceAccounts.fields.label")} *
                </label>
                <input
                  id="ref-label-input"
                  ref={labelInputRef}
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder={t("referenceAccounts.fields.labelPlaceholder")}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Platform */}
              <div className="space-y-1">
                <label htmlFor="ref-platform-select" className="text-xs font-semibold text-slate-700">
                  {t("referenceAccounts.fields.platform")} *
                </label>
                <select
                  id="ref-platform-select"
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value as Platform)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {t(`platform.${p}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div className="space-y-1">
                <label htmlFor="ref-url-input" className="text-xs font-semibold text-slate-700">
                  {t("referenceAccounts.fields.url")} *
                </label>
                <input
                  id="ref-url-input"
                  type="url"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder={t("referenceAccounts.fields.urlPlaceholder")}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label htmlFor="ref-notes-input" className="text-xs font-semibold text-slate-700">
                  {t("referenceAccounts.fields.notes")}
                </label>
                <textarea
                  id="ref-notes-input"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={t("referenceAccounts.fields.notesPlaceholder")}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {editingAccount ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(editingAccount.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {t("referenceAccounts.deleteAccount")}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    {t("recordModal.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? t("common.saving") : t("recordModal.save")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
