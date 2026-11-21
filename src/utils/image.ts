import {
  DOCUMENT_IMAGE_QUALITY,
  DOCUMENT_MAX_DIMENSION,
  DOCUMENT_MIN_WIDTH,
} from '../lib/capture-settings';

const MAX_SIZE_BYTES = 1_000_000; // 1 MB
const INITIAL_QUALITY = 0.7;
const QUALITY_STEP = 0.1;
const MIN_QUALITY = 0.1;
const MAX_DIMENSION = 1280;

function base64ToByteLength(base64: string): number {
  // Strip the data URI prefix if present
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  return Math.ceil((raw.length * 3) / 4);
}

function stripDataUri(base64: string): string {
  return base64.includes(',') ? base64.split(',')[1] : base64;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function ensureDataUri(base64: string): string {
  if (base64.startsWith('data:')) return base64;
  return `data:image/jpeg;base64,${base64}`;
}

/** Whether a data URI holds a JPEG. */
export function isJpegDataUri(dataUri: string): boolean {
  return /^data:image\/jpe?g[;,]/i.test(dataUri);
}

function canvasToBase64(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Flip a base64 image horizontally (mirror).
 * Used to correct front-camera / desktop-webcam captures before display and OCR.
 */
export async function flipImageHorizontally(base64Input: string): Promise<string> {
  const img = await loadImage(ensureDataUri(base64Input));
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return base64Input;
  ctx.save();
  ctx.translate(img.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Compress a base64 image to JPEG under 1 MB.
 *
 * 1. Loads the image onto a canvas.
 * 2. Scales down if either dimension exceeds MAX_DIMENSION (preserving aspect ratio).
 * 3. Re-encodes as JPEG, stepping down quality until the result is under 1 MB.
 *
 * Returns the compressed image as a full data-URI base64 string.
 */
export async function compressImage(base64Input: string): Promise<string> {
  // If already small enough, return as-is
  if (base64ToByteLength(stripDataUri(base64Input)) <= MAX_SIZE_BYTES) {
    return ensureDataUri(base64Input);
  }

  const img = await loadImage(ensureDataUri(base64Input));

  let { width, height } = img;

  // Scale down if needed
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.drawImage(img, 0, 0, width, height);

  // Iteratively lower quality until under the size limit
  let quality = INITIAL_QUALITY;
  let result = canvasToBase64(canvas, quality);

  while (
    base64ToByteLength(stripDataUri(result)) > MAX_SIZE_BYTES &&
    quality > MIN_QUALITY
  ) {
    quality -= QUALITY_STEP;
    result = canvasToBase64(canvas, Math.max(quality, MIN_QUALITY));
  }

  return result;
}

/**
 * Compress a DOCUMENT still image for server-side OCR (CONSERVATIVE).
 *
 * Unlike {@link compressImage}, this never steps quality down to hit a size
 * budget and never scales the image narrower than {@link DOCUMENT_MIN_WIDTH}.
 * OCR has to read small text (ID numbers, dates), so we keep the image sharp:
 *
 * 1. Only downscale when the longest edge exceeds {@link DOCUMENT_MAX_DIMENSION},
 *    and clamp so the width never drops below {@link DOCUMENT_MIN_WIDTH}.
 * 2. Encode at {@link DOCUMENT_IMAGE_QUALITY} (no quality step-down), unless it is
 *    already a JPEG within the limit, which is returned untouched: one lossy
 *    encode, never two.
 *
 * A JPEG at this quality/resolution is comfortably within the upload limit.
 */
export async function compressDocumentImage(base64Input: string): Promise<string> {
  const source = ensureDataUri(base64Input);
  const img = await loadImage(source);

  let { width, height } = img;

  // A JPEG already within the size limit is kept as it is. Encoding it again
  // would only soften it: each lossy pass blurs the fine edges a barcode's
  // modules and small print are made of, and the camera's still was encoded at
  // this quality a moment ago (lib/video-crop.ts).
  if (isJpegDataUri(source) && Math.max(width, height) <= DOCUMENT_MAX_DIMENSION) return source;

  // Downscale only oversized captures, and never below the OCR width floor.
  if (Math.max(width, height) > DOCUMENT_MAX_DIMENSION) {
    const scale = DOCUMENT_MAX_DIMENSION / Math.max(width, height);
    let nextWidth = Math.round(width * scale);
    let nextHeight = Math.round(height * scale);
    if (nextWidth < DOCUMENT_MIN_WIDTH && width >= DOCUMENT_MIN_WIDTH) {
      const floorScale = DOCUMENT_MIN_WIDTH / width;
      nextWidth = Math.round(width * floorScale);
      nextHeight = Math.round(height * floorScale);
    }
    width = nextWidth;
    height = nextHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.drawImage(img, 0, 0, width, height);

  return canvasToBase64(canvas, DOCUMENT_IMAGE_QUALITY);
}
