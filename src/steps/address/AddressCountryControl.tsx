'use client';

import React, { useMemo } from 'react';
import { CountrySummarySelect } from '../../components/CountrySummarySelect';
import { inferredCountry } from '../../lib/inferred-country';
import { poaOfferedCountries } from '../../lib/poa-country-gate';
import { useVerificationConfig } from '../../context/VerificationConfigContext';
import { useText } from '../../i18n';

/**
 * The Proof of Address step's country control, on every scope (the Didit PoA
 * model: the applicant names where the document is from, then uploads it).
 * The step owns the value and what a pick does (lib/poa-country-gate.ts): on
 * the address scope the pick is the flow's declared country, which also
 * drives the search filter, the map's opening view and the submission's
 * country; elsewhere it is the proof of address's own country, which need not
 * be the ID's.
 *
 * It offers the org's accepted list (proofOfAddress.countries, the server
 * refuses submissions outside it), else the whole world, in the shared
 * summary row (components/CountrySummarySelect.tsx), as the combined ID step
 * picks its country.
 */
export function AddressCountryControl({
  value,
  onPick,
  label,
}: {
  value: string | null;
  onPick: (code: string) => void;
  label: string;
}) {
  const config = useVerificationConfig();
  const t = useText();
  const offered = useMemo(
    () => poaOfferedCountries(config.proofOfAddress?.countries),
    [config.proofOfAddress?.countries],
  );
  return (
    <CountrySummarySelect
      countries={offered}
      value={value}
      onPick={onPick}
      label={label}
      geoCountry={inferredCountry(config.serverConfig?.geoCountry)}
      copy={{
        placeholder: t('proofOfAddress.country.placeholder'),
        change: t('proofOfAddress.country.change'),
        choose: t('proofOfAddress.country.choose'),
        search: t('proofOfAddress.country.search'),
        noMatches: t('proofOfAddress.country.noMatches'),
        selected: t('proofOfAddress.country.selected'),
        yourLocation: t('proofOfAddress.country.yourLocation'),
      }}
    />
  );
}
