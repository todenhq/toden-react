'use client';

import React, { useEffect } from 'react';
import { CountrySummarySelect } from '../components/CountrySummarySelect';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useVerificationContext } from '../context/VerificationContext';
import { useText } from '../i18n';
import type { AnyCountry } from '../types/config';

/**
 * The country that issued the ID, at the top of the ID-type step: the
 * `combined` layout (lib/id-selection-layout.ts), in the summary row the
 * Proof of Address step uses. Changing it swaps the ID list beneath, as the
 * country step would have.
 *
 * It opens holding an answer rather than an empty field, since the list
 * under it needs a country to show anything: the workflow's own country when
 * it is on offer, else the visitor's, else the first offered. That pick is
 * marked automatic, as an IP guess is elsewhere.
 */
export function IdCountryField({ options }: { options: AnyCountry[] }) {
  const config = useVerificationConfig();
  const { state, dispatch } = useVerificationContext();
  const t = useText();
  const geo = config.serverConfig?.geoCountry?.toUpperCase() as AnyCountry | undefined;
  const initial =
    [config.country, geo].find((code): code is AnyCountry => !!code && options.includes(code)) ?? options[0];

  useEffect(() => {
    if (!state.selectedCountry && initial) dispatch({ type: 'SET_COUNTRY_AUTO', payload: initial });
  }, [state.selectedCountry, initial, dispatch]);

  return (
    <CountrySummarySelect
      countries={options}
      value={state.selectedCountry ?? initial ?? null}
      label={t('selectDocument.country.label')}
      geoCountry={geo}
      onPick={(code) => {
        if (code !== state.selectedCountry) dispatch({ type: 'SET_COUNTRY', payload: code as AnyCountry });
      }}
      copy={{
        placeholder: t('selectDocument.country.placeholder'),
        change: t('selectDocument.country.change'),
        choose: t('selectDocument.country.choose'),
        search: t('selectDocument.country.search'),
        noMatches: t('selectDocument.country.noResults'),
        selected: t('selectDocument.country.selected'),
        yourLocation: t('selectDocument.country.yourLocation'),
      }}
    />
  );
}
