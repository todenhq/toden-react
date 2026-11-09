import { describe, expect, it } from 'vitest';
import { withoutUnchosenIdTypes } from './chosen-only-ids';

const rows = ['bvn', 'nin', 'tax-id', 'vnin', 'passport'].map((idType) => ({ country: 'NG', idType }));
const keys = (list: Array<{ idType: string }>) => list.map((r) => r.idType);

describe('chosen-only IDs in a workflow', () => {
  it('leaves them out of a country that lists no IDs', () => {
    expect(keys(withoutUnchosenIdTypes(rows, { countries: [{ country: 'NG' }] }))).toEqual(['bvn', 'nin', 'passport']);
  });

  it('keeps one the country lists by name', () => {
    expect(keys(withoutUnchosenIdTypes(rows, { countries: [{ country: 'NG', idTypes: ['bvn', 'vnin'] }] }))).toContain('vnin');
    expect(keys(withoutUnchosenIdTypes(rows, { country: 'NG', idTypes: ['tax-id'] }))).toContain('tax-id');
  });
});
