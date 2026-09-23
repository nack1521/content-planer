'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ContentItem } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { formatBangkokDateShort } from '@/utils/date';
import { IconSearch, IconX, IconChevronDown, IconCheck } from '@/components/common/Icons';
import { filterAndRankContentItems, formatContentItemLabel } from '@/utils/taskContentSearch';

export interface TaskContentComboboxProps {
  id?: string;
  value: string; // contentItem.id or ''
  onChange: (contentItemId: string) => void;
  contentItems: ContentItem[];
  disabled?: boolean;
}

interface ComboboxOption {
  id: string; // '' for none
  title: string;
  sourceNumber?: number | null;
  status?: string;
  publishAt?: string | null;
  isNone?: boolean;
}

export function TaskContentCombobox({
  id = 'task-content-select',
  value,
  onChange,
  contentItems,
  disabled = false,
}: TaskContentComboboxProps) {
  const { t, locale } = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    return contentItems.find((item) => item.id === value);
  }, [contentItems, value]);

  // Filter and rank content items client-side
  const filteredItems = useMemo(() => {
    return filterAndRankContentItems(contentItems, searchQuery, locale);
  }, [contentItems, searchQuery, locale]);

  // Build options list for listbox:
  // When no search query is active, include "None" (independent task) as option 0.
  // When query is active, include "None" if it matches keywords like none/standalone/เดี่ยว.
  const options = useMemo<ComboboxOption[]>(() => {
    const list: ComboboxOption[] = [];
    const trimmedQuery = searchQuery.trim().toLowerCase();

    const noneMatches =
      !trimmedQuery ||
      trimmedQuery === 'none' ||
      trimmedQuery === 'standalone' ||
      trimmedQuery.includes('เดี่ยว') ||
      trimmedQuery.includes('ไม่เชื่อม');

    if (noneMatches) {
      list.push({
        id: '',
        title: t('tasks.fields.none'),
        isNone: true,
      });
    }

    for (const item of filteredItems) {
      list.push({
        id: item.id,
        title: item.title,
        sourceNumber: item.source_number,
        status: item.status,
        publishAt: item.publish_at,
        isNone: false,
      });
    }

    return list;
  }, [filteredItems, searchQuery, t]);

  // Derive safe clamped active index during render without triggering cascading renders
  const clampedActiveIndex = useMemo(() => {
    if (!isOpen || options.length === 0) return -1;
    if (activeIndex >= 0 && activeIndex < options.length) return activeIndex;
    const selectedIdx = options.findIndex((opt) => opt.id === value);
    return selectedIdx >= 0 ? selectedIdx : 0;
  }, [isOpen, options, activeIndex, value]);

  // Scroll active option into view when active index changes
  useEffect(() => {
    if (isOpen && clampedActiveIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[clampedActiveIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [clampedActiveIndex, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const handleSelectOption = useCallback(
    (optId: string) => {
      onChange(optId);
      setIsOpen(false);
      setSearchQuery('');
      setActiveIndex(-1);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSearchQuery('');
      setActiveIndex(-1);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (options.length > 0) {
          const current = clampedActiveIndex >= 0 ? clampedActiveIndex : 0;
          setActiveIndex((current + 1) % options.length);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (options.length > 0) {
          const current = clampedActiveIndex >= 0 ? clampedActiveIndex : 0;
          setActiveIndex((current - 1 + options.length) % options.length);
        }
        break;
      }
      case 'Enter': {
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          if (clampedActiveIndex >= 0 && clampedActiveIndex < options.length) {
            handleSelectOption(options[clampedActiveIndex].id);
          }
        }
        break;
      }
      case 'Escape': {
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          setSearchQuery('');
          setActiveIndex(-1);
        }
        break;
      }
      case 'Tab': {
        if (isOpen) {
          setIsOpen(false);
          setSearchQuery('');
          setActiveIndex(-1);
        }
        break;
      }
      default:
        break;
    }
  };

  // Determine what is displayed in the input field
  const inputValue = isOpen
    ? searchQuery
    : selectedItem
      ? formatContentItemLabel(selectedItem)
      : '';

  const activeOptionId =
    isOpen && clampedActiveIndex >= 0 && options[clampedActiveIndex]
      ? `task-content-option-${options[clampedActiveIndex].id || 'none'}`
      : undefined;

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {/* Combobox Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          <IconSearch className="w-4 h-4" />
        </div>

        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="task-content-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          value={inputValue}
          placeholder={t('tasks.combobox.placeholder')}
          autoComplete="off"
          onFocus={(e) => {
            if (!disabled) {
              setIsOpen(true);
              e.target.select();
            }
          }}
          onClick={() => {
            if (!disabled && !isOpen) {
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-16 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-colors"
        />

        {/* Clear & Dropdown Action Controls */}
        <div className="absolute right-2 flex items-center gap-1">
          {value ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClear}
              aria-label={t('tasks.combobox.clear')}
              title={t('tasks.combobox.clear')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            aria-label={t('tasks.combobox.toggle')}
            title={t('tasks.combobox.toggle')}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
          >
            <IconChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Selected Content Metadata Preview Card */}
      {selectedItem && (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {selectedItem.source_number != null && (
              <span className="font-mono font-semibold px-1.5 py-0.5 bg-slate-200/80 text-slate-700 rounded text-[11px] shrink-0">
                #{selectedItem.source_number}
              </span>
            )}
            <span className="font-medium text-slate-800 truncate">
              {selectedItem.title}
            </span>
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 font-medium rounded text-[10px] shrink-0">
              {t(`status.${selectedItem.status}`)}
            </span>
            {selectedItem.publish_at && (
              <span className="text-[11px] text-slate-500 shrink-0 hidden sm:inline">
                {formatBangkokDateShort(selectedItem.publish_at, locale)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            aria-label={t('tasks.combobox.clear')}
            title={t('tasks.combobox.clear')}
            className="text-slate-400 hover:text-rose-600 text-xs font-semibold px-1.5 py-0.5 rounded cursor-pointer shrink-0 transition-colors disabled:opacity-50"
          >
            {t('tasks.combobox.clear')}
          </button>
        </div>
      )}

      {/* Dropdown Listbox */}
      {isOpen && (
        <ul
          id="task-content-listbox"
          ref={listboxRef}
          role="listbox"
          aria-label={t('tasks.fields.linkedContent')}
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 sm:max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 overscroll-contain text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-100"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-xs text-slate-500 text-center select-none">
              {t('tasks.combobox.noResults')}
            </li>
          ) : (
            options.map((opt, index) => {
              const isSelected = opt.id === value;
              const isHighlighted = index === clampedActiveIndex;

              return (
                <li
                  key={opt.id || 'none'}
                  id={`task-content-option-${opt.id || 'none'}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? 'bg-purple-50 text-purple-900'
                      : isSelected
                        ? 'bg-slate-50 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.isNone ? (
                      <span className="text-slate-500 italic">
                        {opt.title}
                      </span>
                    ) : (
                      <>
                        {opt.sourceNumber != null && (
                          <span className="font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] shrink-0">
                            #{opt.sourceNumber}
                          </span>
                        )}
                        <span className="truncate">{opt.title}</span>
                        {opt.status && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] shrink-0 font-normal">
                            {t(`status.${opt.status}`)}
                          </span>
                        )}
                        {opt.publishAt && (
                          <span className="text-[11px] text-slate-400 shrink-0 font-normal hidden sm:inline">
                            {formatBangkokDateShort(opt.publishAt, locale)}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {isSelected && (
                    <span className="text-purple-600 shrink-0">
                      <IconCheck className="w-4 h-4" />
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
