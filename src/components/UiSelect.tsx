'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from './icons';

import { cn } from '../lib/utils';
import { useDropdownAnchor } from '../lib/use-dropdown-anchor';
import { eventPathIncludes } from '../lib/event-path';
import { PickerSurface, pickerListProps, usePickerSheet } from './PickerSurface';

// A plain single-choice select — the web counterpart of the RN and Flutter
// SDKs' UiSelect, so a field rendered as a dropdown on a phone is a dropdown
// here too rather than a column of tappable cards.
//
// Deliberately NOT shadcn's Radix Select: it portals to document.body, and
// Radix Dialog sets `pointer-events: none` there while the modal is open, so
// the list becomes unclickable and taps fall through to whatever sits behind
// it. This anchors into the dialog root instead. See lib/use-dropdown-anchor.

export interface UiSelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading visual (e.g. a currency's flag). */
  icon?: React.ReactNode;
}

export interface UiSelectProps<T extends string> {
  id?: string;
  value: T | undefined;
  options: UiSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** False renders it inert — e.g. locked once a document is attached. */
  enabled?: boolean;
  /**
   * Show a filter box above the options.
   *
   * Worth it past roughly a dozen: fifty US states in an unfiltered list is a
   * scroll-and-hunt, and the thing being picked is a word the person already
   * knows how to spell.
   */
  searchable?: boolean;
  'aria-label'?: string;
  /** The sheet's heading on a phone, what is being picked; else the label or placeholder. */
  title?: string;
}

export function UiSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  enabled = true,
  searchable = false,
  'aria-label': ariaLabel,
  title,
}: UiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchor = useDropdownAnchor(open, triggerRef, { width: 'trigger', menuRef });
  // A bottom sheet on a phone, as the mobile SDKs open it; a menu otherwise.
  const sheet = usePickerSheet();

  const selected = options.find((o) => o.value === value);
  const shown = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  // Cleared on close, and focused on open: reopening should not land you in
  // someone else's half-typed filter.
  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    // Not in the sheet: focusing there raises the keyboard over the list
    // before anyone asked to type.
    if (searchable && !sheet) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, searchable, sheet]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      // composedPath, not e.target: the SDK renders in a shadow frame and a
      // document listener sees retargeted events (see lib/event-path.ts). The
      // menu is portaled out of rootRef, so it needs its own test.
      if (eventPathIncludes(e, rootRef.current, menuRef.current)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // The sheet takes its own outside taps (the backdrop) and drags; a
    // document listener would read a drag on its handle as a tap outside.
    if (!sheet) document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, sheet]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={!enabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-12 w-full items-center gap-2.5 rounded-xl border border-input bg-background px-3 text-left text-sm transition-colors',
          'hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selected && 'text-muted-foreground',
        )}
      >
        {selected?.icon}
        <span className="flex-1 truncate">{selected?.label ?? placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </button>

      <PickerSurface
        sheet={sheet}
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? ariaLabel ?? placeholder}
        menuRef={menuRef}
        anchor={anchor}
        role="listbox"
      >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                aria-label="Filter options"
                className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
              />
            </div>
          )}
          <div {...pickerListProps(sheet, anchor.maxHeight, 'p-1.5')}>
            {shown.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matches</p>
            )}
            {shown.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                  o.value === value && 'bg-primary/5 font-medium',
                )}
              >
                {o.icon}
                <span className="flex-1 truncate">{o.label}</span>
                {o.value === value && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
              </button>
            ))}
          </div>
      </PickerSurface>
    </div>
  );
}
