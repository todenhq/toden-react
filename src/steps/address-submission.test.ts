import { describe, expect, it } from 'vitest';
import { addressSubmission, WIRE_MAX_ACCURACY_M } from './address-submission';

const pin = { lat: 4.95, lng: 8.32 } as never;
const at = (extra: Record<string, unknown>) =>
  addressSubmission(undefined, { ...(pin as object), ...extra } as never).address as Record<string, unknown>;

describe('addressSubmission accuracy', () => {
  it('sends an ordinary phone fix whole', () => {
    expect(at({ accuracy: 12, deviceLat: 4.95, deviceLng: 8.32, deviceAccuracy: 12 })).toMatchObject({ accuracy: 12, deviceLat: 4.95, deviceAccuracy: 12 });
  });

  it('leaves out a desktop fix wider than every server accepts, rather than failing the submission', () => {
    const sent = at({ accuracy: 182_000, deviceLat: 4.9, deviceLng: 8.3, deviceAccuracy: 182_000 });
    expect(sent).toMatchObject({ lat: 4.95, lng: 8.32 });
    expect(sent).not.toHaveProperty('accuracy');
    // Never the coordinates without their radius, which would read as precise.
    expect(sent).not.toHaveProperty('deviceLat');
    expect(sent).not.toHaveProperty('deviceAccuracy');
  });

  it('keeps a fix exactly at the limit', () => {
    expect(at({ deviceLat: 4.9, deviceLng: 8.3, deviceAccuracy: WIRE_MAX_ACCURACY_M })).toHaveProperty('deviceAccuracy', WIRE_MAX_ACCURACY_M);
  });
});
