// ─── Card search ────────────────────────────────────────────────────────────
//
// Finds the document in a downscaled frame: four straight, continuous borders,
// a card-shaped aspect and a plausible size. Its four corners are the corners
// the capture gate (document-corners.ts) judges.

import type { DocumentQuad } from './document-corners';
import {
  meanStd,
  smooth3,
  findPeaks,
  horizontalFill,
  verticalFill,
} from './document-edges';

/**
 * Target aspect ratio. Most supported documents are ISO/IEC 7810 ID-1 cards
 * (85.60 mm × 53.98 mm ≈ 1.586); passport data pages are a bit squarer (~1.42).
 * A NIN slip is longer (about 2.07). We accept a band that covers all three, but NOT portrait
 * shapes (a head/face crop is roughly square-to-portrait, ratio ≲ 1.1).
 */
const RATIO_MIN = 1.15;
// A NIN slip is longer than a card: 2.00 to 2.32 measured (median 2.07).
const RATIO_MAX = 2.45;

/**
 * A long document framed upright on a tall screen (lib/document-turn.ts) is
 * searched for in that shape instead: a slip of 1.45 to 2.45 turned a quarter,
 * so about 0.41 to 0.69. The band stays well below a face or a head and
 * shoulders (about 0.75 and up), so the face-rejecting gate still holds.
 */
const UPRIGHT_LONG_SIDE_MIN = 1.45;
const UPRIGHT_RATIO_MIN = 1 / RATIO_MAX;
const UPRIGHT_RATIO_MAX = 1 / UPRIGHT_LONG_SIDE_MIN;

/** Card bounding box must cover this fraction of the frame (area). */
const MIN_AREA_FRACTION = 0.1;
const MAX_AREA_FRACTION = 0.95;

/** Minimum separation between a border pair, as a fraction of the frame. */
const MIN_WIDTH_FRACTION = 0.3;
const MIN_HEIGHT_FRACTION = 0.18;

/**
 * The KEY discriminator between a card and a face: every one of the four
 * borders must be a *continuous, straight, high-contrast line*. Each side must
 * have at least this fraction of its length covered by strong edge pixels.
 * A face's bounding box has, at best, one or two coincidental straight sides —
 * never four — so it can no longer pass.
 */
const BORDER_MIN_FILL = 0.55;

/** A rectangle in detection-canvas pixels. */
export interface DetectRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Find the best card-shaped rectangle whose four sides are all continuous
 * straight borders. Returns bounds in detection-canvas coordinates, or null.
 *
 * Strategy:
 *   1. Top/bottom borders are horizontal lines → peaks in the row projection of
 *      |gy|. Left/right borders are vertical lines → peaks in the column
 *      projection of |gx|.
 *   2. For every pair of horizontal peaks × pair of vertical peaks, form a
 *      rectangle, cheaply reject on aspect ratio + area, then require ALL FOUR
 *      sides to be continuous high-contrast borders (the face-rejecting gate).
 *   3. Score the survivors and return the best.
 */
export function findCardBounds(
  gx: Float32Array,
  gy: Float32Array,
  w: number,
  h: number,
  /** Width over height of the real frame. The frame is squashed into the w×h canvas, so a shape is measured in canvas units and corrected by this. */
  frameAspect = w / h,
  /** True while a long document is framed upright: search for the turned shape. */
  upright = false,
): DetectRect | null {
  const squash = frameAspect / (w / h);
  const ratioMin = upright ? UPRIGHT_RATIO_MIN : RATIO_MIN;
  const ratioMax = upright ? UPRIGHT_RATIO_MAX : RATIO_MAX;
  // Per-axis edge thresholds — a pixel counts as a "strong" border pixel when it
  // sits clearly above the frame's typical gradient.
  const sx = meanStd(gx);
  const sy = meanStd(gy);
  const vThresh = sx.mean + 0.6 * sx.std; // for vertical (left/right) borders
  const hThresh = sy.mean + 0.6 * sy.std; // for horizontal (top/bottom) borders

  // Row projection of horizontal-edge energy, column projection of vertical-edge
  // energy. Each card border concentrates into a sharp peak here.
  const rowProj = new Float32Array(h);
  const colProj = new Float32Array(w);
  for (let y = 0; y < h; y++) {
    const base = y * w;
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gy[base + x];
      colProj[x] += gx[base + x];
    }
    rowProj[y] = rowSum;
  }
  smooth3(rowProj);
  smooth3(colProj);

  const hPeaks = findPeaks(rowProj); // candidate top/bottom rows
  const vPeaks = findPeaks(colProj); // candidate left/right cols
  if (hPeaks.length < 2 || vPeaks.length < 2) return null;

  const minH = MIN_HEIGHT_FRACTION * h;
  const minW = MIN_WIDTH_FRACTION * w;
  const frameArea = w * h;

  let best: DetectRect | null = null;
  let bestScore = -1;

  for (let a = 0; a < hPeaks.length; a++) {
    const top = hPeaks[a];
    for (let b = a + 1; b < hPeaks.length; b++) {
      const bottom = hPeaks[b];
      const bh = bottom - top;
      if (bh < minH) continue;

      for (let c = 0; c < vPeaks.length; c++) {
        const left = vPeaks[c];
        for (let d = c + 1; d < vPeaks.length; d++) {
          const right = vPeaks[d];
          const bw = right - left;
          if (bw < minW) continue;

          // Cheap geometric rejects first.
          const ratio = (bw / bh) * squash;
          if (ratio < ratioMin || ratio > ratioMax) continue;
          const areaFrac = (bw * bh) / frameArea;
          if (areaFrac < MIN_AREA_FRACTION || areaFrac > MAX_AREA_FRACTION) continue;

          // The expensive, decisive test: are all four sides real borders?
          const tf = horizontalFill(gy, top, left, right, w, h, hThresh);
          if (tf < BORDER_MIN_FILL) continue;
          const bf = horizontalFill(gy, bottom, left, right, w, h, hThresh);
          if (bf < BORDER_MIN_FILL) continue;
          const lf = verticalFill(gx, left, top, bottom, w, h, vThresh);
          if (lf < BORDER_MIN_FILL) continue;
          const rf = verticalFill(gx, right, top, bottom, w, h, vThresh);
          if (rf < BORDER_MIN_FILL) continue;

          const minFill = Math.min(tf, bf, lf, rf);
          const avgFill = (tf + bf + lf + rf) / 4;

          // Prefer a well-centered candidate (correlates with the on-screen
          // guide frame) and a fuller rectangle.
          const cx = (left + right) / 2 / w;
          const cy = (top + bottom) / 2 / h;
          const centerDist = Math.hypot(cx - 0.5, cy - 0.5);
          const centerBonus = 0.15 * (1 - Math.min(centerDist / 0.5, 1));

          const score = minFill * 0.6 + avgFill * 0.25 + centerBonus;
          if (score > bestScore) {
            bestScore = score;
            best = { top, bottom, left, right };
          }
        }
      }
    }
  }

  return best;
}

/**
 * The four corners of a found rectangle, normalised to the frame it was found
 * in. The detector squashes the whole frame into its canvas, so dividing by the
 * canvas size gives captured-frame coordinates directly, whatever the aspect.
 */
export function quadFromDetectRect(
  rect: DetectRect,
  canvas: { width: number; height: number },
): DocumentQuad {
  const l = rect.left / canvas.width;
  const r = rect.right / canvas.width;
  const t = rect.top / canvas.height;
  const b = rect.bottom / canvas.height;
  return {
    topLeft: { x: l, y: t },
    topRight: { x: r, y: t },
    bottomRight: { x: r, y: b },
    bottomLeft: { x: l, y: b },
  };
}

/** The quad's bounding box in the pixels of a frame of `frame`'s size. */
export function quadPixelBounds(
  quad: DocumentQuad,
  frame: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const pts = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  return {
    x: minX * frame.width,
    y: minY * frame.height,
    width: (maxX - minX) * frame.width,
    height: (maxY - minY) * frame.height,
  };
}
