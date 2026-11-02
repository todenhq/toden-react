import type { BusinessProductDef } from './business';
import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';

// Country-aware guidance for the registration-number input. Nigeria's registry
// (CAC) prefixes every number by entity type — the provider rejects a number
// whose prefix is missing or separated from the digits — so NG gets explicit
// prefix guidance AND format validation. Other registries get a generic tip.

export interface RegistrationHint {
  placeholder: string;
  /** Guidance rendered beneath the input (null = nothing to show). */
  tip: string | null;
  /** Format check for the typed value (null = only non-empty is required). */
  isValidFormat: ((value: string) => boolean) | null;
  /** Inline error when isValidFormat fails. */
  formatError: string | null;
}

const NG_PREFIX_RE = /^(RC|BN|IT|LP|LLP)\d+$/i;

// Countries whose English name takes a definite article ("the United States").
const THE_COUNTRIES = new Set([
  'US', 'GB', 'AE', 'NL', 'PH', 'CZ', 'GM', 'BS', 'MV', 'CD', 'CF', 'DO', 'KM', 'MH', 'SB', 'CG',
]);

function countryName(code: string): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
    return THE_COUNTRIES.has(code.toUpperCase()) ? `the ${name}` : name;
  } catch {
    return code;
  }
}

export function registrationNumberHint(
  country: string,
  productDef: BusinessProductDef,
  t: TextFn = defaultText,
): RegistrationHint {
  // TIN-keyed products keep their own placeholder/format (not a registry number).
  if (productDef.inputLabel === 'TIN') {
    return {
      placeholder: productDef.placeholder,
      tip: t('business.registration.tipTin'),
      isValidFormat: null,
      formatError: null,
    };
  }

  if (country === 'NG') {
    return {
      placeholder: t('business.registration.placeholderNigeria'),
      tip: t('business.registration.tipNigeria'),
      isValidFormat: (value) => NG_PREFIX_RE.test(value.trim()),
      formatError: t('business.registration.errorNigeria'),
    };
  }

  // Registry-verified per-country guidance (examples from the provider's
  // sample requests, formats confirmed against the registries: Kenya BRS
  // certificates carry PVT-<code>; South Africa CIPC prints YYYY/NNNNNN/NN
  // but the lookup consumes it without slashes). Placeholders/tips only — no
  // format is enforced outside Nigeria.
  const cc = country.toUpperCase();
  const example = COUNTRY_EXAMPLES[cc];
  const tipKey = COUNTRY_TIPS[cc];
  return {
    placeholder: example
      ? t('business.registration.placeholderExample', { example })
      : t('business.registration.placeholderGeneric'),
    tip: tipKey
      ? t(tipKey)
      : t('business.registration.tipGeneric', { country: countryName(country) }),
    isValidFormat: null,
    formatError: null,
  };
}

const COUNTRY_EXAMPLES: Record<string, string> = {
  // Ghana's Office of the Registrar of Companies: CS (company), BN (business
  // name), PL (public company).
  GH: 'CS043840225',
  KE: 'PVT-JZUA6Z663',
  ZA: '201133333323',
};

/** Text keys of the registry-confirmed per-country tips. */
const COUNTRY_TIPS: Record<string, string> = {
  GH: 'business.registration.tipGhana',
  KE: 'business.registration.tipKenya',
  ZA: 'business.registration.tipSouthAfrica',
};
