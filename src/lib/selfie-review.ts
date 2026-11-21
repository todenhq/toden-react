// What the full-screen selfie review shows, and where. Pure.
//
// The selfie that is uploaded is a tight 3:4 cut round the face
// (lib/selfie-pick.ts). The review used to spread that cut over the whole
// camera area: on a desktop the area is wide, so the cut was enlarged until
// the face was bigger than the window, which the camera had never shown (user
// report 2026-11-17: "that was not how it looked when it was captured ... it
// must always fit the frame on all devices").
//
// So the review shows the camera FRAME the selfie was cut from, drawn the way
// the camera drew it: filling the screen, under the same light blur round the
// window. Two things are done for the face, in this order:
//
//   it fits     A face held close enough to spill over the window makes the
//               picture smaller until it fits, and the face is kept inside the
//               window's edges. This can leave a strip of the screen without
//               picture, which the view fades out rather than cutting off.
//   it is central   As far as that goes without uncovering the screen.
//
// A first attempt put the cut selfie in the window and a heavily blurred copy
// round it. The user did not want the heavy blur: it is the light one the
// camera has, or none.

import type { Size } from './liveness-cutout';
import type { ShareBox } from './selfie-pick';

/** The camera frame a selfie was cut from. Held in memory; never uploaded. */
export interface SelfieScene {
  /** The frame as a data URL, mirrored as the person saw it. */
  image: string;
  width: number;
  height: number;
  /** Where the face is, in shares of the frame. */
  face: ShareBox;
}

/** The face is at most this share of the window's width and height. */
export const REVIEW_FACE_MAX_FILL = 0.8;

/** A rectangle in screen pixels, from the top left of the camera area. */
export interface Placement {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One axis: central where the picture covers, and the face inside the window always. */
function along(screen: number, size: number, faceStart: number, faceSize: number, windowStart: number, windowSize: number): number {
  const central = windowStart + windowSize / 2 - (faceStart + faceSize / 2) * size;
  const covering = size >= screen ? Math.min(0, Math.max(screen - size, central)) : (screen - size) / 2;
  // The face's near edge not before the window's, its far edge not past it.
  const least = windowStart - faceStart * size;
  const most = windowStart + windowSize - (faceStart + faceSize) * size;
  return Math.min(most, Math.max(least, covering));
}

/**
 * Where the camera frame goes on the review. `window` is the face window, its
 * top `windowTop` down the camera area and centred across it.
 */
export function sceneOnReview(scene: Size, face: ShareBox, frame: Size, window: Size, windowTop: number): Placement {
  const cover = Math.max(frame.width / scene.width, frame.height / scene.height);
  // How much of the window the face takes drawn as the camera drew it.
  const fill = Math.max(
    (face.width * scene.width * cover) / window.width,
    (face.height * scene.height * cover) / window.height,
  );
  const scale = cover * Math.min(1, REVIEW_FACE_MAX_FILL / fill);
  const width = scene.width * scale;
  const height = scene.height * scale;
  return {
    left: along(frame.width, width, face.x, face.width, (frame.width - window.width) / 2, window.width),
    top: along(frame.height, height, face.y, face.height, windowTop, window.height),
    width,
    height,
  };
}

/** Which edges of the camera area the picture does not reach. */
export function uncovered(at: Placement, frame: Size): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
  return {
    left: at.left > 0.5,
    right: at.left + at.width < frame.width - 0.5,
    top: at.top > 0.5,
    bottom: at.top + at.height < frame.height - 0.5,
  };
}
