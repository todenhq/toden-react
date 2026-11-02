// Full ISO region grouping for the country-select step. Global Documents let a
// workflow offer any of ~200 countries, so the ~48-country business REGIONS map
// in lib/business.ts isn't enough. Mirrors the dashboard's lib/country-regions.

let cachedDn: Intl.DisplayNames | null | undefined;
function displayNames(): Intl.DisplayNames | null {
  if (cachedDn === undefined) {
    try {
      cachedDn = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      cachedDn = null;
    }
  }
  return cachedDn ?? null;
}

/** English name for an ISO-2 code (falls back to the code itself). */
export function regionCountryName(code: string): string {
  const up = code.toUpperCase();
  try {
    return displayNames()?.of(up) ?? up;
  } catch {
    return up;
  }
}

export type Region = 'Africa' | 'Europe' | 'Americas' | 'Middle East' | 'Asia & Pacific' | 'Other';

const REGION_ORDER: Region[] = ['Africa', 'Europe', 'Americas', 'Middle East', 'Asia & Pacific', 'Other'];

const REGION_SETS: Record<Exclude<Region, 'Other'>, string[]> = {
  Africa: [
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG',
    'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN',
    'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA',
    'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO',
    'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW',
  ],
  'Middle East': [
    'AE', 'BH', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA',
    'SY', 'TR', 'YE',
  ],
  Europe: [
    'AD', 'AL', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE',
    'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU',
    'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME',
    'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SJ',
    'SK', 'SM', 'UA', 'VA', 'XK',
  ],
  Americas: [
    'AG', 'AI', 'AR', 'AW', 'BB', 'BL', 'BM', 'BO', 'BQ', 'BR', 'BS', 'BZ',
    'CA', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'FK', 'GD', 'GF',
    'GL', 'GP', 'GT', 'GY', 'HN', 'HT', 'JM', 'KN', 'KY', 'LC', 'MF', 'MQ',
    'MS', 'MX', 'NI', 'PA', 'PE', 'PM', 'PR', 'PY', 'SR', 'SV', 'SX', 'TC',
    'TT', 'US', 'UY', 'VC', 'VE', 'VG', 'VI',
  ],
  'Asia & Pacific': [
    'AF', 'AM', 'AS', 'AU', 'AZ', 'BD', 'BN', 'BT', 'CK', 'CN', 'FJ', 'FM',
    'GE', 'GU', 'HK', 'ID', 'IN', 'JP', 'KG', 'KH', 'KI', 'KP', 'KR', 'KZ',
    'LA', 'LK', 'MH', 'MM', 'MN', 'MO', 'MP', 'MV', 'MY', 'NC', 'NF', 'NP',
    'NR', 'NU', 'NZ', 'PF', 'PG', 'PH', 'PK', 'PN', 'PW', 'SB', 'SG', 'TH',
    'TJ', 'TK', 'TL', 'TM', 'TO', 'TV', 'TW', 'UZ', 'VN', 'VU', 'WF', 'WS',
  ],
};

const BY_CODE = new Map<string, Region>();
for (const [region, codes] of Object.entries(REGION_SETS) as Array<[Region, string[]]>) {
  for (const code of codes) BY_CODE.set(code, region);
}

/** The region an ISO code is filed under ('Other' when the map has none). */
export function regionOf(code: string): Region {
  return BY_CODE.get(code.toUpperCase()) ?? 'Other';
}

/** Every ISO code in the region map — the "all countries" picker source. */
export const ALL_REGION_CODES: string[] = Object.values(REGION_SETS).flat();

export interface RegionGroup {
  region: Region;
  countries: Array<{ code: string; name: string }>;
}

/** Group ISO codes by region (Africa first, 'Other' last), names A→Z within. */
export function groupCountriesByRegion(codes: string[]): RegionGroup[] {
  const buckets = new Map<Region, Array<{ code: string; name: string }>>();
  for (const raw of codes) {
    const code = raw.toUpperCase();
    const region = BY_CODE.get(code) ?? 'Other';
    const list = buckets.get(region) ?? [];
    list.push({ code, name: regionCountryName(code) });
    buckets.set(region, list);
  }
  return REGION_ORDER.filter((r) => buckets.has(r)).map((region) => ({
    region,
    countries: buckets.get(region)!.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
