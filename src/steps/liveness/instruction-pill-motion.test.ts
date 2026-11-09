import { describe, expect, it } from 'vitest';
import {
  PILL_FADE_BEZIER,
  PILL_MOTION_MS,
  PILL_SIZE_BEZIER,
  PILL_WIDTH_ALLOWANCE,
  cssBezier,
  pillContentWidth,
  pillMotionMs,
} from './instruction-pill-motion';

// The pill matches Flutter's AnimatedSize + AnimatedSwitcher: 220 ms,
// Curves.easeOutCubic for the size, Curves.easeOut for the crossfade.
describe('instruction pill motion', () => {
  it("uses Flutter's duration and curves", () => {
    expect(PILL_MOTION_MS).toBe(220);
    expect(cssBezier(PILL_SIZE_BEZIER)).toBe('cubic-bezier(0.215, 0.61, 0.355, 1)');
    // CSS's own `ease-out` is Flutter's Curves.easeOut.
    expect(cssBezier(PILL_FADE_BEZIER)).toBe('cubic-bezier(0, 0, 0.58, 1)');
  });

  it('does not move at all under reduced motion', () => {
    expect(pillMotionMs(true)).toBe(0);
    expect(pillMotionMs(false)).toBe(220);
  });
});

describe('pillContentWidth', () => {
  it('keeps the natural size until the new line is measured', () => {
    expect(pillContentWidth(null)).toBeNull();
    expect(pillContentWidth(undefined, 120)).toBeNull();
    expect(pillContentWidth(0)).toBeNull();
    expect(pillContentWidth(Number.NaN)).toBeNull();
  });

  it('is the new line once the old one has gone, rounded up with room to spare', () => {
    // A fraction never rounds down, and an exact measure still gets the
    // allowance: text laid out at exactly its measured width can wrap.
    expect(PILL_WIDTH_ALLOWANCE).toBeGreaterThanOrEqual(1);
    expect(pillContentWidth(80.2)).toBe(81 + PILL_WIDTH_ALLOWANCE);
    expect(pillContentWidth(80.0001)).toBe(81 + PILL_WIDTH_ALLOWANCE);
    expect(pillContentWidth(80, null)).toBe(80 + PILL_WIDTH_ALLOWANCE);
  });

  it('is never narrower than the line it was measured at', () => {
    for (const w of [1, 33.3333, 99.5, 150, 212.6667, 341.0001]) {
      expect(pillContentWidth(w)!).toBeGreaterThan(w);
      expect(pillContentWidth(w, w - 10)!).toBeGreaterThan(w);
    }
  });

  it('grows at once and shrinks only after the old line fades', () => {
    expect(pillContentWidth(200, 80)).toBe(200 + PILL_WIDTH_ALLOWANCE);
    expect(pillContentWidth(80, 200)).toBe(200 + PILL_WIDTH_ALLOWANCE);
    expect(pillContentWidth(80, Number.NaN)).toBe(80 + PILL_WIDTH_ALLOWANCE);
  });
});
