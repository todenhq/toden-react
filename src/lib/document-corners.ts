// ─── Document corner gate ───────────────────────────────────────────────────
//
// A document is photographed only when all four of its corners have been found
// AND each sits a little way inside what the applicant can see. The space past
// the corners (the "bleed") is the point: people line a passport up against the
// bottom of the screen and cut its machine-readable zone in half, and a cut MRZ
// cannot be read. Requiring room past every corner, and keeping that room in
// the saved photo, means the strip is never clipped.
//
// Pure geometry, no camera or React dependency. The React Native and Flutter
// SDKs carry the same rule, tested against the same document-corners.vectors.json:
// change a number here and change it there, in the same commit.

/** A point normalised 0..1 in the CAPTURED frame: x right, y down. */
export interface Point {
  x: number;
  y: number;
}

export interface DocumentQuad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/** The part of the frame the preview actually shows, normalised 0..1. */
export interface VisibleRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// face_not_document: the box found is mostly the person's face (lib/face-in-document.ts).
export type CornersProblem = 'no_document' | 'corner_cut_off' | 'too_close' | 'face_not_document';

/**
 * Room required past every corner: a fraction of the FRAME's width on x and of
 * its height on y, measured from the edges of the visible region.
 */
export const CORNER_BLEED = 0.04;

/**
 * A corner this close to the edge was clipped by it. Detectors report a corner
 * that runs off the frame as sitting on (or a hair inside) the border, so a
 * corner here is treated as cut off rather than merely close.
 */
export const CORNER_EDGE_EPSILON = 0.005;

/** Smaller than this share of the frame is not a document someone is showing. */
export const MIN_QUAD_AREA_FRACTION = 0.05;

/** The whole frame is visible (no cover crop). */
export const FULL_FRAME: VisibleRegion = { left: 0, top: 0, right: 1, bottom: 1 };

function corners(q: DocumentQuad): Point[] {
  return [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft];
}

/**
 * Null, non-finite, non-convex, self-intersecting or too small to be a document.
 * A quadrilateral is convex and simple exactly when every turn goes the same
 * way: a crossed (bow-tie) quad always turns both ways.
 */
export function isDegenerateQuad(quad: DocumentQuad | null): boolean {
  if (!quad) return true;
  const pts = corners(quad);
  if (pts.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return true;

  let sign = 0;
  let twiceArea = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const c = pts[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) return true;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return true;
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twiceArea) / 2 < MIN_QUAD_AREA_FRACTION;
}

/**
 * What stops this quad from being photographed, or null when nothing does.
 * Checked in order: a degenerate quad, then any corner outside (or on the edge
 * of) the visible region, then any corner within the bleed of it.
 */
export function cornersProblem(
  quad: DocumentQuad | null,
  visible: VisibleRegion = FULL_FRAME,
  bleed: number = CORNER_BLEED,
): CornersProblem | null {
  if (!quad || isDegenerateQuad(quad)) return 'no_document';

  // Smallest gap from each corner to each edge of what the applicant can see.
  const gaps = corners(quad).map((p) =>
    Math.min(
      p.x - visible.left,
      visible.right - p.x,
      p.y - visible.top,
      visible.bottom - p.y,
    ),
  );
  if (gaps.some((g) => g < CORNER_EDGE_EPSILON)) return 'corner_cut_off';
  if (gaps.some((g) => g < bleed)) return 'too_close';
  return null;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Guards floor/ceil against float noise such as 0.07 * 100 = 7.000000000000001. */
const ROUNDING_SLACK = 1e-6;

/**
 * The crop of the captured frame: the quad's bounding box grown by `bleed` of
 * the frame on every side, clamped to the frame, in whole pixels (the origin
 * floored, the far edge ceiled). The saved photo therefore keeps space past the
 * corners, so a passport's MRZ is never cut by the crop either.
 */
export function bleedCropRect(
  quad: DocumentQuad,
  frame: { width: number; height: number },
  bleed: number = CORNER_BLEED,
): PixelRect {
  const pts = corners(quad);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, 0), hi);

  const left = clamp((Math.min(...xs) - bleed) * frame.width, frame.width);
  const top = clamp((Math.min(...ys) - bleed) * frame.height, frame.height);
  const right = clamp((Math.max(...xs) + bleed) * frame.width, frame.width);
  const bottom = clamp((Math.max(...ys) + bleed) * frame.height, frame.height);

  const x = Math.floor(left + ROUNDING_SLACK);
  const y = Math.floor(top + ROUNDING_SLACK);
  return {
    x,
    y,
    width: Math.ceil(right - ROUNDING_SLACK) - x,
    height: Math.ceil(bottom - ROUNDING_SLACK) - y,
  };
}

/**
 * The part of a frame an `object-fit: cover` preview of size `view` shows,
 * normalised to the frame. Cover scales the frame to fill the view and drops
 * the overflow equally on both sides, so a corner in that overflow is one the
 * applicant cannot see. Unknown sizes report the whole frame.
 */
export function coverVisibleRegion(
  frame: { width: number; height: number },
  view: { width: number; height: number } | null,
): VisibleRegion {
  if (!view || frame.width <= 0 || frame.height <= 0 || view.width <= 0 || view.height <= 0) {
    return FULL_FRAME;
  }
  const f = Math.max(view.width / frame.width, view.height / frame.height);
  const insetX = Math.max(0, (1 - view.width / (frame.width * f)) / 2);
  const insetY = Math.max(0, (1 - view.height / (frame.height * f)) / 2);
  return { left: insetX, top: insetY, right: 1 - insetX, bottom: 1 - insetY };
}
