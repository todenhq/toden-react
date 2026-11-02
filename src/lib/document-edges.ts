// ─── Edge primitives for the document detector ──────────────────────────────
//
// Pure image processing, no external dependencies: grayscale, a directional
// Sobel pass, and the projections and fills the card search reads. Split out of
// hooks/useDocumentDetection.ts so the hook is only the camera loop.

/** A projection peak must reach this fraction of the strongest peak to count. */
const PEAK_REL_THRESHOLD = 0.32;
/** Cap candidate border lines per axis (keeps the rectangle search cheap). */
const MAX_PEAKS = 6;

/**
 * Convert RGBA ImageData to a grayscale Float32Array.
 * Uses the standard luminance formula: 0.299R + 0.587G + 0.114B.
 */
export function toGrayscale(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

/**
 * Compute the *directional* Sobel response, separated into:
 *   • `gx` — magnitude of the horizontal derivative → responds to VERTICAL edges
 *            (the left/right borders of a card).
 *   • `gy` — magnitude of the vertical derivative → responds to HORIZONTAL edges
 *            (the top/bottom borders of a card).
 * Keeping the two directions apart is what lets us look for four straight
 * borders independently instead of one undifferentiated blob of "edginess".
 */
export function directionalSobel(
  gray: Float32Array,
  w: number,
  h: number,
): { gx: Float32Array; gy: Float32Array } {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y - 1) * w + (x - 1)];
      const tc = gray[(y - 1) * w + x];
      const tr = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)];
      const mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)];
      const bc = gray[(y + 1) * w + x];
      const br = gray[(y + 1) * w + (x + 1)];

      const sx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const sy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const idx = y * w + x;
      gx[idx] = sx < 0 ? -sx : sx;
      gy[idx] = sy < 0 ? -sy : sy;
    }
  }
  return { gx, gy };
}

/** Mean + standard deviation of a Float32Array in a single pass. */
export function meanStd(arr: Float32Array): { mean: number; std: number } {
  let sum = 0;
  let sumSq = 0;
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    sum += arr[i];
    sumSq += arr[i] * arr[i];
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return { mean, std: Math.sqrt(Math.max(0, variance)) };
}

/** 3-tap moving average to smooth a projection array in-place. */
export function smooth3(arr: Float32Array): void {
  let prev = arr[0];
  for (let i = 1; i < arr.length - 1; i++) {
    const cur = arr[i];
    arr[i] = (prev + cur + arr[i + 1]) / 3;
    prev = cur;
  }
}

/**
 * Find the strongest, well-separated local maxima in a projection — these are
 * the candidate border lines. Returns positions sorted ascending.
 */
export function findPeaks(proj: Float32Array): number[] {
  const n = proj.length;
  let max = 0;
  for (let i = 0; i < n; i++) if (proj[i] > max) max = proj[i];
  if (max <= 0) return [];

  const thresh = max * PEAK_REL_THRESHOLD;
  const candidates: { pos: number; val: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = proj[i];
    if (v < thresh) continue;
    const prev = i > 0 ? proj[i - 1] : -Infinity;
    const next = i < n - 1 ? proj[i + 1] : -Infinity;
    if (v >= prev && v >= next) candidates.push({ pos: i, val: v });
  }

  // Greedily keep the strongest peaks, suppressing any within a few pixels of an
  // already-chosen one (avoids counting one thick border as two lines).
  candidates.sort((a, b) => b.val - a.val);
  const chosen: number[] = [];
  const minSep = 3;
  for (const c of candidates) {
    if (chosen.every((p) => Math.abs(p - c.pos) >= minSep)) {
      chosen.push(c.pos);
      if (chosen.length >= MAX_PEAKS) break;
    }
  }
  return chosen.sort((a, b) => a - b);
}

/**
 * Fraction of a horizontal line (row `r`, columns `left..right`) covered by
 * strong horizontal-edge pixels. Checks r-1/r/r+1 and takes the best, so a
 * border that lands between downscaled pixels still reads as continuous.
 */
export function horizontalFill(
  gy: Float32Array,
  r: number,
  left: number,
  right: number,
  w: number,
  h: number,
  thresh: number,
): number {
  const span = right - left + 1;
  if (span <= 0) return 0;
  let best = 0;
  for (let rr = r - 1; rr <= r + 1; rr++) {
    if (rr < 0 || rr >= h) continue;
    let count = 0;
    const base = rr * w;
    for (let x = left; x <= right; x++) if (gy[base + x] > thresh) count++;
    const frac = count / span;
    if (frac > best) best = frac;
  }
  return best;
}

/**
 * Fraction of a vertical line (column `c`, rows `top..bottom`) covered by strong
 * vertical-edge pixels. Checks c-1/c/c+1 and takes the best.
 */
export function verticalFill(
  gx: Float32Array,
  c: number,
  top: number,
  bottom: number,
  w: number,
  h: number,
  thresh: number,
): number {
  const span = bottom - top + 1;
  if (span <= 0) return 0;
  let best = 0;
  for (let cc = c - 1; cc <= c + 1; cc++) {
    if (cc < 0 || cc >= w) continue;
    let count = 0;
    for (let y = top; y <= bottom; y++) if (gx[y * w + cc] > thresh) count++;
    const frac = count / span;
    if (frac > best) best = frac;
  }
  return best;
}
