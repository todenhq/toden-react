// One-shot geolocation helpers for the address-collection step, split out per
// the 200-line rule and so the fix logic stays pure-ish and testable.

import { isAcceptedAddressPhoto } from '../components/AddressPhotoUpload';
import { IMAGE_MAX_BYTES } from '../lib/upload-limits';
import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';
import { journeyUpload } from '../lib/journey';

const FIX_TIMEOUT_MS = 8_000;

export function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: FIX_TIMEOUT_MS,
      maximumAge: 30_000,
    });
  });
}

/**
 * The attest-presence device fix, as the fields the verify body carries.
 * Best-effort by contract: a denied prompt or a slow read returns {} and the
 * submission simply goes without the `attested` tier.
 */
export interface DeviceFixReading {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
}

// The most recent fix ANY read produced, kept so the confirm-time attest read
// can fall back on it (see pickDeviceFix).
let lastGoodFix: DeviceFixReading | null = null;
/** Called by every path that obtains a real fix. */
export function rememberDeviceFix(fix: DeviceFixReading): void {
  lastGoodFix = fix;
}

/** How old a fix from earlier in the SAME address flow may be and still stand
 *  in for the confirm-time read. Placing a pin takes a minute or two; a fix
 *  from that window still says the device was here, and the server judges it
 *  by its own `capturedAt` anyway. Mirrored on RN and Flutter. */
export const RECENT_FIX_MAX_AGE_MS = 3 * 60_000;

/** The reading the attest step should send: a fresh one when the read
 *  answered, else the recent one the flow already took, else nothing. Pure. */
export function pickDeviceFix(
  fresh: DeviceFixReading | null,
  recent: DeviceFixReading | null,
  now: number = Date.now(),
): DeviceFixReading | null {
  if (fresh) return fresh;
  if (recent && now - recent.timestamp <= RECENT_FIX_MAX_AGE_MS) return recent;
  return null;
}

function readingOf(pos: GeolocationPosition): DeviceFixReading {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null,
    timestamp: pos.timestamp || Date.now(),
  };
}

export async function deviceFixFields(): Promise<{
  deviceLat?: number;
  deviceLng?: number;
  deviceAccuracy?: number;
  capturedAt?: string;
}> {
  // A single read at confirm can time out while the GPS settles, and the
  // submission then goes out with no fix even though "Use my location" had
  // just placed the pin on one (seen on RN, 2026-09-07; same shape here).
  // The fix the flow already holds is the fallback.
  let fresh: DeviceFixReading | null = null;
  try {
    fresh = readingOf(await currentPosition());
    rememberDeviceFix(fresh);
  } catch {
    fresh = null;
  }
  const fix = pickDeviceFix(fresh, lastGoodFix);
  if (!fix) return {};
  return {
    deviceLat: fix.lat,
    deviceLng: fix.lng,
    ...(fix.accuracy != null ? { deviceAccuracy: fix.accuracy } : {}),
    capturedAt: new Date(fix.timestamp).toISOString(),
  };
}

/** Accuracy at which a fix is good enough to stop waiting for GPS. */
const PRECISE_ENOUGH_M = 25;
const PRECISE_WINDOW_MS = 8_000;
/** Once ANY fix exists, wait only this much longer for a better one — a
 *  desktop wifi fix never reaches 25m, and waiting the full window for an
 *  accuracy that is not coming reads as "keeps loading". */
const FIRST_FIX_GRACE_MS = 3_000;

/**
 * A PRECISE fix: watch the position for up to ~9s and keep the most accurate
 * reading, resolving early once it is within ~20m. A single getCurrentPosition
 * routinely answers with the first coarse wifi/cell fix (hundreds of metres)
 * before the GPS has warmed up — which is exactly the pin landing on the wrong
 * compound. maximumAge 0: never accept a cached fix for a pin.
 */
export function precisePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unavailable'));
      return;
    }
    let best: GeolocationPosition | null = null;
    let settled = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = (pos: GeolocationPosition | null, err?: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (graceTimer) clearTimeout(graceTimer);
      if (pos) resolve(pos);
      else reject(err ?? new Error('no fix'));
    };
    const timer = setTimeout(() => finish(best), PRECISE_WINDOW_MS);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || (pos.coords.accuracy ?? Infinity) < (best.coords.accuracy ?? Infinity)) best = pos;
        if ((pos.coords.accuracy ?? Infinity) <= PRECISE_ENOUGH_M) {
          finish(pos);
          return;
        }
        // First usable fix: give the GPS a short grace to improve, then take
        // the best on hand rather than waiting out the whole window.
        if (!graceTimer) graceTimer = setTimeout(() => finish(best), FIRST_FIX_GRACE_MS);
      },
      (err) => finish(best, err),
      { enableHighAccuracy: true, timeout: PRECISE_WINDOW_MS, maximumAge: 0 },
    );
  });
}

/** The Use-my-location fix: a canned Lagos pin in builder preview, the real
 *  precise (best-of-watch) geolocation fix otherwise. Throws on a denied or
 *  failed read. */
export async function resolveMyLocation(
  preview: boolean | undefined,
): Promise<{ lat: number; lng: number; accuracy: number | null }> {
  if (preview) return { lat: 6.4281, lng: 3.4219, accuracy: 15 };
  const fix = await precisePosition();
  // The pin's fix is also the attest step's fallback (see deviceFixFields).
  rememberDeviceFix(readingOf(fix));
  return { lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy ?? null };
}

/** The address state after picking a search candidate: the pin lands on the
 *  hit, the typed fields survive, and the house number prefills ONLY when the
 *  applicant has not typed one (their word always beats the map's). */
export function pickedAddressState(
  prev:
    | { directions?: string; propertyName?: string; propertyNumber?: string; street?: string }
    | null
    | undefined,
  hit: { lat: number; lng: number; houseNumber: string | null },
): {
  lat: number;
  lng: number;
  accuracy: null;
  directions: string;
  propertyName: string;
  propertyNumber: string;
  street: string | undefined;
} {
  return {
    lat: hit.lat,
    lng: hit.lng,
    accuracy: null,
    directions: prev?.directions ?? '',
    propertyName: prev?.propertyName ?? '',
    propertyNumber: prev?.propertyNumber?.trim() ? prev.propertyNumber : (hit.houseNumber ?? ''),
    // Undefined, not '': the details sheet reads '' as "deliberately cleared"
    // and undefined as "never touched" — initialising with '' suppressed the
    // resolved-street prefill forever.
    street: prev?.street,
  };
}

/** Validate + upload the entrance photo; the human-readable refusal is the
 *  thrown message (the step surfaces it verbatim). */
export async function uploadAddressPhoto(
  api: { upload(file: File, type: string): Promise<string> },
  file: File,
  t: TextFn = defaultText,
): Promise<string> {
  if (!isAcceptedAddressPhoto(file)) throw new Error(t('address.photo.error.type'));
  // The shared image cap (both mobile ports apply the same one); without a
  // mirror here the web quietly accepted anything and the server refused it
  // later with a worse message.
  if (file.size > IMAGE_MAX_BYTES) throw new Error(t('address.photo.error.size'));
  try {
    return await journeyUpload('address_photo', () => api.upload(file, 'address_photo'));
  } catch {
    throw new Error(t('address.photo.error.upload'));
  }
}
