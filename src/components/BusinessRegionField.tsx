'use client';

// The registry region, for the countries that file companies per state or
// emirate (the US, India, Canada, the UAE). Shared by the name search and by
// registration-number entry when the workflow offers no search: the register is
// asked ONE region at a time, so the number alone does not name a company there.
import { useEffect, useState } from 'react';
import { CountryFlag } from './CountryFlag';
import { UiSelect } from './UiSelect';
import { Label } from './ui/label';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useText } from '../i18n';

export type BusinessRegion = { code: string; name: string };

/** The country's registry regions; empty when it has a single register. */
export function useBusinessRegions(country: string): BusinessRegion[] {
  const config = useVerificationConfig();
  const [regions, setRegions] = useState<BusinessRegion[]>([]);
  useEffect(() => {
    let cancelled = false;
    setRegions([]);
    if (!country) return undefined;
    config.api
      .businessRegions(country)
      .then((r) => {
        if (!cancelled) setRegions(r.regions ?? []);
      })
      // An empty list means "do not ask", which is also the safe answer when
      // the catalogue is unreachable: the register says so on its own.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [country, config.api]);
  return regions;
}

export function BusinessRegionField({
  country,
  regions,
  region,
  onRegion,
}: {
  country: string;
  regions: BusinessRegion[];
  region: string;
  onRegion: (code: string) => void;
}) {
  const t = useText();
  if (regions.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label htmlFor="business-region">{t('business.search.regionLabel')}</Label>
      {/* Searchable: fifty US states unfiltered is a scroll-and-hunt for a word
          the person already knows how to spell. The flag is the country's,
          because every option here belongs to it. */}
      <UiSelect
        id="business-region"
        value={region || undefined}
        options={regions.map((r) => ({
          value: r.code,
          label: r.name,
          icon: <CountryFlag code={country} className="h-4 w-4 shrink-0" />,
        }))}
        onChange={onRegion}
        searchable
        placeholder={t('business.search.regionPlaceholder')}
        aria-label="State or region of registration"
      />
    </div>
  );
}
