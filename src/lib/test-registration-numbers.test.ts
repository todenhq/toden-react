import { describe, expect, it } from 'vitest';
import { testRegistrationNumber } from './test-registration-numbers';
import { withPreviewMocks } from '../services/preview-mock';
import type { VerificationApi } from '../services/api';

describe('preview registration numbers', () => {
  it('match the country, never an RC number outside Nigeria', () => {
    expect(testRegistrationNumber('NG', 1)).toBe('RC0000001');
    expect(testRegistrationNumber('GH', 1)).toBe('CS000000001');
    expect(testRegistrationNumber('ZA', 2)).toBe('200000000207');
    expect(testRegistrationNumber('SN', 1)).toBe('00000001');
  });

  it('the builder preview searches answer in the previewed country', async () => {
    const api = withPreviewMocks({} as VerificationApi);
    const res = await api.businessSearch({ country: 'GH', query: 'acme' });
    expect(res.results.map((r) => r.registrationNumber)).toEqual(['CS000000001', 'CS000000002']);
  });
});
