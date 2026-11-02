// Registration numbers in each country's own format, for the builder preview's
// canned search. An RC number is Nigerian only, so a Ghanaian flow previews a
// Ghanaian number. Mirrors kyc-core src/lib/business-sandbox-numbers.ts (the
// sandbox's test numbers); keep the two in lockstep.

const pad = (n: number, width: number) => String(n).padStart(width, '0');

const FORMATS: Record<string, (n: number) => string> = {
  NG: (n) => `RC${pad(n, 7)}`,
  GH: (n) => `CS${pad(n, 9)}`,
  KE: (n) => `PVT-TEST${pad(n, 5)}`,
  ZA: (n) => `2000${pad(n, 6)}07`,
  GB: (n) => pad(n, 8),
  IE: (n) => pad(n, 6),
  FR: (n) => pad(n, 9),
  DE: (n) => `HRB ${pad(n, 6)}`,
  IN: (n) => `U00000MH2000PTC${pad(n, 6)}`,
  SG: (n) => `2000${pad(n, 5)}A`,
  AU: (n) => pad(n, 9),
  CA: (n) => pad(n, 7),
  US: (n) => pad(n, 7),
};

/** A test registration number in the country's format; plain digits when unknown. */
export function testRegistrationNumber(country: string | null | undefined, index: number): string {
  const format = (country && FORMATS[country.toUpperCase()]) || ((n: number) => pad(n, 8));
  return format(index);
}
