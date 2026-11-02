// ─── Document guide geometry ────────────────────────────────────────────────
//
// THE single definition of where the capture guide sits, ported from the
// Flutter SDK's config/document_guide.dart. It is consumed by the on-screen
// overlay and must stay the definition the post-shutter crop uses too: if the
// two disagree the user frames against one rectangle and receives another,
// which is exactly what happened in Flutter when the scan overlay computed its
// own rect.

/** Share of the viewfinder width the guide spans. */
export const DOCUMENT_GUIDE_WIDTH_FRACTION = 0.88;

/** Upward nudge so the shutter button clears the guide's bottom edge. */
export const DOCUMENT_GUIDE_TOP_SHIFT = 20;

/**
 * Ceiling on the guide's height, as a share of the viewfinder.
 *
 * Width alone is not enough. Deriving height from width means a SQUARER
 * document (a passport page at 1.42 vs a card at 1.586) grows taller, and on a
 * wide phone it overflows. Capping the height keeps the guide inset on every
 * device and aspect.
 */
export const DOCUMENT_GUIDE_MAX_HEIGHT_FRACTION = 0.75;

export interface GuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The free stretch of the viewfinder between the controls drawn over it, in
 * the viewfinder's CSS pixels: `top` is where the top controls end, `bottom`
 * where the bottom controls begin.
 */
export interface GuideBand {
  top: number;
  bottom: number;
}

/** Room kept between an upright guide and the controls above and below it. */
export const UPRIGHT_GUIDE_BAND_MARGIN = 12;

/**
 * The guide rectangle inside a viewfinder of `size` for a document of `aspect`
 * (width / height). Fits BOTH dimensions: width-led, then height-capped,
 * preserving the aspect either way so a crop keeps the document's true
 * proportions.
 *
 * An UPRIGHT guide (aspect below 1, a long document turned on a tall screen,
 * see lib/document-turn.ts) sized from the width would run to most of the
 * screen's height, under the badges at the top and the hint and shutter at the
 * bottom. Given the free `band` between those controls it is fitted to that
 * band instead (less a small margin each end), still capped at the usual share
 * of the width. A landscape guide ignores the band, so every other document
 * frames exactly as before.
 *
 * This is the one rectangle the overlay paints, the sample sits on and the
 * guide-based crop takes, so pass all three the same band.
 */
export function documentGuideRect(
  size: { width: number; height: number },
  aspect: number,
  band?: GuideBand | null,
): GuideRect {
  if (aspect < 1 && band) {
    const top = Math.max(0, band.top) + UPRIGHT_GUIDE_BAND_MARGIN;
    const bottom = Math.min(size.height, band.bottom) - UPRIGHT_GUIDE_BAND_MARGIN;
    if (bottom - top > 0) {
      let height = bottom - top;
      let width = height * aspect;
      const maxWidth = size.width * DOCUMENT_GUIDE_WIDTH_FRACTION;
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspect;
      }
      return {
        x: (size.width - width) / 2,
        y: top + (bottom - top - height) / 2,
        width,
        height,
      };
    }
  }

  let width = size.width * DOCUMENT_GUIDE_WIDTH_FRACTION;
  let height = width / aspect;

  const maxHeight = size.height * DOCUMENT_GUIDE_MAX_HEIGHT_FRACTION;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  return {
    x: (size.width - width) / 2,
    y: (size.height - height) / 2 - DOCUMENT_GUIDE_TOP_SHIFT,
    width,
    height,
  };
}

/** Corner radius of the guide, matching the Flutter painter. */
export const DOCUMENT_GUIDE_RADIUS = 14;

/**
 * The region of a camera FRAME that the guide is sitting over, given a viewport
 * rendering that frame with `object-fit: cover`. Port of the Flutter SDK's
 * `_cropCardWorker` in services/image_service.dart.
 *
 * The shutter must store this region, not the whole frame. `object-cover`
 * scales the frame to fill the viewport and throws away the overflow, so a
 * phone holding a 1920×1080 sensor frame inside a tall portrait viewport shows
 * the user a narrow slice of it. Storing the full frame therefore hands back a
 * far wider, zoomed-out photo than the one they framed against the guide — the
 * document small and off-centre in it.
 *
 * Both mappings are derived from the same `documentGuideRect` the overlay
 * paints, so the crop cannot take a different rectangle than the one on screen.
 *
 * Returns null when the frame or viewport has no area yet (the video has not
 * reported dimensions); callers should keep the full frame in that case rather
 * than crop against numbers they do not have.
 */
export function coverCropRect(opts: {
  /** Frame size in video pixels (`video.videoWidth`/`videoHeight`). */
  frame: { width: number; height: number };
  /** The object-cover viewport size, in CSS pixels. */
  view: { width: number; height: number };
  /** The guide as painted, in viewport CSS pixels. */
  guide: GuideRect;
}): GuideRect | null {
  const { frame, view, guide } = opts;
  if (
    frame.width <= 0 ||
    frame.height <= 0 ||
    view.width <= 0 ||
    view.height <= 0
  ) {
    return null;
  }

  // object-cover: the scale (CSS px per frame px) that fills the viewport.
  const f = Math.max(view.width / frame.width, view.height / frame.height);

  // How far the scaled frame overflows the viewport on each side.
  const overflowX = (frame.width * f - view.width) / 2;
  const overflowY = (frame.height * f - view.height) / 2;

  // Viewport CSS px → scaled-frame px → frame px.
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), hi);
  const x = clamp(Math.round((guide.x + overflowX) / f), 0, frame.width - 1);
  const y = clamp(Math.round((guide.y + overflowY) / f), 0, frame.height - 1);

  return {
    x,
    y,
    width: clamp(Math.round(guide.width / f), 1, frame.width - x),
    height: clamp(Math.round(guide.height / f), 1, frame.height - y),
  };
}

/**
 * Crop region for the guide, in either viewfinder.
 *
 * Both the full-screen and the inline (desktop) layouts paint this same
 * rectangle, so there is one geometry to honour. The inline view briefly had
 * its own, which meant the crop had to carry a second rectangle just to match
 * it — two definitions of "where the document goes" is exactly how a capture
 * ends up disagreeing with its preview.
 */
export function documentCropRect(opts: {
  frame: { width: number; height: number };
  view: { width: number; height: number };
  aspect: number;
  /** The free band the overlay fitted an upright guide to (documentGuideRect). */
  band?: GuideBand | null;
}): GuideRect | null {
  return coverCropRect({
    frame: opts.frame,
    view: opts.view,
    guide: documentGuideRect(opts.view, opts.aspect, opts.band),
  });
}

/** An ID-1 card (85.6 mm × 53.98 mm). */
export const CARD_GUIDE_ASPECT = 85.6 / 53.98;
/** A passport data page is squarer, so its MRZ band is not cropped off. */
export const PASSPORT_GUIDE_ASPECT = 1.42;
/**
 * A Nigerian NIN slip is longer than a card. Measured on real slips: the paper
 * slip runs 2.00 to 2.32 (median 2.07); the card-style digital slip is near a
 * card, which the framing tolerance still accepts.
 */
export const NIN_SLIP_GUIDE_ASPECT = 2.07;

/** The guide's width over height for an ID type. Mirrors the native documentGuideAspect. */
export function documentGuideAspect(idType: string | null | undefined): number {
  if (idType === 'passport') return PASSPORT_GUIDE_ASPECT;
  if (idType === 'nin-slip') return NIN_SLIP_GUIDE_ASPECT;
  return CARD_GUIDE_ASPECT;
}
