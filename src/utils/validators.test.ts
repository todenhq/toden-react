import { describe, expect, it } from 'vitest';
import { normaliseNgPhone, validateIdNumber } from './validators';

describe('Nigerian phone-keyed IDs', () => {
  it.each(['phone-number', 'nin-phone'] as const)('accepts every way a number is typed for %s', (idType) => {
    for (const typed of ['08031234567', '+234 803 123 4567', '2348031234567', '803 123 4567']) {
      expect(validateIdNumber('NG', idType, typed).valid).toBe(true);
    }
    expect(validateIdNumber('NG', idType, '0803123456').valid).toBe(false);
    expect(validateIdNumber('NG', idType, '01234567890').valid).toBe(false);
    expect(validateIdNumber('NG', idType, '0803ABC4567').valid).toBe(false);
  });

  it('brings a number to the local form the server sends', () => {
    expect(normaliseNgPhone('+234 803 123 4567')).toBe('08031234567');
    expect(normaliseNgPhone('803 123 4567')).toBe('08031234567');
  });
});
