'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MapPin, Search, X } from './icons';
import { cn } from '../lib/utils';
import { CountryFlag } from './CountryFlag';
import { DropdownSurface } from './DropdownSurface';
import { useDropdownAnchor } from '../lib/use-dropdown-anchor';
import { eventPathIncludes } from '../lib/event-path';
import { groupCountriesByRegion, regionCountryName } from '../lib/regions';
import { Drawer, DrawerContent, SheetHeader } from './ui/drawer';

/** At this width and above the list is a menu under the row; below it, a bottom sheet. */
const MENU_MIN_WIDTH = '(min-width: 640px)';

/** The words the control shows, from the caller's own text group. */
export interface CountrySummaryCopy {
  placeholder: string;
  change: string;
  choose: string;
  search: string;
  noMatches: string;
  selected: string;
  yourLocation: string;
}

/**
 * A country, picked from a summary row: the flag, a caption over the country,
 * and a Change pill. Used where the country is usually settled and only
 * sometimes changed: the Proof of Address step and the combined ID step.
 *
 * The menu is portaled to the dialog root through the shared anchor (as
 * BusinessCountrySelect's is) and searchable. Above the regions it pins the
 * current answer ("Selected") and the visitor's own country ("Your
 * location"), so neither is a hunt through two hundred rows. The search box
 * drives the list from the keyboard: arrows move, Enter picks, Escape closes.
 *
 * One country on offer, or a locked answer, is a settled fact: the row
 * without the pill.
 *
 * On a phone the list opens as a bottom sheet that can be dragged down (the
 * house drawer), as the mobile SDKs open it; on a wider screen, as the menu
 * under the row. Decided when it opens, at the modal's own breakpoint.
 */
export function CountrySummarySelect({
  countries,
  value,
  onPick,
  label,
  geoCountry,
  copy,
  disabled,
}: {
  countries: string[];
  value: string | null;
  onPick: (code: string) => void;
  /** The caption over the country: "Your address is in". */
  label: string;
  /** The visitor's own country, from their IP, pinned when on offer. */
  geoCountry?: string | null;
  copy: CountrySummaryCopy;
  /** Settled and not to be changed (a register that has answered). */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // A bottom sheet rather than a menu: a phone-width screen, at opening.
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const anchor = useDropdownAnchor(open, triggerRef, { width: 'trigger', menuRef });

  const q = query.trim().toLowerCase();
  const matches = (code: string) => !q || regionCountryName(code).toLowerCase().includes(q) || code.toLowerCase().includes(q);

  // The pins, then the regions: one flat order, which the keyboard walks.
  const pins = useMemo(() => {
    const list: Array<{ code: string; tag: string }> = [];
    if (value && countries.includes(value) && matches(value)) list.push({ code: value, tag: copy.selected });
    const geo = geoCountry?.toUpperCase();
    if (geo && geo !== value && countries.includes(geo) && matches(geo)) list.push({ code: geo, tag: copy.yourLocation });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, geoCountry, countries, q, copy.selected, copy.yourLocation]);
  const groups = useMemo(() => {
    const pinned = new Set(pins.map((p) => p.code));
    return groupCountriesByRegion(countries.filter((code) => matches(code) && !pinned.has(code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, q, pins]);
  const order = useMemo(
    () => [...pins.map((p) => p.code), ...groups.flatMap((g) => g.countries.map((c) => c.code))],
    [pins, groups],
  );

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const pick = (code: string) => {
    onPick(code);
    close();
    triggerRef.current?.focus();
  };

  // A new search starts from its first result.
  useEffect(() => setActive(0), [q]);

  // Open on the search box; close on an outside press. composedPath, not
  // e.target: the SDK renders in a shadow frame (lib/event-path.ts). The sheet
  // does neither: the drawer dismisses itself, and focusing the search there
  // would raise the keyboard over the list before anyone asked to type.
  useEffect(() => {
    if (!open || sheet) return;
    searchRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!eventPathIncludes(e, rootRef.current, menuRef.current)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
    // close is stable in effect: it only sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheet]);

  // Keep the active row in view as the arrows move it.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, order.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const code = order[active];
      if (code) pick(code);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
    }
  };

  const flag = (code: string | null, size: string) =>
    code ? (
      <CountryFlag code={code} className={cn(size, 'shrink-0 rounded-full ring-2 ring-background shadow-sm')} title={regionCountryName(code)} />
    ) : (
      <span aria-hidden className={cn(size, 'flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground')}>
        <MapPin className="h-4 w-4" />
      </span>
    );

  const text = (name: string, muted?: boolean) => (
    <span className="min-w-0 flex-1">
      <span className="block text-xs leading-4 text-muted-foreground">{label}</span>
      <span className={cn('block truncate text-[15px] font-semibold leading-5', muted && 'font-medium text-muted-foreground')}>
        {name}
      </span>
    </span>
  );

  const ROW = 'flex w-full items-center gap-3 rounded-2xl border bg-background px-3 py-2.5';

  // One country on offer, or a locked answer: a settled fact, no pill.
  if (countries.length === 1 || (disabled && value)) {
    const only = disabled && value ? value : countries[0]!;
    return (
      <div className={cn(ROW, 'border-border', disabled && 'bg-muted/30')}>
        {flag(only, 'h-10 w-10')}
        {text(regionCountryName(only))}
      </div>
    );
  }

  const option = (code: string, index: number, tag?: string) => {
    const selected = code === value;
    return (
      <div
        key={`${tag ?? 'all'}-${code}`}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={selected}
        data-index={index}
        onPointerMove={() => setActive(index)}
        onClick={() => pick(code)}
        className={cn(
          'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-base sm:text-sm',
          index === active && 'bg-accent',
          selected && 'font-medium',
        )}
      >
        <CountryFlag code={code} className="h-5 w-5 shrink-0" title={regionCountryName(code)} />
        <span className="truncate">{regionCountryName(code)}</span>
        {tag && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tag}
          </span>
        )}
      </div>
    );
  };

  let index = 0;
  // The search box over the list: the same in the menu and in the sheet.
  const body = (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder={copy.search}
          aria-label={copy.search}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={order.length > 0 ? `${listId}-${active}` : undefined}
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setQuery('');
              searchRef.current?.focus();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div id={listId} role="listbox" aria-label={label} className={cn('overflow-y-auto p-1.5', sheet && 'min-h-0 flex-1 overscroll-contain pb-6')} style={sheet ? undefined : { maxHeight: anchor.maxHeight }}>
        {order.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{copy.noMatches}</p>
        ) : (
          <>
            {pins.length > 0 && (
              <div className="mb-1 border-b border-border pb-1.5">{pins.map((p) => option(p.code, index++, p.tag))}</div>
            )}
            {groups.map((group) => (
              <div key={group.region} role="group" aria-label={group.region} className="mb-1 last:mb-0">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.region}
                </p>
                {group.countries.map((c) => option(c.code, index++))}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value ? regionCountryName(value) : copy.placeholder}`}
        onClick={() => {
          if (open) return close();
          setSheet(typeof window !== 'undefined' && !window.matchMedia(MENU_MIN_WIDTH).matches);
          setOpen(true);
        }}
        className={cn(
          ROW,
          'group text-left transition-[border-color,box-shadow,background-color] duration-150 motion-reduce:transition-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open ? 'border-primary ring-4 ring-primary/10' : 'border-border hover:border-primary/40 hover:bg-primary/[0.02]',
        )}
      >
        {flag(value, 'h-10 w-10')}
        {text(value ? regionCountryName(value) : copy.placeholder, !value)}
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-2 text-xs font-semibold text-primary">
          {value ? copy.change : copy.choose}
          <ChevronDown
            aria-hidden
            className={cn('h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
          />
        </span>
      </button>

      {/* Mounted for as long as this is a sheet and only switched closed, so
          the close button, a drag and an outside tap all slide it away. */}
      {sheet && (
        <Drawer open={open} direction="bottom" shouldScaleBackground={false} onOpenChange={(next) => !next && close()}>
          <DrawerContent direction="bottom" className="max-h-[85%]">
            <SheetHeader title={label} onClose={close} />
            {body}
          </DrawerContent>
        </Drawer>
      )}

      {open && !sheet && anchor.host && createPortal(
        <DropdownSurface menuRef={menuRef}>
          <div
            style={anchor.style}
            className="z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl animate-slide-up"
          >
            {body}
          </div>
        </DropdownSurface>,
        anchor.host,
      )}
    </div>
  );
}
