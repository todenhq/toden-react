// Drop-off insights on the web: what got in the way of the applicant, recorded
// on the step log (lib/step-log.ts recordJourneyEvent) where it really happens,
// and the browser's own lifecycle (hidden, gone, back online). Codes only,
// never personal data. kyc-core keeps the journey after the session expires and
// reads from it why the applicant likely stopped.
import type { MediaUploadType } from '../services/api';
import type { CaptureProblemKind } from './document-capture-check';
import { collectWebDeviceMetadata, SDK_VERSION } from '../utils/device-metadata';
import {
  networkErrorSince,
  notifyJourneyUrgent,
  recordJourneyEvent,
  type JourneyClient,
} from './step-log';

const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'] as const;

/** PURE. The client block from what the device metadata already reads, with no identifiers. */
export function journeyClientFrom(meta: {
  os?: { name?: string; version?: string };
  browser?: { name?: string };
  device?: { type?: string };
  userAgent?: string;
}): JourneyClient {
  const osName = meta.os?.name && meta.os.name !== 'Unknown' ? meta.os.name : undefined;
  const osVersion = meta.os?.version ? meta.os.version.split(/[._]/).slice(0, 2).join('.') : undefined;
  // Samsung Internet says Chrome in its user agent too.
  const raw = /SamsungBrowser\//.test(meta.userAgent ?? '') ? 'Samsung Internet' : (meta.browser?.name ?? '');
  const base = raw.replace(/ iOS$/, '');
  const browser = raw === 'Samsung Internet' ? raw : (BROWSERS as readonly string[]).includes(base) ? base : 'Other';
  const type = meta.device?.type;
  const formFactor = type === 'mobile' ? 'phone' : type === 'tablet' ? 'tablet' : type === 'desktop' ? 'desktop' : undefined;
  return {
    sdk: 'web',
    version: SDK_VERSION,
    platform: 'web',
    ...(osName ? { os: osName } : {}),
    ...(osVersion ? { osVersion } : {}),
    browser,
    ...(formFactor ? { formFactor } : {}),
  };
}

/** The client block for this browser. */
export function webJourneyClient(): JourneyClient {
  return journeyClientFrom(collectWebDeviceMetadata());
}

/** PURE. What kind of upload failed, in the journey's closed words. */
export function uploadDetail(type: MediaUploadType): string {
  switch (type) {
    case 'document_front':
    case 'document_back':
      return 'document';
    case 'selfie':
      return 'selfie';
    case 'document_front_video':
    case 'document_back_video':
    case 'liveness_video':
      return 'video';
    case 'supporting_document':
      return 'supporting_document';
    case 'proof_of_address':
      return 'proof_of_address';
    default:
      return 'other';
  }
}

/**
 * Runs an upload (with whatever retries the caller wraps round it) and records
 * `upload_failed` once it has finally failed. Rethrows: the caller's own error
 * handling is unchanged.
 */
export async function journeyUpload<T>(type: MediaUploadType, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    recordJourneyEvent('upload_failed', uploadDetail(type));
    throw err;
  }
}

/**
 * PURE. A document photo the readability check sent back, in the journey's
 * words: part of the document cut off, or something it could not read (the
 * face on the photo, the barcode), which the check cannot tell apart from blur
 * or glare.
 */
export function captureRejectedDetail(kind: CaptureProblemKind): string {
  return kind === 'not_complete' ? 'cut_off' : 'other';
}

/** PURE. The network failure's detail: a timeout, the device offline, or another failure. */
export function networkDetail(err: unknown, online: boolean | undefined): 'offline' | 'timeout' | 'other' {
  const name = (err as { name?: unknown } | null)?.name;
  if (name === 'AbortError' || name === 'TimeoutError') return 'timeout';
  if (online === false) return 'offline';
  return 'other';
}

/**
 * Records a request that never reached Core (fetch rejected: offline, DNS,
 * CORS, a timeout). An HTTP error answer is not a network failure.
 */
export function recordNetworkFailure(err: unknown): void {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : undefined;
  recordJourneyEvent('network_error', networkDetail(err, online));
}

/**
 * Listens to the page's lifecycle while the flow is open: hidden or gone is
 * `app_backgrounded` (and saves progress at once, with keepalive), visible
 * again is `app_foregrounded`, and coming back online after a network failure
 * saves progress so the failure reaches Core. Returns the stop function.
 */
export function startJourneyLifecycle(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined;
  let lastOnlineSave = Date.now();
  const onVisibility = () => {
    recordJourneyEvent(document.visibilityState === 'hidden' ? 'app_backgrounded' : 'app_foregrounded');
  };
  // The tab closing or navigating away: the last chance to save.
  const onPageHide = () => recordJourneyEvent('app_backgrounded');
  const onOnline = () => {
    if (!networkErrorSince(lastOnlineSave)) return;
    lastOnlineSave = Date.now();
    notifyJourneyUrgent('network_error');
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('online', onOnline);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('online', onOnline);
  };
}
