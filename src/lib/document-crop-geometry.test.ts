import { describe, expect, it } from 'vitest';
import { CARD_GUIDE_ASPECT, NIN_SLIP_GUIDE_ASPECT } from './document-guide';
import { documentCropGuide } from './document-turn';
import {
  CROP_STAGE_INSET,
  MIN_CROP_WIDTH,
  clampCropRect,
  containRect,
  dragCropRect,
  initialCropRect,
  insetContainRect,
  quarterTurnScale,
  refitCropRect,
  turnedSize,
} from './document-crop-geometry';

// The photo cropper on a phone held upright (components/ImageCropper.tsx): its
// stage is the screen less the top bar, the help line and the bottom bar. The
// same numbers as the React Native SDK's documentCropGeometry.test.ts.
const STAGE = { w: 393, h: 640 };
const PHONE = { desktop: false, screenAspect: STAGE.w / STAGE.h };

describe('the crop box for a NIN slip on a phone', () => {
  const guide = documentCropGuide(NIN_SLIP_GUIDE_ASPECT, PHONE);

  it('stands upright, at the inverse of the slip', () => {
    expect(guide.turned).toBe(true);
    expect(guide.aspect).toBeCloseTo(1 / NIN_SLIP_GUIDE_ASPECT);
  });

  it('starts upright on a tall photo: 85% wide, capped at 90% high', () => {
    const img = containRect(3024, 4032, STAGE.w, STAGE.h);
    const box = initialCropRect(img, guide.aspect);
    expect(box.h).toBeGreaterThan(box.w);
    expect(box.w / box.h).toBeCloseTo(1 / NIN_SLIP_GUIDE_ASPECT);
    expect(box.h).toBeCloseTo(img.h * 0.9);
    expect(box.x).toBeGreaterThanOrEqual(img.x);
    expect(box.x + box.w).toBeLessThanOrEqual(img.x + img.w);
  });

  it('a card keeps a landscape box', () => {
    const card = documentCropGuide(CARD_GUIDE_ASPECT, PHONE);
    const box = initialCropRect(containRect(3024, 4032, STAGE.w, STAGE.h), card.aspect);
    expect(box.w / box.h).toBeCloseTo(CARD_GUIDE_ASPECT);
  });
});

describe('Rotate', () => {
  it("swaps the photo's sides on each odd turn", () => {
    expect(turnedSize({ w: 4032, h: 3024 }, 0)).toEqual({ w: 4032, h: 3024 });
    expect(turnedSize({ w: 4032, h: 3024 }, 1)).toEqual({ w: 3024, h: 4032 });
    expect(turnedSize({ w: 4032, h: 3024 }, 2)).toEqual({ w: 4032, h: 3024 });
    expect(turnedSize({ w: 4032, h: 3024 }, 3)).toEqual({ w: 3024, h: 4032 });
  });

  it('a sideways scan of a slip, turned once, fills more of the upright box', () => {
    const aspect = 1 / NIN_SLIP_GUIDE_ASPECT;
    const sideways = initialCropRect(containRect(2070, 1000, STAGE.w, STAGE.h), aspect);
    const t = turnedSize({ w: 2070, h: 1000 }, 1);
    const stood = initialCropRect(containRect(t.w, t.h, STAGE.w, STAGE.h), aspect);
    expect(stood.h).toBeGreaterThan(sideways.h * 2);
    // Refitted at the same aspect, inside the turned photo.
    expect(stood.w / stood.h).toBeCloseTo(aspect);
    const img = containRect(t.w, t.h, STAGE.w, STAGE.h);
    expect(clampCropRect(stood, img, aspect)).toEqual(stood);
  });
});

describe('the photo on the stage', () => {
  it('sits at least 16 inside every edge, so a handle never meets the screen edge', () => {
    for (const [w, h] of [[3024, 4032], [4032, 3024], [2070, 1000], [1000, 4000]] as const) {
      const img = insetContainRect(w, h, STAGE.w, STAGE.h);
      expect(img.x).toBeGreaterThanOrEqual(CROP_STAGE_INSET - 1e-9);
      expect(img.y).toBeGreaterThanOrEqual(CROP_STAGE_INSET - 1e-9);
      expect(STAGE.w - (img.x + img.w)).toBeGreaterThanOrEqual(CROP_STAGE_INSET - 1e-9);
      expect(STAGE.h - (img.y + img.h)).toBeGreaterThanOrEqual(CROP_STAGE_INSET - 1e-9);
      expect(img.w / img.h).toBeCloseTo(w / h);
    }
  });

  it('touches the inset on its limiting side, centred on the other', () => {
    const img = insetContainRect(4032, 3024, STAGE.w, STAGE.h);
    expect(img.x).toBeCloseTo(CROP_STAGE_INSET);
    expect(img.w).toBeCloseTo(STAGE.w - 2 * CROP_STAGE_INSET);
    expect(img.y + img.h / 2).toBeCloseTo(STAGE.h / 2);
  });
});

describe('the Rotate animation', () => {
  const stage = { w: STAGE.w, h: STAGE.h };
  const fits = (natW: number, natH: number) => {
    const from = insetContainRect(natW, natH, stage.w, stage.h);
    const turned = turnedSize({ w: natW, h: natH }, 1);
    const to = insetContainRect(turned.w, turned.h, stage.w, stage.h);
    const s = quarterTurnScale(from, to);
    // The turned view's on-screen box: its sides swap, then scale.
    return { from, to, s, shownW: from.h * s, shownH: from.w * s };
  };

  it('shrinks a portrait photo turning landscape to fit the stage, inside the inset', () => {
    const { from, to, s, shownW, shownH } = fits(3024, 4032);
    expect(s).toBeLessThan(1);
    expect(shownW).toBeCloseTo(to.w);
    expect(shownH).toBeCloseTo(to.h);
    expect(shownW).toBeLessThanOrEqual(stage.w - 2 * CROP_STAGE_INSET + 1e-9);
    expect(shownH).toBeLessThanOrEqual(stage.h - 2 * CROP_STAGE_INSET + 1e-9);
    // Turned about its own centre, which is the stage's centre, as is the target's.
    expect(from.x + from.w / 2).toBeCloseTo(to.x + to.w / 2);
    expect(from.y + from.h / 2).toBeCloseTo(to.y + to.h / 2);
  });

  it('grows a landscape photo turning portrait, and still fits', () => {
    const { s, shownW, shownH, to } = fits(4032, 3024);
    expect(s).toBeGreaterThan(1);
    expect(shownW).toBeCloseTo(to.w);
    expect(shownH).toBeCloseTo(to.h);
    expect(shownH).toBeLessThanOrEqual(stage.h - 2 * CROP_STAGE_INSET + 1e-9);
  });
});

describe('dragging the box', () => {
  const ar = CARD_GUIDE_ASPECT;
  const start = { x: 100, y: 200, w: 200, h: 200 / ar };
  const img = insetContainRect(4032, 3024, STAGE.w, STAGE.h);

  it('a corner keeps the opposite corner still, at the aspect', () => {
    const tl = dragCropRect('tl', start, -20, 0, ar);
    expect(tl.x + tl.w).toBeCloseTo(start.x + start.w);
    expect(tl.y + tl.h).toBeCloseTo(start.y + start.h);
    expect(tl.w / tl.h).toBeCloseTo(ar);
    const br = dragCropRect('br', start, 20, 0, ar);
    expect(br.x).toBe(start.x);
    expect(br.y).toBe(start.y);
    expect(br.w).toBe(220);
  });

  it('a mid-edge bar resizes about the middle of the opposite edge, keeping the aspect', () => {
    const r = dragCropRect('r', start, 30, 0, ar);
    expect(r.x).toBe(start.x);
    expect(r.y + r.h / 2).toBeCloseTo(start.y + start.h / 2);
    expect(r.w / r.h).toBeCloseTo(ar);
    const t = dragCropRect('t', start, 0, -10, ar);
    expect(t.y + t.h).toBeCloseTo(start.y + start.h);
    expect(t.x + t.w / 2).toBeCloseTo(start.x + start.w / 2);
    expect(t.w / t.h).toBeCloseTo(ar);
    const l = dragCropRect('l', start, -10, 0, ar);
    expect(l.x + l.w).toBeCloseTo(start.x + start.w);
    const b = dragCropRect('b', start, 0, 10, ar);
    expect(b.y).toBe(start.y);
  });

  it('moving keeps the size, and clamping keeps the box inside the photo and no narrower than 60', () => {
    const moved = clampCropRect(dragCropRect('move', start, -1000, 1000, ar), img, ar);
    expect(moved.w).toBe(start.w);
    expect(moved.x).toBeCloseTo(img.x);
    expect(moved.y + moved.h).toBeCloseTo(img.y + img.h);
    const tiny = clampCropRect(dragCropRect('br', start, -1000, 0, ar), img, ar);
    expect(tiny.w).toBe(MIN_CROP_WIDTH);
    expect(tiny.w / tiny.h).toBeCloseTo(ar);
  });
});

describe('a resized stage', () => {
  it('keeps the box on the same part of the photo', () => {
    const ar = CARD_GUIDE_ASPECT;
    const from = insetContainRect(4032, 3024, STAGE.w, STAGE.h);
    const to = insetContainRect(4032, 3024, 800, 600);
    const crop = initialCropRect(from, ar);
    const out = refitCropRect(crop, from, to, ar);
    expect((out.x - to.x) / to.w).toBeCloseTo((crop.x - from.x) / from.w);
    expect((out.y - to.y) / to.h).toBeCloseTo((crop.y - from.y) / from.h);
    expect(out.w / to.w).toBeCloseTo(crop.w / from.w);
  });
});
