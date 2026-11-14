import { describe, expect, it } from 'vitest';
import { KEEP_PICKED_LABEL_RADIUS_M, addressFlowSteps, displayAddressLine, metersBetween, nextAddressStep, prevAddressStep, shouldAskLabelDecision } from './flow-steps';

describe('addressFlowSteps', () => {
  it('is pin + review at minimum', () => {
    expect(
      addressFlowSteps({ searchAvailable: false, photoMode: 'off', streetViewOffered: false }),
    ).toEqual(['address-collection', 'address-review']);
  });

  it('adds search when a backend is available', () => {
    expect(
      addressFlowSteps({ searchAvailable: true, photoMode: 'off', streetViewOffered: false })[0],
    ).toBe('address-search');
  });

  it('adds the entrance step for a photo mode OR street view', () => {
    expect(
      addressFlowSteps({ searchAvailable: false, photoMode: 'optional', streetViewOffered: false }),
    ).toContain('address-entrance');
    expect(
      addressFlowSteps({ searchAvailable: false, photoMode: 'off', streetViewOffered: true }),
    ).toContain('address-entrance');
  });

  it('walks forward and back within the flow, null at the edges', () => {
    const steps = addressFlowSteps({ searchAvailable: true, photoMode: 'optional', streetViewOffered: true });
    expect(nextAddressStep(steps, 'address-search')).toBe('address-collection');
    expect(nextAddressStep(steps, 'address-review')).toBeNull();
    expect(prevAddressStep(steps, 'address-collection')).toBe('address-search');
    expect(prevAddressStep(steps, 'address-search')).toBeNull();
  });
});

describe('metersBetween', () => {
  it('measures a small nudge in metres', () => {
    // ~111m per 0.001 degrees of latitude.
    const d = metersBetween({ lat: 4.932, lng: 8.325 }, { lat: 4.933, lng: 8.325 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(125);
  });

  it('a same-compound nudge stays inside the keep radius; a district hop does not', () => {
    const pick = { lat: 4.9323964, lng: 8.3254216 };
    const nudge = { lat: 4.9331, lng: 8.326 }; // ~110m
    const far = { lat: 4.95, lng: 8.34 };      // ~2.5km
    expect(metersBetween(pick, nudge)).toBeLessThanOrEqual(KEEP_PICKED_LABEL_RADIUS_M);
    expect(metersBetween(pick, far)).toBeGreaterThan(KEEP_PICKED_LABEL_RADIUS_M);
  });
});

describe('shouldAskLabelDecision', () => {
  const picked = {
    lat: 4.9323964,
    lng: 8.3254216,
    label: '11 Adebayo Street, Idim Ita, Calabar',
    pickedAt: { lat: 4.9323964, lng: 8.3254216 },
  };

  it('stays silent while the move is roof-refinement', () => {
    // ~11m nudge: keep the picked label without asking.
    expect(shouldAskLabelDecision({ ...picked, lat: picked.lat + 0.0001 })).toBe(false);
  });

  it('asks once the pin has genuinely moved', () => {
    expect(shouldAskLabelDecision({ ...picked, lat: picked.lat + 0.0005 })).toBe(true);
  });

  it('respects an answered "keep"', () => {
    expect(shouldAskLabelDecision({ ...picked, lat: picked.lat + 0.0005, labelKept: true })).toBe(false);
  });

  it('never asks about a derived label', () => {
    // No pickedAt anchor: reverse-geocoded labels re-derive freely instead.
    const { pickedAt: _a, ...derived } = picked;
    expect(shouldAskLabelDecision({ ...derived, lat: picked.lat + 0.0005 })).toBe(false);
  });
});

describe('displayAddressLine', () => {
  const base = { lat: 4.9324, lng: 8.3254 };

  it('replaces a contradictory picked number with the typed one', () => {
    expect(
      displayAddressLine({ ...base, label: '11 Adebayo Street, Idim Ita, Calabar', propertyNumber: '8' }),
    ).toBe('8 Adebayo Street, Idim Ita, Calabar');
  });

  it('never doubles a number the label already leads with', () => {
    expect(
      displayAddressLine({ ...base, label: '11 Adebayo Street, Idim Ita', propertyNumber: '11' }),
    ).toBe('11 Adebayo Street, Idim Ita');
  });

  it('prefixes a number the label never carried', () => {
    expect(displayAddressLine({ ...base, label: 'Adebayo Street, Calabar', propertyNumber: '8' })).toBe(
      '8, Adebayo Street, Calabar',
    );
  });

  it('leads with a typed street the label does not know', () => {
    expect(
      displayAddressLine({ ...base, label: 'Idim Ita, Calabar', propertyNumber: '8', street: 'Wisdom Close' }),
    ).toBe('8 Wisdom Close, Idim Ita, Calabar');
  });

  it('falls back to coordinates only when there is nothing typed either', () => {
    expect(displayAddressLine({ ...base, street: 'Wisdom Close', propertyNumber: '8' })).toBe('8 Wisdom Close');
    // NEVER coordinates: an unlabelled pin has NO line, and the caller shows
    // that one is on its way.
    expect(displayAddressLine(base)).toBe('');
  });
});
