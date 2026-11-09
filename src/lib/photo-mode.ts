// ─── Photo mode: the document camera's look without the scan ────────────────
//
// The decisions components/PhotoCamera.tsx makes, kept free of React and the
// DOM so they can be tested on their own. Photo mode has no auto-capture, no
// corner, framing or text gate, no guide and no live instruction: the shutter
// is always enabled and takes the photo as it is.
//
// Mirrors the React Native SDK's components/viewfinder/photoMode.ts.

import { IMAGE_MAX_BYTES } from './upload-limits';

/**
 * Photo mode's own words. Hard-coded beside the scan's camera captions
 * (ImmersiveBottomBar's "Upload", "Light"): a catalogue key would have to be
 * added to the shared customisable-texts contract, which every SDK must match.
 */
export const PHOTO_COPY = {
  /** The shutter's accessible name. */
  shutter: 'Take photo',
  /** The upload button's screen-reader hint: the photo may not be of a document. */
  uploadHint: 'Choose a photo instead of using the camera.',
  /** The instruction for a document photo. */
  fitDocument: 'Fit the whole document in view',
  /** The entrance photo's title and instruction. */
  entranceTitle: 'Entrance photo',
  fitEntrance: 'Fit the door and the house number in the frame',
  /** Shown when the device has no camera at all. */
  noCamera: 'No camera found on this device.',
} as const;

/**
 * What photo mode hands the shutter: nothing ever holds it. No gate (blocked
 * reason), no dwell ring (progress), never shown busy. A second tap while a
 * capture is in flight is dropped by the camera's own guard, not by disabling
 * the button.
 */
export const PHOTO_SHUTTER = {
  busy: false,
  progress: 0,
  blockedReason: null,
} as const;

/** The caller's optional instruction, as the neutral pill shows it; null for none. */
export function photoHint(instruction: string | null | undefined): string | null {
  return instruction?.trim() || null;
}

/**
 * The camera's two ways out. Back closes only the camera and returns to the
 * step; close is the flow's own close (what the modal header's X calls),
 * null when the flow cannot be closed, so no X is drawn.
 */
export function photoCameraExits(p: {
  /** Hide the camera; the step underneath is unchanged. */
  dismiss: () => void;
  /** The flow's close, or null when it is disabled. */
  flowClose: (() => void) | null;
}): { back: () => void; close: (() => void) | null } {
  const { dismiss, flowClose } = p;
  return {
    back: dismiss,
    close: flowClose
      ? () => {
          dismiss();
          flowClose();
        }
      : null,
  };
}

/**
 * Esc is back while the camera is open, and only back: it must not reach the
 * dialog, whose own Esc closes the whole flow. True when the key was taken.
 */
export function handlePhotoCameraKey(
  event: { key: string; preventDefault: () => void; stopPropagation: () => void },
  back: () => void,
): boolean {
  if (event.key !== 'Escape' && event.key !== 'Esc') return false;
  event.preventDefault();
  event.stopPropagation();
  back();
  return true;
}

/** A file name from what is being photographed: lower case, hyphenated, `.jpg`. */
export function photoFileName(subject: string | null | undefined): string {
  const slug = (subject ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'photo'}.jpg`;
}

// ─── The still ──────────────────────────────────────────────────────────────

/** JPEG at quality 0.9, as the system camera path used to deliver. */
export const PHOTO_JPEG_QUALITY = 0.9;
/** How long `ImageCapture.takePhoto` may take before the frame is used instead. */
export const TAKE_PHOTO_TIMEOUT_MS = 4000;

interface StillCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): { drawImage(source: unknown, x: number, y: number, w: number, h: number): void } | null;
  toBlob(callback: (blob: Blob | null) => void, type: string, quality: number): void;
}

/** The pieces of the browser the capture uses, injectable for tests. */
export interface StillEnvironment {
  /** `window.ImageCapture`, or undefined where the browser has none. */
  ImageCapture?: new (track: MediaStreamTrack) => { takePhoto(settings?: object): Promise<Blob> };
  createCanvas: (width: number, height: number) => StillCanvas;
  /** Decodes the camera's own photo so it can be re-encoded. */
  decode?: (blob: Blob) => Promise<{ width: number; height: number; close?: () => void }>;
}

export function browserStillEnvironment(): StillEnvironment {
  const w = typeof window === 'undefined' ? undefined : (window as unknown as Record<string, unknown>);
  return {
    ImageCapture: w?.ImageCapture as StillEnvironment['ImageCapture'],
    createCanvas: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas as unknown as StillCanvas;
    },
    decode: typeof createImageBitmap === 'function' ? (blob) => createImageBitmap(blob) : undefined,
  };
}

function encode(canvas: StillCanvas, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be encoded.'))), 'image/jpeg', quality);
  });
}

/**
 * Draws `source` (`width` × `height`) to a canvas and encodes it as a JPEG at
 * quality 0.9. Full resolution; only a photo that would be refused as over
 * the upload cap (5 MB) is drawn again smaller until it fits, so the caller's
 * own size check does not turn a good photo away.
 */
export async function encodeStill(
  env: StillEnvironment,
  source: unknown,
  width: number,
  height: number,
  maxBytes: number = IMAGE_MAX_BYTES,
): Promise<Blob> {
  let w = width;
  let h = height;
  for (let attempt = 0; ; attempt += 1) {
    const canvas = env.createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('The photo could not be drawn.');
    ctx.drawImage(source, 0, 0, w, h);
    const blob = await encode(canvas, PHOTO_JPEG_QUALITY);
    if (blob.size <= maxBytes || attempt >= 3) return blob;
    // JPEG size scales roughly with area: aim a little under the cap.
    const scale = Math.sqrt(maxBytes / blob.size) * 0.9;
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * The full-resolution still. `ImageCapture.takePhoto` where the browser has
 * it (the sensor's own resolution, not the preview's); otherwise, or if it
 * fails, the current frame of the video at the video's native resolution.
 * Either way a JPEG at quality 0.9.
 */
export async function captureStill(
  video: { videoWidth: number; videoHeight: number },
  track: MediaStreamTrack | null,
  env: StillEnvironment = browserStillEnvironment(),
): Promise<Blob> {
  if (env.ImageCapture && env.decode && track && track.readyState !== 'ended') {
    try {
      const photo = await withTimeout(new env.ImageCapture(track).takePhoto(), TAKE_PHOTO_TIMEOUT_MS);
      const bitmap = await env.decode(photo);
      try {
        if (bitmap.width > 0 && bitmap.height > 0) {
          return await encodeStill(env, bitmap, bitmap.width, bitmap.height);
        }
      } finally {
        bitmap.close?.();
      }
    } catch {
      // Fall through to the frame: takePhoto is refused on some cameras.
    }
  }
  const { videoWidth: width, videoHeight: height } = video;
  if (!width || !height) throw new Error('The camera has no picture yet.');
  return encodeStill(env, video, width, height);
}

/** The still as the File the step's file input would have handed over. */
export function stillFile(blob: Blob, name: string, now: number = Date.now()): File {
  return new File([blob], name, { type: 'image/jpeg', lastModified: now });
}
