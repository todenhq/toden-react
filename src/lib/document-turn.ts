// ─── Turning a long document upright ────────────────────────────────────────
//
// A Nigerian NIN slip is about twice as long as it is tall (2.07). In a phone
// held upright, a landscape frame of that shape is limited by the screen's
// width and the slip comes out small. Turned upright, it uses the screen's
// height between the camera's controls: on a typical phone about 1.3 times the
// detail each way (about 1.6 times the pixels).
//
// So on a tall camera view a long document is framed turned a quarter
// CLOCKWISE (its top edge facing the right of the screen), and the photo is
// turned back a quarter counter-clockwise before it is stored, so the review,
// the upload and the server all see an ordinary landscape slip. If the person
// holds it the other way round the server still copes: it detects page
// rotation. A laptop webcam, or any landscape view, keeps today's frame.
//
// The same rule (and the same numbers) lives in the React Native and Flutter
// SDKs: change it in all three.

import type { GuideBand } from './document-guide';
import {
  bottomRowReserve,
  GUIDE_GAP_ABOVE_CONTROLS,
  GUIDE_GAP_BELOW_TOP_BAR,
  TOP_BAR_HEIGHT,
  topBarTop,
} from './immersive-layout';

/** Only a document at least this long (width over height) is ever turned. */
export const TURN_MIN_DOCUMENT_ASPECT = 1.8;

/**
 * True when a document of `documentAspect` (width / height, landscape) should
 * be framed upright in a camera view of `viewAspect` (width / height): the
 * document is long and the view is taller than wide. Unknown or empty sizes
 * never turn.
 */
export function turnsDocument(documentAspect: number, viewAspect: number): boolean {
  if (!Number.isFinite(documentAspect) || !Number.isFinite(viewAspect) || viewAspect <= 0) {
    return false;
  }
  return documentAspect >= TURN_MIN_DOCUMENT_ASPECT && viewAspect < 1;
}

/** The on-screen guide aspect: upright (1 / aspect) when turned, else as is. */
export function onScreenGuideAspect(documentAspect: number, viewAspect: number): number {
  return turnsDocument(documentAspect, viewAspect) ? 1 / documentAspect : documentAspect;
}

/** The inline (desktop) camera box's width over height (DocumentCaptureStep). */
export const INLINE_VIEW_ASPECT = 16 / 10;

/**
 * The crop box for a picked photo, shaped as the camera guide would be on this
 * device: the camera view is the inline box on a desktop, which never turns,
 * and the full screen on a phone, so there the screen's shape decides. A
 * `turned` crop is turned back to landscape before it is stored, as an upright
 * capture is.
 */
export function documentCropGuide(
  documentAspect: number,
  { desktop, screenAspect }: { desktop: boolean; screenAspect: number },
): { aspect: number; turned: boolean } {
  const viewAspect = desktop ? INLINE_VIEW_ASPECT : screenAspect;
  return {
    aspect: onScreenGuideAspect(documentAspect, viewAspect),
    turned: turnsDocument(documentAspect, viewAspect),
  };
}

/**
 * The canvas transform that turns a `width` × `height` image a quarter
 * counter-clockwise, undoing the clockwise turn it was framed with. The result
 * is `height` wide and `width` tall. `matrix` is `[a, b, c, d, e, f]` for
 * `CanvasRenderingContext2D.setTransform`: a source pixel (x, y) lands at
 * (y, width - x), so the source's right edge (the slip's top) becomes the top.
 */
export function counterClockwiseQuarterTurn(
  width: number,
  height: number,
): { width: number; height: number; matrix: [number, number, number, number, number, number] } {
  return { width: height, height: width, matrix: [0, -1, 1, 0, 0, width] };
}

/** Where a source point lands under counterClockwiseQuarterTurn's matrix. */
export function applyMatrix(
  matrix: readonly [number, number, number, number, number, number],
  point: { x: number; y: number },
): { x: number; y: number } {
  const [a, b, c, d, e, f] = matrix;
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f };
}

/**
 * The canvas transform that turns a `width` × `height` image `turns` quarter
 * turns CLOCKWISE (the photo cropper's Rotate), in the same `[a, b, c, d, e, f]`
 * form. An odd number of turns swaps the width and the height.
 */
export function clockwiseQuarterTurns(
  width: number,
  height: number,
  turns: number,
): { width: number; height: number; matrix: [number, number, number, number, number, number] } {
  switch (((turns % 4) + 4) % 4) {
    case 1: // (x, y) lands at (height - y, x)
      return { width: height, height: width, matrix: [0, 1, -1, 0, height, 0] };
    case 2:
      return { width, height, matrix: [-1, 0, 0, -1, width, height] };
    case 3:
      return counterClockwiseQuarterTurn(width, height);
    default:
      return { width, height, matrix: [1, 0, 0, 1, 0, 0] };
  }
}

/**
 * A new canvas holding `source` turned a quarter counter-clockwise. Null when
 * the browser gives no 2D context, so the caller keeps the unturned photo
 * rather than losing it.
 */
export function turnCanvasBack(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const turn = counterClockwiseQuarterTurn(source.width, source.height);
  const canvas = document.createElement('canvas');
  canvas.width = turn.width;
  canvas.height = turn.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(...turn.matrix);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/**
 * The screen space above and below the free band an upright guide may use on
 * the full-screen camera, in the same form as the React Native SDK's
 * immersiveBand. An upright guide is a turned NIN slip, whose hint is drawn
 * turned beside it (turned-hint.ts), so above it is only the top bar (back,
 * document pill, side badge) and 16 of clear space; below it, 24 of clear
 * space and the bottom row (upload, shutter, torch). The numbers are the
 * overlay's own (immersive-layout.ts), so the band always matches what is
 * drawn.
 */
export function immersiveBand(topInset: number, bottomInset: number): { topReserve: number; bottomReserve: number } {
  return {
    topReserve: topBarTop(topInset) + TOP_BAR_HEIGHT + GUIDE_GAP_BELOW_TOP_BAR,
    bottomReserve: bottomRowReserve(bottomInset) + GUIDE_GAP_ABOVE_CONTROLS,
  };
}

/**
 * immersiveBand as the free stretch of a view `height` tall
 * (document-guide.ts GuideBand), which documentGuideRect fits an upright guide
 * to, centred, exactly as the React Native guideRect does.
 */
export function immersiveGuideBand(height: number, topInset: number, bottomInset: number): GuideBand {
  const { topReserve, bottomReserve } = immersiveBand(topInset, bottomInset);
  return { top: topReserve, bottom: height - bottomReserve };
}
