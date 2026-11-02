import { describe, it, expect } from 'vitest';
import vectors from './document-corners.vectors.json';
import {
  CORNER_BLEED,
  CORNER_EDGE_EPSILON,
  MIN_QUAD_AREA_FRACTION,
  bleedCropRect,
  cornersProblem,
  coverVisibleRegion,
  isDegenerateQuad,
  type DocumentQuad,
} from './document-corners';

// The vector file is shared with the React Native and Flutter SDKs: the three
// implementations must give the same answer to every case in it.

const rect = (left: number, top: number, right: number, bottom: number): DocumentQuad => ({
  topLeft: { x: left, y: top },
  topRight: { x: right, y: top },
  bottomRight: { x: right, y: bottom },
  bottomLeft: { x: left, y: bottom },
});

describe('shared vectors', () => {
  it('uses the same constants as the vector file', () => {
    expect(CORNER_BLEED).toBe(vectors.bleed);
    expect(CORNER_EDGE_EPSILON).toBe(vectors.edgeEpsilon);
    expect(MIN_QUAD_AREA_FRACTION).toBe(vectors.minAreaFraction);
  });

  for (const v of vectors.problems) {
    it(`problem: ${v.name}`, () => {
      expect(cornersProblem(v.quad as DocumentQuad | null, v.visible)).toBe(v.expected);
    });
  }

  for (const v of vectors.crops) {
    it(`crop: ${v.name}`, () => {
      expect(bleedCropRect(v.quad as DocumentQuad, v.frame)).toEqual(v.expected);
    });
  }
});

describe('cornersProblem', () => {
  it('passes a card with room on every side', () => {
    expect(cornersProblem(rect(0.1, 0.2, 0.9, 0.75))).toBeNull();
  });

  it('reports no document when nothing was found', () => {
    expect(cornersProblem(null)).toBe('no_document');
  });

  it('cuts off a passport whose bottom edge sits on the frame edge (the MRZ case)', () => {
    expect(cornersProblem(rect(0.1, 0.3, 0.9, 1))).toBe('corner_cut_off');
  });

  it('cuts off a corner beyond the visible region', () => {
    expect(cornersProblem(rect(0.1, 0.2, 1.1, 0.75))).toBe('corner_cut_off');
  });

  it('is too close when a corner is inside but within the bleed', () => {
    expect(cornersProblem(rect(0.1, 0.2, 0.97, 0.75))).toBe('too_close');
  });

  it('measures the bleed from the visible region, not the frame', () => {
    const visible = { left: 0, top: 0.1, right: 1, bottom: 0.9 };
    expect(cornersProblem(rect(0.1, 0.13, 0.9, 0.7), visible)).toBe('too_close');
    expect(cornersProblem(rect(0.1, 0.05, 0.9, 0.7), visible)).toBe('corner_cut_off');
    expect(cornersProblem(rect(0.1, 0.2, 0.9, 0.7), visible)).toBeNull();
  });

  it('takes a custom bleed', () => {
    expect(cornersProblem(rect(0.1, 0.2, 0.9, 0.75), undefined, 0.15)).toBe('too_close');
  });

  it('passes a rotated card that sits well inside', () => {
    const quad: DocumentQuad = {
      topLeft: { x: 0.15, y: 0.25 },
      topRight: { x: 0.85, y: 0.15 },
      bottomRight: { x: 0.9, y: 0.7 },
      bottomLeft: { x: 0.2, y: 0.8 },
    };
    expect(cornersProblem(quad)).toBeNull();
  });
});

describe('isDegenerateQuad', () => {
  it('accepts either winding of a convex quad', () => {
    const q = rect(0.1, 0.2, 0.9, 0.75);
    const reversed: DocumentQuad = {
      topLeft: q.topLeft,
      topRight: q.bottomLeft,
      bottomRight: q.bottomRight,
      bottomLeft: q.topRight,
    };
    expect(isDegenerateQuad(q)).toBe(false);
    expect(isDegenerateQuad(reversed)).toBe(false);
  });

  it('rejects a non-convex (dented) quad', () => {
    const dented: DocumentQuad = {
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.9, y: 0.1 },
      bottomRight: { x: 0.5, y: 0.4 },
      bottomLeft: { x: 0.1, y: 0.9 },
    };
    expect(isDegenerateQuad(dented)).toBe(true);
  });

  it('rejects collinear corners and non-finite numbers', () => {
    expect(isDegenerateQuad(rect(0.1, 0.5, 0.9, 0.5))).toBe(true);
    expect(isDegenerateQuad(rect(0.1, 0.2, Number.NaN, 0.75))).toBe(true);
  });
});

describe('bleedCropRect', () => {
  it('grows the bounding box by the bleed of the frame on every side', () => {
    expect(bleedCropRect(rect(0.1, 0.2, 0.9, 0.75), { width: 1000, height: 500 })).toEqual({
      x: 60,
      y: 80,
      width: 880,
      height: 315,
    });
  });

  it('clamps to the frame', () => {
    expect(bleedCropRect(rect(0.01, 0.01, 0.99, 0.99), { width: 640, height: 480 })).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
  });

  it('rounds outwards to whole pixels, ignoring float noise', () => {
    // 0.07 * 100 is 7.000000000000001 in floating point; the edge is still 7.
    expect(bleedCropRect(rect(0.01, 0.01, 0.07, 0.07), { width: 100, height: 100 }, 0)).toEqual({
      x: 1,
      y: 1,
      width: 6,
      height: 6,
    });
    expect(bleedCropRect(rect(0.2005, 0.2005, 0.5005, 0.5005), { width: 1000, height: 1000 }, 0)).toEqual({
      x: 200,
      y: 200,
      width: 301,
      height: 301,
    });
  });
});

describe('coverVisibleRegion', () => {
  it('reports the whole frame when sizes are unknown', () => {
    expect(coverVisibleRegion({ width: 1920, height: 1080 }, null)).toEqual({
      left: 0,
      top: 0,
      right: 1,
      bottom: 1,
    });
  });

  it('drops the side overflow when a landscape frame fills a portrait view', () => {
    const v = coverVisibleRegion({ width: 1920, height: 1080 }, { width: 390, height: 780 });
    // Scaled to 780 tall the frame is 1386.67 wide; 390 of it shows.
    expect(v.top).toBe(0);
    expect(v.bottom).toBe(1);
    expect(v.left).toBeCloseTo((1 - 390 / 1386.6667) / 2, 4);
    expect(v.right).toBeCloseTo(1 - v.left, 10);
  });

  it('drops the top and bottom when the view is wider than the frame', () => {
    const v = coverVisibleRegion({ width: 1600, height: 1200 }, { width: 1600, height: 1000 });
    expect(v.left).toBe(0);
    expect(v.top).toBeCloseTo(1 / 12, 10);
    expect(v.bottom).toBeCloseTo(11 / 12, 10);
  });
});
