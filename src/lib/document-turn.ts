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
