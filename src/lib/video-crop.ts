import { compressDocumentImage } from '../utils/image';
import { DOCUMENT_IMAGE_QUALITY, logCaptureSize } from './capture-settings';
import { bleedCropRect, type DocumentQuad, type PixelRect } from './document-corners';
import { turnCanvasBack } from './document-turn';

/**
 * One region of the current video frame as a JPEG data URL, at full sensor
 * resolution (the server's OCR, MRZ and barcode readers need the detail). The
 * whole frame when `crop` is null. Null when the browser gives no 2D context.
 *
 * `turnBack` is for a long document framed upright (lib/document-turn.ts): the
 * crop is turned a quarter counter-clockwise, so the stored photo is landscape.
 */
export function cropVideoFrame(
  video: HTMLVideoElement,
  crop: PixelRect | null,
  { turnBack = false }: { turnBack?: boolean } = {},
): string | null {
  const width = crop ? crop.width : video.videoWidth;
  const height = crop ? crop.height : video.videoHeight;
  if (width <= 0 || height <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (crop) ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  else ctx.drawImage(video, 0, 0);
  // A turn the browser cannot do keeps the upright photo: the server detects
  // page rotation, and losing the capture would be worse.
  const out = turnBack ? (turnCanvasBack(canvas) ?? canvas) : canvas;
  return out.toDataURL('image/jpeg', DOCUMENT_IMAGE_QUALITY);
}

/**
 * The auto-capture photo: the document's corners plus the bleed past them
 * (bleedCropRect), compressed for upload, turned back to landscape when it was
 * framed upright. `crop` stays in video pixels. Null when the frame cannot be read.
 */
export async function captureDocumentQuad(
  video: HTMLVideoElement,
  quad: DocumentQuad,
  { turnBack = false }: { turnBack?: boolean } = {},
): Promise<{ image: string; crop: PixelRect } | null> {
  const crop = bleedCropRect(quad, { width: video.videoWidth, height: video.videoHeight });
  const raw = cropVideoFrame(video, crop, { turnBack });
  if (!raw) return null;
  try {
    const image = await compressDocumentImage(raw);
    logCaptureSize('document still (cropped)', image);
    return { image, crop };
  } catch {
    return { image: raw, crop }; // compression failed: the raw crop still reads
  }
}
