import { describe, expect, it } from 'vitest';
import { countryOnIdStep } from './id-selection-layout';

describe('where the country is picked', () => {
  it('is on the ID-type step unless the workflow keeps a step of its own', () => {
    expect(countryOnIdStep({})).toBe(true);
    expect(countryOnIdStep({ idSelectionLayout: 'combined' })).toBe(true);
    expect(countryOnIdStep({ idSelectionLayout: 'separate' })).toBe(false);
  });
});
