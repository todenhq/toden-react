import { describe, expect, it } from 'vitest';
import {
  CARD_GUIDE_ASPECT,
  DOCUMENT_GUIDE_WIDTH_FRACTION,
  NIN_SLIP_GUIDE_ASPECT,
  PASSPORT_GUIDE_ASPECT,
  coverCropRect,
  documentCropRect,
  documentGuideRect,
} from './document-guide';
import { INLINE_VIEW_ASPECT, documentCropGuide, immersiveGuideBand } from './document-turn';
import {
  INLINE_COMPACT,
  INLINE_COMPACT_BELOW_HEIGHT,
  INLINE_GUIDE_GAP_ABOVE_SHUTTER,
  INLINE_GUIDE_GAP_BELOW_HINT,
  INLINE_REGULAR,
  inlineGuideBand,
  inlineHintBottom,
  inlineHintTop,
  inlineLayout,
  inlineShutterTop,
  inlineTopRowBottom,
} from './inline-layout';

// The inline (desktop) document camera: a 16:10 box with the top row, the
// instruction under it and the shutter at the bottom. The guide must sit
// between them with clear space, never under a control, at every box size.

const box = (width: number) => ({ width, height: width / INLINE_VIEW_ASPECT });

const BOXES = [
  { name: 'typical desktop (1350 wide)', size: box(1350) },
  { name: 'medium modal (900 wide)', size: box(900) },
  { name: 'narrow modal (448 wide)', size: box(448) },
  { name: 'very narrow (360 wide)', size: box(360) },
];

const DOCUMENTS = [
  { name: 'passport', aspect: PASSPORT_GUIDE_ASPECT },
  { name: 'card', aspect: CARD_GUIDE_ASPECT },
  { name: 'NIN slip', aspect: NIN_SLIP_GUIDE_ASPECT },
];

describe('inline camera layout', () => {
  for (const { name, size } of BOXES) {
    for (const doc of DOCUMENTS) {
      it(`keeps the ${doc.name} guide clear of every control in a ${name} box`, () => {
        // The desktop never turns a document: the box is landscape.
        expect(documentCropGuide(doc.aspect, { desktop: true, screenAspect: 0.5 }).turned).toBe(false);

        const l = inlineLayout(size.height);
        const guide = documentGuideRect(size, doc.aspect, inlineGuideBand(size));

        // At least 12 below the top row (document pill and side badge).
        expect(guide.y - inlineTopRowBottom(l)).toBeGreaterThanOrEqual(12);
        // The instruction, at its tallest, ends above the guide with clear space.
        expect(inlineHintTop(l)).toBeGreaterThanOrEqual(inlineTopRowBottom(l));
        expect(guide.y - inlineHintBottom(l)).toBeGreaterThanOrEqual(INLINE_GUIDE_GAP_BELOW_HINT - 1e-9);
        expect(INLINE_GUIDE_GAP_BELOW_HINT).toBeGreaterThanOrEqual(12);
        // At least 16 above the shutter.
        expect(inlineShutterTop(size.height, l) - (guide.y + guide.height)).toBeGreaterThanOrEqual(16 - 1e-9);
        expect(INLINE_GUIDE_GAP_ABOVE_SHUTTER).toBeGreaterThanOrEqual(16);

        // Inside the box, centred across it, its aspect kept.
        expect(guide.width).toBeGreaterThan(0);
        expect(guide.width / guide.height).toBeCloseTo(doc.aspect, 9);
        expect(guide.width).toBeLessThanOrEqual(size.width * DOCUMENT_GUIDE_WIDTH_FRACTION + 1e-9);
        expect(guide.x).toBeCloseTo((size.width - guide.width) / 2, 9);
        expect(guide.x).toBeGreaterThanOrEqual(0);
      });
    }
  }

  it('uses the full-size controls on a typical desktop and the compact ones in a narrow modal', () => {
    expect(inlineLayout(box(1350).height)).toBe(INLINE_REGULAR);
    expect(inlineLayout(box(448).height)).toBe(INLINE_COMPACT);
    expect(inlineLayout(INLINE_COMPACT_BELOW_HEIGHT)).toBe(INLINE_REGULAR);
    expect(inlineLayout(INLINE_COMPACT_BELOW_HEIGHT - 1)).toBe(INLINE_COMPACT);
    // The full-size shutter is the full-screen camera's 80.
    expect(INLINE_REGULAR.shutterSize).toBe(80);
  });

  it('gives the passport a large guide on a typical desktop', () => {
    const size = box(1350);
    const guide = documentGuideRect(size, PASSPORT_GUIDE_ASPECT, inlineGuideBand(size));
    // Height-limited by the band, so it fills it exactly.
    const band = inlineGuideBand(size);
    expect(guide.height).toBeCloseTo(band.bottom - band.top, 9);
    expect(guide.height).toBeGreaterThan(size.height * 0.6);
  });

  it('crops the same rectangle the overlay draws', () => {
    const frame = { width: 1920, height: 1080 };
    for (const { size } of BOXES) {
      for (const doc of DOCUMENTS) {
        const band = inlineGuideBand(size);
        const drawn = documentGuideRect(size, doc.aspect, band);
        expect(documentCropRect({ frame, view: size, aspect: doc.aspect, band })).toEqual(
          coverCropRect({ frame, view: size, guide: drawn }),
        );
      }
    }
  });

  it('leaves the full-screen landscape guide as it was: centred, its band unused', () => {
    const view = { width: 393, height: 852 };
    const band = immersiveGuideBand(view.height, 56, 34);
    for (const doc of DOCUMENTS) {
      const guide = documentGuideRect(view, doc.aspect, band);
      expect(guide.width).toBeCloseTo(view.width * DOCUMENT_GUIDE_WIDTH_FRACTION, 9);
      expect(guide.y + guide.height / 2).toBeCloseTo(view.height / 2, 9);
    }
  });
});
