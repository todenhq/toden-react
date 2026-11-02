// Is the light good enough for liveness? Judged on the FACE, not the frame.
//
// The check averaged the whole camera frame, so a well-lit face in front of a
// dark wall or a dark room read as "too dark" and the person was told to move
// somewhere brighter when nothing was wrong with how they were lit (the room
// behind them was most of the frame). Dark skin lowered the average further.
// The server's selfie check measures the face for the same reason
// (kyc-core src/lib/image-quality/face-quality.ts).
//
// So: when Face Mesh has found a face, measure the skin in the middle of it
// (forehead to upper lip, inside the cheeks), which leaves out the background,
// the hair and a beard. With no face, fall back to the whole frame: a room too
// dark to find a face in is exactly when the warning matters.
//
// PURE: no DOM. useLightLevel feeds it pixels.

/** A face's bounding box, normalised 0..1 to the video frame. */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Lighting thresholds on a 0..255 mean-luminance scale, per what is measured.
 * The frame lines are the original ones (kept in step with the mobile SDKs).
 * The face lines sit below the server's face floor (55), because skin is
 * darker than a lit wall and a false "move somewhere brighter" costs a real
 * person their capture: the server still measures the selfie it receives.
 */
export const LIGHT_THRESHOLDS = {
  frame: { dark: 62, bright: 200 },
  face: { dark: 45, bright: 215 },
} as const;

export type LightLevel = 'ok' | 'dark' | 'bright';

/** The part of the face that is skin in nearly everyone: inside the cheeks, forehead to upper lip. */
const SKIN = { left: 0.2, right: 0.8, top: 0.12, bottom: 0.68 } as const;

/** A box around the landmarks, or null when there are none. */
export function faceBoxOf(landmarks: ReadonlyArray<{ x: number; y: number }> | null | undefined): FaceBox | null {
  if (!landmarks || landmarks.length === 0) return null;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const x = Math.max(0, minX);
  const y = Math.max(0, minY);
  const width = Math.min(1, maxX) - x;
  const height = Math.min(1, maxY) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

/** The pixel rectangle of the face's skin within a sampled frame, or null when too small to read. */
export function skinRect(box: FaceBox, frameW: number, frameH: number): { x0: number; y0: number; x1: number; y1: number } | null {
  const x0 = Math.floor((box.x + box.width * SKIN.left) * frameW);
  const x1 = Math.ceil((box.x + box.width * SKIN.right) * frameW);
  const y0 = Math.floor((box.y + box.height * SKIN.top) * frameH);
  const y1 = Math.ceil((box.y + box.height * SKIN.bottom) * frameH);
  const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0);
  const cx1 = Math.min(frameW, x1), cy1 = Math.min(frameH, y1);
  // Fewer than ~24 pixels is a face too far away to judge by its skin.
  return (cx1 - cx0) * (cy1 - cy0) >= 24 ? { x0: cx0, y0: cy0, x1: cx1, y1: cy1 } : null;
}

/** Mean ITU-R BT.601 luminance of an RGBA buffer, over a rectangle or the whole frame. */
export function meanLuminance(
  data: ArrayLike<number>,
  frameW: number,
  frameH: number,
  rect?: { x0: number; y0: number; x1: number; y1: number } | null,
): number {
  const r = rect ?? { x0: 0, y0: 0, x1: frameW, y1: frameH };
  let sum = 0;
  let n = 0;
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0; x < r.x1; x++) {
      const i = (y * frameW + x) * 4;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** One reading: the face's skin when there is a face, else the whole frame. */
export function readLight(
  data: ArrayLike<number>,
  frameW: number,
  frameH: number,
  face: FaceBox | null,
): LightLevel {
  const rect = face ? skinRect(face, frameW, frameH) : null;
  const lines = rect ? LIGHT_THRESHOLDS.face : LIGHT_THRESHOLDS.frame;
  const brightness = meanLuminance(data, frameW, frameH, rect);
  if (brightness < lines.dark) return 'dark';
  if (brightness > lines.bright) return 'bright';
  return 'ok';
}
