import { describe, expect, it } from 'vitest';
import { faceBoxOf, meanLuminance, readLight, skinRect, LIGHT_THRESHOLDS } from './light-level';

const W = 96;
const H = 72;

/** An RGBA frame filled with `bg`, with `face` painted inside the box. */
function frame(bg: number, face?: { value: number; x0: number; y0: number; x1: number; y1: number }): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = face && x >= face.x0 && x < face.x1 && y >= face.y0 && y < face.y1;
      const v = inside ? face.value : bg;
      const i = (y * W + x) * 4;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
  }
  return data;
}

// A face filling the middle third of the frame, as in a liveness capture.
const box = { x: 1 / 3, y: 0.2, width: 1 / 3, height: 0.6 };
const facePixels = { x0: 32, y0: 14, x1: 64, y1: 58 };

describe('readLight', () => {
  it('passes a well-lit dark-skinned face in front of a dark room', () => {
    // The reported case: the room behind is near black, so the whole frame
    // averages far below the frame line, while the face itself is well lit.
    const data = frame(15, { value: 85, ...facePixels });
    expect(meanLuminance(data, W, H)).toBeLessThan(LIGHT_THRESHOLDS.frame.dark);
    expect(readLight(data, W, H, box)).toBe('ok');
  });

  it('still says too dark when the face itself is dark', () => {
    expect(readLight(frame(15, { value: 30, ...facePixels }), W, H, box)).toBe('dark');
  });

  it('judges the whole frame when no face has been found', () => {
    expect(readLight(frame(30), W, H, null)).toBe('dark');
    expect(readLight(frame(120), W, H, null)).toBe('ok');
    expect(readLight(frame(240), W, H, null)).toBe('bright');
  });

  it('says too bright when the face is washed out, whatever the room', () => {
    expect(readLight(frame(20, { value: 245, ...facePixels }), W, H, box)).toBe('bright');
  });

  it('falls back to the frame when the face is too small to read', () => {
    const tiny = { x: 0.5, y: 0.5, width: 0.02, height: 0.02 };
    expect(skinRect(tiny, W, H)).toBeNull();
    expect(readLight(frame(30), W, H, tiny)).toBe('dark');
  });
});

describe('faceBoxOf', () => {
  it('boxes the landmarks, clamped to the frame', () => {
    expect(faceBoxOf([{ x: 0.3, y: 0.2 }, { x: 0.7, y: 0.9 }, { x: -0.1, y: 0.5 }]))
      .toEqual({ x: 0, y: 0.2, width: 0.7, height: expect.closeTo(0.7, 6) });
  });

  it('answers null with no face', () => {
    expect(faceBoxOf(null)).toBeNull();
    expect(faceBoxOf([])).toBeNull();
  });
});
