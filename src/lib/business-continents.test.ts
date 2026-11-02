import { describe, expect, it } from 'vitest';
import { businessContinentOf, groupBusinessCountries } from './business';

describe('registry countries by continent', () => {
  it('files every register on its continent, the ones read through Didit included', () => {
    expect(['GH', 'SN', 'EG', 'NG'].map(businessContinentOf)).toEqual(['africa', 'africa', 'africa', 'africa']);
    expect(['BR', 'CL'].map(businessContinentOf)).toEqual(['southAmerica', 'southAmerica']);
    expect(['US', 'MX', 'JM'].map(businessContinentOf)).toEqual(['northAmerica', 'northAmerica', 'northAmerica']);
    expect(['AE', 'SG', 'TR'].map(businessContinentOf)).toEqual(['asia', 'asia', 'asia']);
    expect(['FJ', 'NZ'].map(businessContinentOf)).toEqual(['oceania', 'oceania']);
    expect(businessContinentOf('IT')).toBe('europe');
  });

  it('puts Ghana under Africa, never Other', () => {
    const groups = groupBusinessCountries(['NG', 'GH', 'KE', 'ZZ']);
    expect(groups[0].countries.map((c) => c.code)).toEqual(['GH', 'KE', 'NG']);
    expect(groups[groups.length - 1].countries.map((c) => c.code)).toEqual(['ZZ']);
  });
});
