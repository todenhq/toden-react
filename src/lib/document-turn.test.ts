import { describe, expect, it } from 'vitest';
import {
  TURN_MIN_DOCUMENT_ASPECT,
  applyMatrix,
  clockwiseQuarterTurns,
  counterClockwiseQuarterTurn,
  documentCropGuide,
  onScreenGuideAspect,
  turnsDocument,
} from './document-turn';
import {
  CARD_GUIDE_ASPECT,
  NIN_SLIP_GUIDE_ASPECT,
  PASSPORT_GUIDE_ASPECT,
} from './document-guide';

const PHONE = 390 / 780;
const LAPTOP = 16 / 10;

describe('turnsDocument', () => {
  it('turns a NIN slip upright in a tall camera view', () => {
    expect(turnsDocument(NIN_SLIP_GUIDE_ASPECT, PHONE)).toBe(true);
  });

  it('keeps a NIN slip landscape on a laptop webcam', () => {
    expect(turnsDocument(NIN_SLIP_GUIDE_ASPECT, LAPTOP)).toBe(false);
  });

  it('keeps it landscape in a square view, which is not taller than wide', () => {
    expect(turnsDocument(NIN_SLIP_GUIDE_ASPECT, 1)).toBe(false);
  });

  it('never turns a card or a passport page', () => {
    expect(turnsDocument(CARD_GUIDE_ASPECT, PHONE)).toBe(false);
    expect(turnsDocument(PASSPORT_GUIDE_ASPECT, PHONE)).toBe(false);
  });

  it('turns from 1.8 up, the same line as the native SDKs', () => {
    expect(TURN_MIN_DOCUMENT_ASPECT).toBe(1.8);
    expect(turnsDocument(1.8, PHONE)).toBe(true);
    expect(turnsDocument(1.79, PHONE)).toBe(false);
  });

  it('does not turn before the view has a size', () => {
    expect(turnsDocument(NIN_SLIP_GUIDE_ASPECT, 0)).toBe(false);
    expect(turnsDocument(NIN_SLIP_GUIDE_ASPECT, Number.NaN)).toBe(false);
  });
});

describe('onScreenGuideAspect', () => {
  it('is upright for a turned slip and unchanged otherwise', () => {
    expect(onScreenGuideAspect(NIN_SLIP_GUIDE_ASPECT, PHONE)).toBeCloseTo(1 / 2.07, 5);
    expect(onScreenGuideAspect(NIN_SLIP_GUIDE_ASPECT, LAPTOP)).toBe(NIN_SLIP_GUIDE_ASPECT);
    expect(onScreenGuideAspect(CARD_GUIDE_ASPECT, PHONE)).toBe(CARD_GUIDE_ASPECT);
  });
});

describe('counterClockwiseQuarterTurn', () => {
  // An upright crop of a slip: 400 wide, 828 tall.
  const W = 400;
  const H = 828;
  const turn = counterClockwiseQuarterTurn(W, H);

  it('stores the upright crop as a landscape photo', () => {
    expect(turn.width).toBe(H);
    expect(turn.height).toBe(W);
    expect(turn.width / turn.height).toBeCloseTo(2.07, 2);
  });

  it('undoes the clockwise framing: the slip top, at the right, becomes the top', () => {
    // The slip was held top-to-the-right, so its top edge is the crop's right edge.
    expect(applyMatrix(turn.matrix, { x: W, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(applyMatrix(turn.matrix, { x: W, y: H })).toEqual({ x: H, y: 0 });
    // Its bottom edge, the crop's left edge, becomes the bottom.
    expect(applyMatrix(turn.matrix, { x: 0, y: 0 })).toEqual({ x: 0, y: W });
    expect(applyMatrix(turn.matrix, { x: 0, y: H })).toEqual({ x: H, y: W });
  });

  it('keeps every pixel inside the turned photo', () => {
    for (const p of [{ x: 0, y: 0 }, { x: W, y: H }, { x: W / 2, y: H / 3 }]) {
      const q = applyMatrix(turn.matrix, p);
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.x).toBeLessThanOrEqual(turn.width);
      expect(q.y).toBeGreaterThanOrEqual(0);
      expect(q.y).toBeLessThanOrEqual(turn.height);
    }
  });
});

describe('documentCropGuide', () => {
  const phone = { desktop: false, screenAspect: PHONE };

  it('stands a NIN slip upright on a phone, as the camera guide does', () => {
    const crop = documentCropGuide(NIN_SLIP_GUIDE_ASPECT, phone);
    expect(crop.turned).toBe(true);
    expect(crop.aspect).toBeCloseTo(1 / NIN_SLIP_GUIDE_ASPECT);
    expect(crop.aspect).toBe(onScreenGuideAspect(NIN_SLIP_GUIDE_ASPECT, PHONE));
  });

  it('keeps cards and passports landscape on a phone', () => {
    expect(documentCropGuide(CARD_GUIDE_ASPECT, phone)).toEqual({ aspect: CARD_GUIDE_ASPECT, turned: false });
    expect(documentCropGuide(PASSPORT_GUIDE_ASPECT, phone)).toEqual({ aspect: PASSPORT_GUIDE_ASPECT, turned: false });
  });

  it('keeps a NIN slip landscape on a desktop, whose inline guide never turns', () => {
    // Even in a narrow window: the inline camera box is 16:10 whatever the window.
    expect(documentCropGuide(NIN_SLIP_GUIDE_ASPECT, { desktop: true, screenAspect: 0.6 })).toEqual({
      aspect: NIN_SLIP_GUIDE_ASPECT,
      turned: false,
    });
  });
});

describe('clockwiseQuarterTurns (the cropper\'s Rotate)', () => {
  const W = 400;
  const H = 300;
  const corners = (m: Parameters<typeof applyMatrix>[0]) =>
    [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: H },
      { x: 0, y: H },
    ].map((p) => applyMatrix(m, p));

  it('one turn moves the top-left corner to the top-right, and swaps the sides', () => {
    const turn = clockwiseQuarterTurns(W, H, 1);
    expect([turn.width, turn.height]).toEqual([H, W]);
    expect(corners(turn.matrix)).toEqual([
      { x: H, y: 0 },
      { x: H, y: W },
      { x: 0, y: W },
      { x: 0, y: 0 },
    ]);
  });

  it('keeps every corner on the turned canvas, for every number of turns', () => {
    for (const n of [0, 1, 2, 3, 4, 5]) {
      const turn = clockwiseQuarterTurns(W, H, n);
      for (const p of corners(turn.matrix)) {
        expect(p.x === 0 || p.x === turn.width).toBe(true);
        expect(p.y === 0 || p.y === turn.height).toBe(true);
      }
    }
  });

  it('three turns are the turn back an upright capture gets', () => {
    expect(clockwiseQuarterTurns(W, H, 3)).toEqual(counterClockwiseQuarterTurn(W, H));
  });

  it('a sideways scan turned once fits the upright slip box', () => {
    // A landscape slip photo, turned a quarter, is upright like the box.
    const turned = clockwiseQuarterTurns(2070, 1000, 1);
    expect(turned.width / turned.height).toBeCloseTo(1 / NIN_SLIP_GUIDE_ASPECT);
  });
});
