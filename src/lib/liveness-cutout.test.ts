import { describe, expect, it } from 'vitest';
import {
  CUTOUT_ASPECT,
  DESKTOP_PICTURE_SHARE,
  DESKTOP_WINDOW_MARGIN,
  FACE_WINDOW_MAX_FILL,
  FACE_WINDOW_MIN_FILL,
  INSTRUCTION_ROOM,
  WINDOW_BELOW_KEEP,
  faceWindowFor,
  livenessCutout,
  windowTop,
  livenessTint,
  surroundPath,
  tintPath,
  windowOutline,
} from './liveness-cutout';
import { BLUR_WARMUP_FRAMES, BLUR_WINDOW_FRAMES, BlurBudget } from './blur-budget';
import { checkFacePosition } from '../liveness/gesture-detector/position';
import { L } from '../liveness/gesture-detector/landmarks';
import type { NormalizedLandmark } from '../liveness/types';

// The full-screen liveness camera's window. The same rules, and the same
// vectors, as the React Native and Flutter SDKs' tests.

describe('livenessCutout', () => {
  it('is capped on a tall phone and keeps the face shape', () => {
    const w = livenessCutout({ width: 440, height: 956 });
    expect(w.width).toBe(280);
    expect(w.height).toBeCloseTo(280 * CUTOUT_ASPECT);
  });

  it('is bounded by the height on a short phone, down to its floor', () => {
    expect(livenessCutout({ width: 320, height: 568 }).width).toBe(200);
  });

  it('is larger in the desktop modal, which no phone rule reaches', () => {
    // The modal's own floor: 680 tall. A phone rule gave 237 here.
    const w = livenessCutout({ width: 820, height: 680 });
    expect(w.width).toBeCloseTo((680 * 0.56) / CUTOUT_ASPECT);
    expect(w.width).toBeGreaterThan(280);
    expect(w.height).toBeCloseTo(w.width * CUTOUT_ASPECT);
    // The modal as it opens by default is as it was.
    expect(livenessCutout({ width: 761, height: 628 }).width).toBeCloseTo((628 * 0.56) / CUTOUT_ASPECT);
    // Just under the desktop width, the phone rule still applies.
    expect(livenessCutout({ width: 599, height: 1000 }).width).toBe(280);
  });
});

describe('the desktop window on a full screen', () => {
  // How wide a face is drawn, as a share of the window, for a person whose face
  // is `share` of a 4:3 webcam's picture.
  const fill = (frame: { width: number; height: number }, share: number) =>
    (share * Math.max(frame.width, (frame.height * 4) / 3)) / livenessCutout(frame).width;
  const screens = {
    laptop: { width: 1440, height: 900 },
    desktop: { width: 1920, height: 1080 },
    reported: { width: 2056, height: 1204 },
    ultrawide: { width: 3440, height: 1350 },
  };

  it('grows with the screen instead of stopping at the modal’s size', () => {
    // The screen it was reported on: the window was 330 wide and the person had to move back.
    const w = livenessCutout(screens.reported);
    expect(w.width).toBeCloseTo(2056 * DESKTOP_PICTURE_SHARE);
    expect(w.width).toBeGreaterThan(600);
    expect(livenessCutout(screens.laptop).width).toBeGreaterThan(440);
    expect(livenessCutout(screens.desktop).width).toBeGreaterThan(560);
  });

  it('never grows past what the screen’s height leaves for the words above and the panel below', () => {
    for (const frame of Object.values(screens)) {
      const w = livenessCutout(frame);
      const top = windowTop(frame, w);
      expect(w.height).toBeLessThanOrEqual(frame.height - 2 * DESKTOP_WINDOW_MARGIN + 0.01);
      // The instruction's pill fits over it, under the back button.
      expect(top - 20 - 60).toBeGreaterThanOrEqual(INSTRUCTION_ROOM);
      // The retry panel fits under it.
      expect(frame.height - top - w.height).toBeGreaterThanOrEqual(WINDOW_BELOW_KEEP - 0.01);
      expect(w.height).toBeCloseTo(w.width * CUTOUT_ASPECT);
    }
  });

  it('takes a person sitting at their screen without asking them to move back', () => {
    // A face about a fifth of a webcam's picture: someone at a laptop.
    for (const frame of [screens.laptop, screens.desktop, screens.reported]) {
      expect(fill(frame, 0.2)).toBeLessThan(FACE_WINDOW_MAX_FILL);
      expect(fill(frame, 0.2)).toBeGreaterThan(FACE_WINDOW_MIN_FILL);
    }
    // Under the old 330 cap the same person overflowed the window on every one of them.
    expect((0.2 * 2056) / 330).toBeGreaterThan(1);
  });

  it('is the same share of the picture in the modal and on a full screen, where the height allows', () => {
    const modal = { width: 761, height: 628 };
    const modalShare = livenessCutout(modal).width / ((628 * 4) / 3);
    const fullShare = livenessCutout(screens.reported).width / 2056;
    expect(Math.abs(modalShare - fullShare)).toBeLessThan(0.005);
  });
});

describe('the paths', () => {
  const frame = { width: 390, height: 844 };
  const window = { width: 280, height: 370 };

  it('the tint is the frame with the window taken out of its centre', () => {
    const d = tintPath(frame, window);
    expect(d).toContain('M0 0 H390 V844 H0 Z');
    expect(d.match(/M/g)?.length).toBe(2);
    // At the centre: the picture stands between the back and close buttons,
    // so this phone has all the room wanted above the window.
    expect(d).toContain('M55 377');
  });

  it('the flash surround cuts the window wherever it was measured', () => {
    const d = surroundPath({ width: 1280, height: 800 }, 500, 200, window);
    expect(d).toContain('M0 0 H1280 V800 H0 Z');
    expect(d).toContain('M500 340 A140 140 0 0 1 780 340');
  });

  it('the outline starts at twelve o clock and is as long as the window edge', () => {
    const { d, length } = windowOutline(window, 2);
    expect(d.startsWith('M140 2 ')).toBe(true);
    expect(length).toBeCloseTo(2 * Math.PI * 138 + 2 * 90);
  });
});

describe('livenessTint', () => {
  it('is thin over a blur, and heavier in a dark room', () => {
    expect(livenessTint({ dimRoom: false, blurs: true })).toBe(0.08);
    expect(livenessTint({ dimRoom: true, blurs: true })).toBe(0.66);
  });

  it('does the blur its job when there is none', () => {
    expect(livenessTint({ dimRoom: false, blurs: false })).toBe(0.74);
    expect(livenessTint({ dimRoom: true, blurs: false })).toBe(0.74);
  });
});

describe('the face against the window', () => {
  const window = faceWindowFor({
    frame: { width: 440, height: 956 },
    window: { width: 280, height: 369.6 },
    frameAspect: 9 / 16,
  });

  const face = (width: number, x = 0.5, y = 0.5): NormalizedLandmark[] => {
    const points: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    points[L.noseTip] = { x, y, z: 0 };
    points[L.leftCheek] = { x: x - width / 2, y, z: 0 };
    points[L.rightCheek] = { x: x + width / 2, y, z: 0 };
    return points;
  };

  it('is a share of the frame as it is drawn', () => {
    expect(window.width).toBeCloseTo(280 / 537.75, 3);
    expect(window.height).toBeCloseTo(369.6 / 956, 3);
  });

  it('a face that sits in the window needs nothing', () => {
    const pos = checkFacePosition(face(window.width * 0.65), undefined, { window });
    expect(pos.guidance).toBeNull();
    expect(pos.isCentered && pos.isCorrectDistance).toBe(true);
  });

  it('a face spilling over the window is too close, though fine for the frame', () => {
    const width = window.width; // about half the frame: fine in the modal's circle
    expect(checkFacePosition(face(width)).isCorrectDistance).toBe(true);
    expect(checkFacePosition(face(width), undefined, { window }).isCorrectDistance).toBe(false);
  });

  it('a small face is too far', () => {
    expect(checkFacePosition(face(window.width * 0.3), undefined, { window }).isCorrectDistance).toBe(false);
  });

  it('a face beside the window is off centre, on either axis', () => {
    const width = window.width * 0.65;
    expect(checkFacePosition(face(width, 0.5 + window.width * 0.3), undefined, { window }).isCentered).toBe(false);
    expect(checkFacePosition(face(width, 0.5, 0.5 - window.height * 0.3), undefined, { window }).isCentered).toBe(false);
  });

  it('a gesture in progress may leave the centre and measure narrower', () => {
    const pos = checkFacePosition(face(window.width * 0.3, 0.5 + window.width * 0.3), undefined, {
      window,
      moving: true,
    });
    expect(pos.isCentered && pos.isCorrectDistance).toBe(true);
    expect(checkFacePosition(face(window.width), undefined, { window, moving: true }).isCorrectDistance).toBe(false);
  });
});

describe('BlurBudget', () => {
  const feed = (b: BlurBudget, ms: number, n: number): void => {
    for (let i = 0; i < n; i++) b.add(ms);
  };

  it('a phone that keeps up keeps the blur', () => {
    const b = new BlurBudget();
    feed(b, 16, 600);
    expect(b.affordable).toBe(true);
  });

  it('the first frames are not judged', () => {
    const b = new BlurBudget();
    feed(b, 120, BLUR_WARMUP_FRAMES);
    feed(b, 16, BLUR_WINDOW_FRAMES * 3);
    expect(b.affordable).toBe(true);
  });

  it('a window of mostly slow frames ends the blur, for good', () => {
    const b = new BlurBudget();
    feed(b, 16, BLUR_WARMUP_FRAMES);
    feed(b, 120, BLUR_WINDOW_FRAMES);
    expect(b.affordable).toBe(false);
    feed(b, 16, BLUR_WINDOW_FRAMES * 10);
    expect(b.affordable).toBe(false);
  });
});

// The same vectors as the React Native and Flutter SDKs' tests.
describe('windowDrop', () => {
  it('leaves the window at the centre on a tall phone', async () => {
    const { windowDrop } = await import('./liveness-cutout');
    expect(windowDrop({ width: 440, height: 956 }, { width: 280, height: 369.6 })).toBe(0);
  });

  it('drops it on a short phone, by no more than the cap', async () => {
    const { windowDrop, WINDOW_MAX_DROP } = await import('./liveness-cutout');
    expect(windowDrop({ width: 375, height: 667 }, { width: 232, height: 306.82 })).toBe(10);
    expect(windowDrop({ width: 320, height: 568 }, { width: 198, height: 261.28 })).toBe(17);
    expect(windowDrop({ width: 320, height: 480 }, { width: 200, height: 264 }, 60)).toBe(0);
    expect(windowDrop({ width: 360, height: 700 }, { width: 244, height: 322.08 }, 100)).toBe(WINDOW_MAX_DROP);
  });

  it('counts the status bar in the room wanted above', async () => {
    const { windowDrop } = await import('./liveness-cutout');
    const frame = { width: 360, height: 780 };
    const window = { width: 264, height: 348.48 };
    expect(windowDrop(frame, window)).toBe(0);
    expect(windowDrop(frame, window, 36)).toBe(10);
  });

  it('never takes the room the step count needs below', async () => {
    const { windowDrop } = await import('./liveness-cutout');
    expect(windowDrop({ width: 320, height: 400 }, { width: 139, height: 184 })).toBe(0);
  });

  it('moves the cutout and the face check with it', async () => {
    const { windowDrop, windowTop, aboveHeight } = await import('./liveness-cutout');
    const frame = { width: 320, height: 568 };
    const window = { width: 198, height: 261.28 };
    expect(windowTop(frame, window)).toBeCloseTo((568 - 261.28) / 2 + 17, 5);
    expect(tintPath(frame, window)).toContain(`${(568 - 261.28) / 2 + 17 + 99}`);
    const face = faceWindowFor({ frame, window, frameAspect: 9 / 16, drop: windowDrop(frame, window) });
    expect(face.centreY).toBeCloseTo(0.5 + 17 / 568.889, 3);
    expect(faceWindowFor({ frame, window, frameAspect: 9 / 16 }).centreY).toBe(0.5);
    // Nothing but the instruction stands above the window. Too little room
    // for the words: the block keeps its height and runs over the window's
    // top edge.
    expect(aboveHeight(40)).toBe(66);
    expect(aboveHeight(96)).toBe(96);
    expect(aboveHeight(180)).toBe(180);
  });
});
