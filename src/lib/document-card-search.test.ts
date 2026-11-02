import { describe, it, expect } from 'vitest';
import { findCardBounds, quadFromDetectRect, quadPixelBounds } from './document-card-search';
import { toGrayscale, directionalSobel } from './document-edges';
import { cornersProblem } from './document-corners';
import { documentBoxFrom } from './document-framing-gate';

const W = 240;
const H = 150;

/** A dark frame with a bright card painted from (left, top) to (right, bottom). */
function frameWithCard(left: number, top: number, right: number, bottom: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = x >= left && x < right && y >= top && y < bottom;
      const v = inside ? 220 : 30;
      const o = (y * W + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = v;
      data[o + 3] = 255;
    }
  }
  return data;
}

function detect(data: Uint8ClampedArray) {
  const { gx, gy } = directionalSobel(toGrayscale(data, W, H), W, H);
  const rect = findCardBounds(gx, gy, W, H);
  return rect ? quadFromDetectRect(rect, { width: W, height: H }) : null;
}

describe('quadFromDetectRect', () => {
  it('normalises the corners to the canvas, whatever its aspect', () => {
    expect(quadFromDetectRect({ left: 24, right: 216, top: 30, bottom: 120 }, { width: W, height: H })).toEqual({
      topLeft: { x: 0.1, y: 0.2 },
      topRight: { x: 0.9, y: 0.2 },
      bottomRight: { x: 0.9, y: 0.8 },
      bottomLeft: { x: 0.1, y: 0.8 },
    });
  });
});

describe('quadPixelBounds', () => {
  it('maps the quad back to the pixels of the video frame', () => {
    const quad = quadFromDetectRect({ left: 24, right: 216, top: 30, bottom: 120 }, { width: W, height: H });
    const b = quadPixelBounds(quad, { width: 1920, height: 1080 });
    expect(b.x).toBeCloseTo(192, 6);
    expect(b.y).toBeCloseTo(216, 6);
    expect(b.width).toBeCloseTo(1536, 6);
    expect(b.height).toBeCloseTo(648, 6);
  });

  it('gives the framing gate a box inside the frame when normalised against the video', () => {
    // Regression: video-pixel bounds were divided by the 240x150 canvas, which
    // read every card as covering the frame many times over.
    const quad = quadFromDetectRect({ left: 24, right: 216, top: 30, bottom: 120 }, { width: W, height: H });
    const frame = { width: 1920, height: 1080 };
    const box = documentBoxFrom(quadPixelBounds(quad, frame), frame)!;
    expect(box.area).toBeCloseTo(0.48, 6);
    expect(box.edgeMargin).toBeCloseTo(0.1, 6);
  });
});

describe('detected corners through the gate', () => {
  it('finds the four corners of a card with room around it', () => {
    const quad = detect(frameWithCard(40, 30, 200, 125));
    expect(quad).not.toBeNull();
    expect(quad!.topLeft.x).toBeCloseTo(40 / W, 1);
    expect(quad!.bottomRight.y).toBeCloseTo(125 / H, 1);
    expect(cornersProblem(quad)).toBeNull();
  });

  it('never passes a card whose bottom edge runs off the frame (the cut MRZ)', () => {
    // Off the edge the bottom border cannot be seen at all: no document.
    expect(cornersProblem(detect(frameWithCard(40, 60, 200, H)))).toBe('no_document');
    // A pixel inside, it is found, but there is no room past it.
    expect(cornersProblem(detect(frameWithCard(40, 57, 200, H - 1)))).toBe('too_close');
  });

  it('asks for room when a side sits within the bleed', () => {
    expect(cornersProblem(detect(frameWithCard(6, 30, 166, 125)))).toBe('too_close');
  });

  it('reports a corner on the frame edge as cut off', () => {
    expect(cornersProblem(detect(frameWithCard(1, 30, 161, 125)))).toBe('corner_cut_off');
  });
});

describe('findCardBounds shape', () => {
  const rectOf = (data: Uint8ClampedArray, frameAspect?: number, upright?: boolean) => {
    const { gx, gy } = directionalSobel(toGrayscale(data, W, H), W, H);
    return findCardBounds(gx, gy, W, H, frameAspect, upright);
  };

  it('finds a NIN slip, which is longer than a card', () => {
    // 2.07 wide on a canvas the frame was not squashed into.
    expect(rectOf(frameWithCard(20, 30, 220, 127))).not.toBeNull();
  });

  it('measures the shape in the real frame, not the squashed canvas', () => {
    // On a 4:3 webcam, a card spans 1.33/1.6 of its canvas width: a canvas box
    // of 1.9 is really 1.58, a card.
    expect(rectOf(frameWithCard(30, 30, 210, 125), 4 / 3)).not.toBeNull();
    // A canvas box of 1.9 from a 16:9 camera is really 2.1, a slip, still fine;
    // a strip three times longer than tall is neither.
    expect(rectOf(frameWithCard(10, 50, 230, 110), 16 / 9)).toBeNull();
  });

  // A phone held upright: a 9:16 frame squashed into the 240x150 canvas.
  const PORTRAIT = 9 / 16;

  it('finds a NIN slip turned upright when told to look for one', () => {
    // A canvas box of 1.37 from a 9:16 frame is really 0.48: the slip turned.
    expect(rectOf(frameWithCard(55, 28, 185, 123), PORTRAIT, true)).not.toBeNull();
  });

  it('does not take an upright slip for a card unless it was framed upright', () => {
    expect(rectOf(frameWithCard(55, 28, 185, 123), PORTRAIT)).toBeNull();
  });

  it('still refuses a face-shaped box while looking for an upright slip', () => {
    // Really 0.8: a head and shoulders, not a slip turned on its side.
    expect(rectOf(frameWithCard(29, 35, 211, 115), PORTRAIT, true)).toBeNull();
  });

  it('does not find a landscape card while looking for an upright slip', () => {
    expect(rectOf(frameWithCard(30, 30, 210, 125), 4 / 3, true)).toBeNull();
  });
});
