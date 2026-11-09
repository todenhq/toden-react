import { describe, it, expect } from 'vitest';
import {
  DOCUMENT_GUIDE_MAX_HEIGHT_FRACTION,
  DOCUMENT_GUIDE_TOP_SHIFT,
  DOCUMENT_GUIDE_WIDTH_FRACTION,
  documentCropRect,
  documentGuideRect,
} from './document-guide';

// A landscape sensor frame inside a tall portrait phone viewport — the case the
// shutter got wrong: object-cover shows a narrow slice, so storing the whole
// frame handed back a much wider photo than the user framed.
const FRAME = { width: 1920, height: 1080 };
const PHONE = { width: 390, height: 780 };
const CARD = 1.586;

describe('documentCropRect', () => {
  it('returns null when the frame has no dimensions yet', () => {
    expect(
      documentCropRect({
        frame: { width: 0, height: 0 },
        view: PHONE,
        aspect: CARD,
      }),
    ).toBeNull();
  });

  it('returns null when the viewport has not been laid out', () => {
    expect(
      documentCropRect({
        frame: FRAME,
        view: { width: 0, height: 0 },
        aspect: CARD,
      }),
    ).toBeNull();
  });

  it('crops well inside the frame rather than keeping all of it', () => {
    const crop = documentCropRect({ frame: FRAME, view: PHONE, aspect: CARD })!;
    expect(crop.width).toBeLessThan(FRAME.width);
    expect(crop.height).toBeLessThan(FRAME.height);
    expect(crop.x).toBeGreaterThan(0);
  });

  it('stays within the frame on every edge', () => {
    const crop = documentCropRect({ frame: FRAME, view: PHONE, aspect: CARD })!;
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(FRAME.width);
    expect(crop.y + crop.height).toBeLessThanOrEqual(FRAME.height);
  });

  it('preserves the document aspect, so the stored photo is not stretched', () => {
    const crop = documentCropRect({ frame: FRAME, view: PHONE, aspect: CARD })!;
    expect(crop.width / crop.height).toBeCloseTo(CARD, 1);
  });

  it('keeps a passport crop taller than a card crop at the same width', () => {
    const card = documentCropRect({ frame: FRAME, view: PHONE, aspect: CARD })!;
    const passport = documentCropRect({
      frame: FRAME,
      view: PHONE,
      aspect: 1.42,
    })!;
    // The MRZ band lives at the bottom of a passport page: a squarer guide must
    // take a taller region or the crop cuts it off.
    expect(passport.height / passport.width).toBeGreaterThan(
      card.height / card.width,
    );
  });

  it('is horizontally centred on the frame', () => {
    const crop = documentCropRect({ frame: FRAME, view: PHONE, aspect: CARD })!;
    const leftGap = crop.x;
    const rightGap = FRAME.width - (crop.x + crop.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
  });

  it('maps the guide back through the same cover transform the overlay used', () => {
    // Independent re-derivation: scale the guide by the cover factor and offset
    // by the overflow. If the crop ever stops agreeing with this, the user is
    // framing against one rectangle and receiving another.
    const f = Math.max(
      PHONE.width / FRAME.width,
      PHONE.height / FRAME.height,
    );
    const guide = documentGuideRect(PHONE, CARD);
    const expectedX = (guide.x + (FRAME.width * f - PHONE.width) / 2) / f;
    const expectedY = (guide.y + (FRAME.height * f - PHONE.height) / 2) / f;

    const crop = documentCropRect({ frame: FRAME, view: PHONE, aspect: CARD })!;
    expect(crop.x).toBeCloseTo(expectedX, 0);
    expect(crop.y).toBeCloseTo(expectedY, 0);
    expect(crop.width).toBeCloseTo(guide.width / f, 0);
  });

  it('handles a portrait frame in a portrait viewport', () => {
    const crop = documentCropRect({
      frame: { width: 1080, height: 1920 },
      view: PHONE,
      aspect: CARD,
    })!;
    expect(crop.width).toBeGreaterThan(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1080);
    expect(crop.y + crop.height).toBeLessThanOrEqual(1920);
  });

  it('crops the inline desktop box, which is landscape, not portrait', () => {
    // The desktop viewfinder is a 16:10 box showing a 16:9 webcam frame with
    // object-cover. It now paints the SAME guide as the phone, so one crop has
    // to hold for both orientations.
    const crop = documentCropRect({
      frame: { width: 1280, height: 720 },
      view: { width: 640, height: 400 },
      aspect: CARD,
    })!;
    expect(crop.width).toBeLessThan(1280);
    expect(crop.x).toBeGreaterThan(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1280);
    expect(crop.y + crop.height).toBeLessThanOrEqual(720);
    expect(crop.width / crop.height).toBeCloseTo(CARD, 1);
  });

  it('keeps the guide inside a wide, short viewport', () => {
    // Width-led sizing alone would overflow a landscape box; the height cap is
    // what keeps the guide inset. A guide taller than its viewfinder cannot be
    // framed against, and its crop would clamp to the frame edge.
    const view = { width: 1200, height: 500 };
    const guide = documentGuideRect(view, 1.42);
    expect(guide.height).toBeLessThanOrEqual(view.height);
    expect(guide.width).toBeLessThanOrEqual(view.width);
    expect(guide.y).toBeGreaterThanOrEqual(0);
  });

  it('never returns a zero-area crop on a tiny viewport', () => {
    const crop = documentCropRect({
      frame: FRAME,
      view: { width: 8, height: 8 },
      aspect: CARD,
    })!;
    expect(crop.width).toBeGreaterThanOrEqual(1);
    expect(crop.height).toBeGreaterThanOrEqual(1);
  });
});

describe('documentGuideRect for an upright slip', () => {
  // A NIN slip turned upright on a phone (lib/document-turn.ts).
  const UPRIGHT = 1 / 2.07;
  const VIEW = { width: 390, height: 844 };
  // The free band, its clear space from the top bar and the bottom row included.
  const BAND = { top: 112, bottom: 636 };

  it('fills the free band between the controls', () => {
    const guide = documentGuideRect(VIEW, UPRIGHT, BAND);
    expect(guide.y).toBeCloseTo(BAND.top, 5);
    expect(guide.y + guide.height).toBeCloseTo(BAND.bottom, 5);
    expect(guide.width / guide.height).toBeCloseTo(UPRIGHT, 5);
    expect(guide.x).toBeCloseTo((VIEW.width - guide.width) / 2, 5);
  });

  it('is longer than the landscape slip guide on the same phone', () => {
    const upright = documentGuideRect(VIEW, UPRIGHT, BAND);
    const landscape = documentGuideRect(VIEW, 2.07, BAND);
    expect(upright.height).toBeGreaterThan(landscape.width * 1.4);
  });

  it('caps its width at the usual share of the screen in a deep band', () => {
    const guide = documentGuideRect({ width: 390, height: 2000 }, UPRIGHT, { top: 0, bottom: 2000 });
    expect(guide.width).toBeCloseTo(390 * DOCUMENT_GUIDE_WIDTH_FRACTION, 5);
    expect(guide.width / guide.height).toBeCloseTo(UPRIGHT, 5);
  });

  it('leaves the inline (band-less) landscape guide nudged up and height-capped', () => {
    const inline = { width: 640, height: 360 };
    for (const aspect of [2.07, CARD, 1.42]) {
      const guide = documentGuideRect(inline, aspect);
      expect(guide.height).toBeLessThanOrEqual(inline.height * DOCUMENT_GUIDE_MAX_HEIGHT_FRACTION + 1e-9);
      expect(guide.y).toBeCloseTo((inline.height - guide.height) / 2 - DOCUMENT_GUIDE_TOP_SHIFT, 9);
    }
  });

  it('centres a landscape guide given a band, uncapped, as React Native does', () => {
    for (const aspect of [2.07, CARD, 1.42]) {
      const guide = documentGuideRect(VIEW, aspect, BAND);
      expect(guide.width).toBeCloseTo(VIEW.width * DOCUMENT_GUIDE_WIDTH_FRACTION, 9);
      expect(guide.height).toBeCloseTo(guide.width / aspect, 9);
      expect(guide.y + guide.height / 2).toBeCloseTo(VIEW.height / 2, 9);
    }
  });

  it('falls back to the width-led guide without a band, or with an empty one', () => {
    expect(documentGuideRect(VIEW, UPRIGHT, { top: 500, bottom: 500 })).toEqual(documentGuideRect(VIEW, UPRIGHT));
    const guide = documentGuideRect(VIEW, UPRIGHT);
    expect(guide.height).toBeLessThanOrEqual(VIEW.height);
  });

  it('crops the same band-fitted rectangle the overlay draws', () => {
    const frame = { width: 1080, height: 1920 };
    const guide = documentGuideRect(VIEW, UPRIGHT, BAND);
    const crop = documentCropRect({ frame, view: VIEW, aspect: UPRIGHT, band: BAND })!;
    const f = Math.max(VIEW.width / frame.width, VIEW.height / frame.height);
    expect(crop.y).toBeCloseTo((guide.y + (frame.height * f - VIEW.height) / 2) / f, 0);
    expect(crop.height).toBeCloseTo(guide.height / f, 0);
    expect(crop.width / crop.height).toBeCloseTo(UPRIGHT, 1);
  });
});
