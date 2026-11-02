// ---------------------------------------------------------------------------
// Business (KYB) product catalog + flow helpers
//
// Mirrors the server's business-products catalog (kyc-core
// src/lib/business-products.ts) for display purposes only — labels and input
// hints. The server remains the source of truth: an unknown/unoffered product
// is rejected at POST /verify with `product_unsupported`.
// ---------------------------------------------------------------------------

import type { KeyPersonRole, SubjectType, WorkflowBusinessConfig } from '../types/business';
import { regionOf } from './regions';
import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';
import { configScope, type WorkflowScope } from './scope';

export interface BusinessProductDef {
  key: string;
  label: string;
  /** What the user types — drives the input label/placeholder. */
  inputLabel: string;
  placeholder: string;
  /** Countries offering this product; absent = every supported country. */
  countries?: string[];
}

export const DEFAULT_BUSINESS_PRODUCT = 'business';

export const BUSINESS_PRODUCTS: readonly BusinessProductDef[] = [
  {
    key: 'business',
    label: 'Business verification',
    inputLabel: 'Registration number',
    placeholder: 'e.g. RC0000000',
  },
  {
    key: 'business-address',
    label: 'Business Address',
    inputLabel: 'Registration number',
    placeholder: 'e.g. 201133333323',
    countries: ['ZA'],
  },
  {
    key: 'business-filings',
    label: 'Company Filings',
    inputLabel: 'Registration number',
    placeholder: 'e.g. CI-ABJ-03-2023-B17-00120',
    countries: ['CI'],
  },
  {
    key: 'business-tax',
    label: 'Business + Tax ID',
    inputLabel: 'Registration number',
    placeholder: 'e.g. RC0000000',
    countries: ['NG'],
  },
  {
    key: 'business-taxid',
    label: 'Tax ID',
    inputLabel: 'Registration number',
    placeholder: 'e.g. RC0000000',
    countries: ['NG'],
  },
  {
    key: 'business-tin',
    label: 'TIN',
    inputLabel: 'TIN',
    placeholder: 'e.g. 01234567-0001',
    countries: ['NG'],
  },
];

/** Display definition for a product key (unknown keys get a generic fallback). */
export function getBusinessProductDef(key: string): BusinessProductDef {
  return (
    BUSINESS_PRODUCTS.find((p) => p.key === key) ?? {
      key,
      label: key,
      inputLabel: 'Registration number',
      placeholder: 'Enter your registration number',
    }
  );
}

/** The product keys a business workflow offers (default product when unset). */
export function businessProductsFor(business: WorkflowBusinessConfig | undefined): string[] {
  const products = business?.products;
  return products && products.length > 0 ? products : [DEFAULT_BUSINESS_PRODUCT];
}

/**
 * The products offered for one picked country — the configured list narrowed
 * by each product's country availability, with the global default product as
 * the backstop (mirrors the server's businessProductsForCountry).
 */
export function businessProductsForCountry(
  business: WorkflowBusinessConfig | undefined,
  country: string,
): string[] {
  const offered = businessProductsFor(business).filter((key) => {
    const def = BUSINESS_PRODUCTS.find((p) => p.key === key);
    // A key this build does not know is HIDDEN, never offered everywhere: the
    // server rejects a wrong-country pick at verify (product_unsupported), so
    // over-offering dead-ends the applicant, while hiding degrades to the
    // standard lookup until the SDK updates.
    if (!def) return false;
    return !def.countries || def.countries.includes(country);
  });
  return offered.length > 0 ? offered : [DEFAULT_BUSINESS_PRODUCT];
}

/** Registry countries the visitor may pick (primary always included, first). */
export function businessCountriesFor(business: WorkflowBusinessConfig | undefined): string[] {
  if (!business) return [];
  if (business.countries && business.countries.length > 0) {
    return business.countries.includes(business.country)
      ? business.countries
      : [business.country, ...business.countries];
  }
  return [business.country];
}

/** English country name for an ISO-2 code (falls back to the code itself). */
export function businessCountryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

// Continent headings for the registry picker, Africa first. Read off the full
// ISO map in lib/regions.ts, so every register (YouVerify's and the ~190 read
// through Didit) lands on its continent; a hand-typed list here left every
// country added later under "Other". The Middle East counts as Asia, the
// Americas split at South America, and Asia & Pacific at Oceania, the way the
// server files them (kyc-core business-countries/didit.ts).
const REGIONS: Array<{ textKey: string; key: BusinessContinent }> = [
  { textKey: 'business.country.region.africa', key: 'africa' },
  { textKey: 'business.country.region.europe', key: 'europe' },
  { textKey: 'business.country.region.asia', key: 'asia' },
  { textKey: 'business.country.region.northAmerica', key: 'northAmerica' },
  { textKey: 'business.country.region.southAmerica', key: 'southAmerica' },
  { textKey: 'business.country.region.oceania', key: 'oceania' },
];

type BusinessContinent = 'africa' | 'europe' | 'asia' | 'northAmerica' | 'southAmerica' | 'oceania';

const SOUTH_AMERICA = new Set(['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE']);
const OCEANIA = new Set([
  'AS', 'AU', 'CK', 'FJ', 'FM', 'GU', 'KI', 'MH', 'MP', 'NC', 'NF', 'NR', 'NU', 'NZ', 'PF', 'PG', 'PN', 'PW',
  'SB', 'TK', 'TO', 'TV', 'VU', 'WF', 'WS',
]);

/** The continent a registry country is shown under, or null for "Other". */
export function businessContinentOf(code: string): BusinessContinent | null {
  const up = code.toUpperCase();
  switch (regionOf(up)) {
    case 'Africa':
      return 'africa';
    case 'Europe':
      return 'europe';
    case 'Middle East':
      return 'asia';
    case 'Americas':
      return SOUTH_AMERICA.has(up) ? 'southAmerica' : 'northAmerica';
    case 'Asia & Pacific':
      return OCEANIA.has(up) ? 'oceania' : 'asia';
    default:
      return null;
  }
}

export interface BusinessCountryGroup {
  label: string;
  countries: Array<{ code: string; name: string }>;
}

/** Group offered registry countries by continent, names A→Z within a group. */
export function groupBusinessCountries(
  codes: string[],
  t: TextFn = defaultText,
): BusinessCountryGroup[] {
  const entries = codes.map((code) => ({ code: code.toUpperCase(), name: businessCountryName(code) }));
  const groups: BusinessCountryGroup[] = [];
  const placed = new Set<string>();
  for (const region of REGIONS) {
    const countries = entries
      .filter((e) => businessContinentOf(e.code) === region.key)
      .sort((a, b) => a.name.localeCompare(b.name));
    countries.forEach((c) => placed.add(c.code));
    if (countries.length > 0) groups.push({ label: t(region.textKey), countries });
  }
  const other = entries.filter((e) => !placed.has(e.code)).sort((a, b) => a.name.localeCompare(b.name));
  if (other.length > 0) groups.push({ label: t('business.country.region.other'), countries: other });
  return groups;
}

/**
 * Whether the resolved config runs the business (KYB) flow: consent →
 * business-details → (questionnaire) → submitted. Single source of truth for
 * the gate — the step order, consent routing, and submission all read this.
 */
export function isBusinessFlow(config: {
  subjectType?: SubjectType;
  business?: WorkflowBusinessConfig;
  scope?: WorkflowScope | string;
}): boolean {
  // A scoped workflow runs its scope's own steps whoever it is about: a
  // business address, questionnaire or contact check never enters the KYB
  // application (company search, registry lookup, key people, documents).
  if (configScope(config) !== null) return false;
  return config.subjectType === 'business' && !!config.business;
}

/** All key-person roles — the in-scope set when `keyPeople.roles` is absent/empty. */
const KEY_PERSON_ROLES: KeyPersonRole[] = ['director', 'beneficial_owner', 'signatory', 'shareholder'];

/**
 * Whether the business-details step should collect a contact email for
 * key-people verification: the workflow's `keyPeople` block is enabled, invites
 * go out by email, and at least one in-scope role resolves to full KYC
 * (`perRole[role] ?? level ?? 'screening_only'` — mirrors the server).
 */
export function keyPeopleNeedsContactEmail(business: WorkflowBusinessConfig | undefined): boolean {
  const keyPeople = business?.keyPeople;
  if (!keyPeople?.enabled || keyPeople.invite?.channel !== 'email') return false;
  const roles = keyPeople.roles && keyPeople.roles.length > 0 ? keyPeople.roles : KEY_PERSON_ROLES;
  return roles.some((role) => (keyPeople.perRole?.[role] ?? keyPeople.level ?? 'screening_only') === 'full_kyc');
}

/** Format-only email check for the optional contact email (validated when non-empty). */
export function isValidContactEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

/** Effective per-field company-profile mode: collectCompanyInfo false ⇒ all
 *  off; absent field = 'optional'. Mirrors the server's resolution exactly. */
export function companyInfoFieldModes(
  business: import('../types/business').WorkflowBusinessConfig | undefined,
): Record<import('../types/business').CompanyInfoField, import('../types/business').CompanyInfoMode> {
  const off = business?.collectCompanyInfo === false;
  const modes = business?.companyInfo ?? {};
  type F = import('../types/business').CompanyInfoField;
  type M = import('../types/business').CompanyInfoMode;
  // Built from the field list so adding one on the server means adding it in a
  // single place here, rather than a line that is easy to forget.
  const FIELDS: F[] = [
    'address',
    'email',
    'phone',
    'website',
    'dateOfIncorporation',
    'taxId',
    'vatNumber',
    'companyType',
    'natureOfBusiness',
  ];
  return Object.fromEntries(
    FIELDS.map((f) => [f, off ? 'off' : (modes[f] ?? 'optional')]),
  ) as Record<F, M>;
}
