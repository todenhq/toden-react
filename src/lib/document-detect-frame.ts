import { toGrayscale, directionalSobel } from './document-edges';
import { findCardBounds, quadFromDetectRect } from './document-card-search';
import type { DocumentQuad } from './document-corners';

/** Detection resolution: enough for thin borders to survive the downscale. */
export const DETECT_W = 240;
export const DETECT_H = 150;

/** "Stable" = moved less than this fraction of the frame in either axis. */
const STABILITY_FRACTION = 0.07;

/**
 * The document's corners in the current video frame, normalised to it, or null
 * when no card is found. The whole frame is squashed into the small canvas, so
 * the corners come back in captured-frame coordinates whatever the aspect.
 * Throws when the canvas cannot be read (no 2D context, a tainted frame): the
 * caller treats that as the detector being unavailable. `upright` searches for
 * a long document turned upright (lib/document-turn.ts).
 */
export function detectQuadInFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  upright = false,
): DocumentQuad | null {
  if (canvas.width !== DETECT_W || canvas.height !== DETECT_H) {
    canvas.width = DETECT_W;
    canvas.height = DETECT_H;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(video, 0, 0, DETECT_W, DETECT_H);
  const { data } = ctx.getImageData(0, 0, DETECT_W, DETECT_H);
  const gray = toGrayscale(data, DETECT_W, DETECT_H);
  const { gx, gy } = directionalSobel(gray, DETECT_W, DETECT_H);
  const frameAspect = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : DETECT_W / DETECT_H;
  const rect = findCardBounds(gx, gy, DETECT_W, DETECT_H, frameAspect, upright);
  return rect ? quadFromDetectRect(rect, { width: DETECT_W, height: DETECT_H }) : null;
}

type Box = { x: number; y: number; width: number; height: number };

/** True when the document moved too far between two frames to count as held. */
export function boundsMoved(a: Box, b: Box, frame: { width: number; height: number }): boolean {
  const w = STABILITY_FRACTION * frame.width;
  const h = STABILITY_FRACTION * frame.height;
  return (
    Math.abs(a.x - b.x) >= w ||
    Math.abs(a.y - b.y) >= h ||
    Math.abs(a.width - b.width) >= w ||
    Math.abs(a.height - b.height) >= h
  );
}
