import { describe, expect, it } from 'vitest';
import { livenessCutout, windowTop } from './liveness-cutout';
import { REVIEW_FACE_MAX_FILL, sceneOnReview, uncovered } from './selfie-review';

// A webcam's frame and a phone's. The face as the mesh boxes it: forehead to chin.
const webcam = { width: 640, height: 480 };
const phoneCamera = { width: 480, height: 640 };
const screens = {
  desktop: { frame: { width: 761, height: 628 }, scene: webcam },
  phone: { frame: { width: 393, height: 852 }, scene: phoneCamera },
  smallPhone: { frame: { width: 360, height: 640 }, scene: phoneCamera },
  // A phone-sized window on a laptop: the camera is still the webcam.
  narrowDesktop: { frame: { width: 393, height: 852 }, scene: webcam },
};
// How much of the window's width the face took on the camera: placed as asked,
// leaning in, and far too close. Its height follows a face's proportions.
const faces = { placed: 0.6, close: 0.95, veryClose: 1.3 };
type Screen = (typeof screens)[keyof typeof screens];

const faceBox = ({ frame, scene }: Screen, fill: number, centre = { x: 0.5, y: 0.5 }) => {
  const cover = Math.max(frame.width / scene.width, frame.height / scene.height);
  const width = (fill * livenessCutout(frame).width) / (scene.width * cover);
  const height = (width * scene.width * 1.3) / scene.height;
  return { x: centre.x - width / 2, y: centre.y - height / 2, width, height };
};

describe('the camera frame on the selfie review', () => {
  for (const [name, screen] of Object.entries(screens)) {
    const { frame, scene } = screen;
    const window = livenessCutout(frame);
    const top = windowTop(frame, window);
    const windowLeft = (frame.width - window.width) / 2;
    for (const [held, share] of Object.entries(faces)) {
      for (const centre of [{ x: 0.5, y: 0.5 }, { x: 0.42, y: 0.56 }]) {
        it(`keeps the face inside the window on a ${name}, face ${held}, at ${centre.x},${centre.y}`, () => {
          const face = faceBox(screen, share, centre);
          if (face.x < 0 || face.y < 0 || face.x + face.width > 1 || face.y + face.height > 1) return; // not a frame the camera could give
          const at = sceneOnReview(scene, face, frame, window, top);
          const left = at.left + face.x * at.width;
          const up = at.top + face.y * at.height;
          const wide = face.width * at.width;
          const tall = face.height * at.height;
          expect(wide).toBeLessThanOrEqual(window.width * REVIEW_FACE_MAX_FILL + 0.01);
          expect(tall).toBeLessThanOrEqual(window.height * REVIEW_FACE_MAX_FILL + 0.01);
          expect(left).toBeGreaterThanOrEqual(windowLeft - 0.01);
          expect(left + wide).toBeLessThanOrEqual(windowLeft + window.width + 0.01);
          expect(up).toBeGreaterThanOrEqual(top - 0.01);
          expect(up + tall).toBeLessThanOrEqual(top + window.height + 0.01);
        });
      }
    }

    it(`shows a ${name} as the camera did when the face was placed in the window`, () => {
      const at = sceneOnReview(scene, faceBox(screen, faces.placed), frame, window, top);
      const cover = Math.max(frame.width / scene.width, frame.height / scene.height);
      expect(at.width).toBeCloseTo(scene.width * cover, 5);
      expect(uncovered(at, frame)).toEqual({ left: false, right: false, top: false, bottom: false });
    });
  }

  it('makes the picture smaller, never larger, for a face held too close', () => {
    const { frame, scene } = screens.desktop;
    const window = livenessCutout(frame);
    const at = sceneOnReview(scene, faceBox(screens.desktop, faces.veryClose), frame, window, windowTop(frame, window));
    const cover = Math.max(frame.width / scene.width, frame.height / scene.height);
    expect(at.width).toBeLessThan(scene.width * cover);
    // The picture no longer reaches every edge, and the view is told which.
    expect(uncovered(at, frame)).toMatchObject({ top: true, bottom: true });
  });

  it('moves a face that had drifted back to the window’s centre where the picture allows', () => {
    const { frame, scene } = screens.desktop;
    const window = livenessCutout(frame);
    const face = faceBox(screens.desktop, faces.placed, { x: 0.47, y: 0.5 });
    const at = sceneOnReview(scene, face, frame, window, windowTop(frame, window));
    // Across, a webcam's frame is wider than the desktop area: there is room to move it.
    expect(at.left + (face.x + face.width / 2) * at.width).toBeCloseTo(frame.width / 2, 5);
    expect(uncovered(at, frame)).toMatchObject({ left: false, right: false });
  });
});
