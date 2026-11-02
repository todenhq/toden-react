import { describe, expect, it } from 'vitest';
import { registrationNumberHint } from './registration-hint';
import { getBusinessProductDef } from './business';

const business = getBusinessProductDef('business');
const tin = getBusinessProductDef('business-tin');

describe('registrationNumberHint', () => {
  it('NG registration numbers get prefix guidance + format validation', () => {
    const hint = registrationNumberHint('NG', business);
    expect(hint.placeholder).toBe('e.g. RC0000000');
    expect(hint.tip).toMatch(/RC for private companies/);
    expect(hint.isValidFormat!('RC123456')).toBe(true);
    expect(hint.isValidFormat!('bn0012345')).toBe(true); // case-insensitive
    expect(hint.isValidFormat!('LLP99')).toBe(true);
    expect(hint.isValidFormat!('RC 123456')).toBe(false); // no spaces
    expect(hint.isValidFormat!('123456')).toBe(false); // prefix required
    expect(hint.isValidFormat!('XY123456')).toBe(false);
  });

  it('other countries get a generic registry tip without format constraints', () => {
    const hint = registrationNumberHint('SN', business);
    expect(hint.placeholder).toBe('Enter your registration number');
    expect(hint.tip).toMatch(/business registry in Senegal/);
    expect(hint.isValidFormat).toBeNull();
  });

  it('TIN products keep their own placeholder and skip prefix rules', () => {
    const hint = registrationNumberHint('NG', tin);
    expect(hint.placeholder).toBe('e.g. 01234567-0001');
    expect(hint.isValidFormat).toBeNull();
    expect(hint.tip).toMatch(/tax identification number/);
  });
});

describe('provider-documented example placeholders', () => {
  it('KE and ZA use the registry-confirmed formats', () => {
    const ke = registrationNumberHint('KE', business);
    expect(ke.placeholder).toBe('e.g. PVT-JZUA6Z663');
    expect(ke.tip).toMatch(/certificate of incorporation/);
    const za = registrationNumberHint('ZA', business);
    expect(za.placeholder).toBe('e.g. 201133333323');
    expect(za.tip).toMatch(/without the slashes/);
    // Still no format enforcement outside Nigeria.
    expect(ke.isValidFormat).toBeNull();
    expect(za.isValidFormat).toBeNull();
  });

  it('GH uses the Registrar of Companies prefixes', () => {
    const gh = registrationNumberHint('GH', business);
    expect(gh.placeholder).toBe('e.g. CS043840225');
    expect(gh.tip).toMatch(/CS for a company, BN for a business name or PL for a public company/);
    expect(gh.isValidFormat).toBeNull();
  });
});

describe('workflow copy', () => {
  it('reads every text through the flow text function', async () => {
    const { defaultText } = await import('../i18n');
    const t: typeof defaultText = (key, vars, legacy) =>
      key === 'business.registration.placeholderGeneric' ? 'Votre numéro' : defaultText(key, vars, legacy);
    const hint = registrationNumberHint('SN', business, t);
    expect(hint.placeholder).toBe('Votre numéro');
    // Untranslated keys fall back to the English default, with the country filled in.
    expect(hint.tip).toMatch(/business registry in Senegal/);
  });
});
