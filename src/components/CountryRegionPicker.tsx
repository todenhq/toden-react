'use client';

import React, { useMemo, useState } from 'react';
import { ChevronRight, Search } from './icons';
import { cn } from '../lib/utils';
import { CountryFlag } from './CountryFlag';
import { groupCountriesByRegion, regionCountryName, type Region } from '../lib/regions';
import { useText } from '../i18n';
import type { AnyCountry } from '../types/config';

/** Continent headers, from the text catalogue. */
const REGION_KEYS: Record<Region, string> = {
  Africa: 'selectDocument.region.africa',
  Europe: 'selectDocument.region.europe',
  Americas: 'selectDocument.region.americas',
  'Middle East': 'selectDocument.region.middleEast',
  'Asia & Pacific': 'selectDocument.region.asiaPacific',
  Other: 'selectDocument.region.other',
};

/**
 * Searchable, region-grouped country picker for the country-select step. Used
 * when a workflow offers many countries (Global Documents) — a flat 200-country
 * list is unusable, so this adds a pinned search box and continent headers over
 * a bounded scroll area. Big touch targets (this is a primary step, not a form
 * field), with SVG flags for cross-platform consistency.
 */
export function CountryRegionPicker({
  countries,
  selected,
  geoCountry,
  onPick,
}: {
  countries: string[];
  selected: string | null;
  /**
   * The visitor's IP country. Lifted out of its continent to the very top and
   * tagged, so the one country most likely to be theirs is the first thing they
   * see rather than something to scroll for.
   */
  geoCountry?: string | null;
  onPick: (country: AnyCountry) => void;
}) {
  const t = useText();
  const [query, setQuery] = useState('');
  const { pinned, groups } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? countries.filter(
          (c) => regionCountryName(c).toLowerCase().includes(q) || c.toLowerCase().includes(q),
        )
      : countries;
    const geo = geoCountry?.toUpperCase();
    // Still subject to the search: typing narrows to what was asked for rather
    // than keeping a row that does not match it.
    const hit = geo && visible.includes(geo) ? geo : null;
    return {
      pinned: hit,
      groups: groupCountriesByRegion(hit ? visible.filter((c) => c !== hit) : visible),
    };
  }, [countries, query, geoCountry]);

  return (
    // Fill the parent (the step body is flex-col h-full): search pinned, list
    // flexes to the remaining height with its own scroll.
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2 rounded-xl border border-input bg-background px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('selectDocument.country.search')}
          aria-label="Search countries"
          className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
      </div>

      {/* Out over the sheet body's p-6 (VerificationModal), so the scrollbar
          runs down the sheet's edge rather than beside the cards, and the
          list scrolls to the sheet's bottom instead of stopping above it. */}
      <div className="-mx-6 -mb-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        {pinned && (
          <button
            type="button"
            onClick={() => onPick(pinned as AnyCountry)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors',
              selected === pinned
                ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                : 'border-border hover:border-primary/40 hover:bg-muted/40',
            )}
          >
            <CountryFlag code={pinned} className="h-8 w-8" title={regionCountryName(pinned)} />
            <span className="flex-1 text-base font-medium">{regionCountryName(pinned)}</span>
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {t('selectDocument.country.yourLocation')}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
        {groups.length === 0 && !pinned ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('selectDocument.country.noResults')}</p>
        ) : (
          groups.map((group) => (
            <div key={group.region} className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {REGION_KEYS[group.region] ? t(REGION_KEYS[group.region]) : group.region}
              </p>
              <div className="flex flex-col gap-2">
                {group.countries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => onPick(c.code)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                      selected === c.code
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                  >
                    <CountryFlag code={c.code} className="h-8 w-8" title={c.name} />
                    <span className="flex-1 text-base font-medium">{c.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
