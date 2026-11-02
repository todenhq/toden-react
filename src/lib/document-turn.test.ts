import { describe, expect, it } from 'vitest';
import {
  TURN_MIN_DOCUMENT_ASPECT,
  applyMatrix,
  counterClockwiseQuarterTurn,
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
