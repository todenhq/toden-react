// The selfie, chosen rather than snapped (user decision 2026-11-07). Pure.
//
// The still used to be whatever frame first held a centred face for half a
// second after the last gesture. Centred is not facing the camera: after "turn
// your head" a person can still be turned with their nose mid-frame, and the
// selfie came out side-on, which failed the face match or passed with a photo
// not fit to keep. A separate "look at the camera" step would be a seam an
// attacker could use (pass the gestures live, then hold up a photo), so there
// is none: frames are scored all through the live check, the best front-on one
// is kept, and the final shot comes from the same unbroken run.
//
// Every selfie is cut to one standard frame: 3:4, head and shoulders, the face
// a set share of the width. Close enough for the face match to have pixels to
// work with, wide enough that passive liveness still sees what is around the
// face (a phone's edge, a print's border). Never enlarged: a face too small for
// the frame is a "move closer", not an upscale.

import type { NormalizedLandmark } from '../liveness/types';

/** The face's share of the selfie's width. */
export const SELFIE_FACE_SHARE = 0.42;
/** Width over height of the selfie: 3:4 portrait. */
export const SELFIE_ASPECT = 3 / 4;
/** The face's centre sits this far down the frame, leaving room for the head. */
export const SELFIE_FACE_CENTRE_Y = 0.46;
/** The selfie's width at most: enough for the face match, small to upload. */
export const SELFIE_MAX_WIDTH = 720;
/** Narrower than this in camera pixels, the face is too far away to keep. */
export const SELFIE_MIN_WIDTH = 360;

/** Head turn, nod and tilt, each 0 when facing the camera straight on. */
export interface HeadPose {
  /** Nose off the eyes' midpoint, in inter-eye distances (left/right turn). */
  yaw: number;
  /** Nose down the eye-to-mouth span, off its straight-on ~0.6 (nod). */
  pitch: number;
  /** The eye line's angle, in degrees (tilt). */
  roll: number;
}

const NOSE = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const MOUTH_TOP = 13;
const MOUTH_BOTTOM = 14;
/** Where the nose tip sits between the eyes and the mouth when facing forward. */
const PITCH_CENTRE = 0.6;

const MAX_YAW = 0.12;
const MAX_PITCH = 0.15;
const MAX_ROLL = 10;

/** PURE. The head's pose from the mesh, or null when the points are missing. */
export function headPose(landmarks: readonly NormalizedLandmark[], aspect = 1): HeadPose | null {
  const nose = landmarks[NOSE];
  const left = landmarks[LEFT_EYE];
  const right = landmarks[RIGHT_EYE];
  const top = landmarks[MOUTH_TOP];
  const bottom = landmarks[MOUTH_BOTTOM];
  if (!nose || !left || !right || !top || !bottom) return null;
  const eyeX = (left.x + right.x) / 2;
  const eyeY = (left.y + right.y) / 2;
  // x is normalised by the frame's width and y by its height: back to pixels' proportions.
  const dx = (right.x - left.x) * aspect;
  const dy = right.y - left.y;
  const iod = Math.hypot(dx, dy);
  const mouthY = (top.y + bottom.y) / 2;
  const span = mouthY - eyeY;
  if (iod <= 0 || span <= 0) return null;
  return {
    yaw: ((nose.x - eyeX) * aspect) / iod,
    pitch: (nose.y - eyeY) / span - PITCH_CENTRE,
    roll: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/** PURE. Facing the camera: no turn, nod or tilt beyond a small allowance. */
export function isFrontal(pose: HeadPose | null): boolean {
  return !!pose && Math.abs(pose.yaw) <= MAX_YAW && Math.abs(pose.pitch) <= MAX_PITCH && Math.abs(pose.roll) <= MAX_ROLL;
}

/** A rectangle in camera pixels. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * PURE. The standard selfie frame around a face, in camera pixels: 3:4, the
 * face SELFIE_FACE_SHARE of its width, the face's centre SELFIE_FACE_CENTRE_Y
 * down. Moved (never squeezed) to stay inside the camera frame; when the frame
 * is too small for it, the largest 3:4 frame that fits, centred on the face.
 * Null when the face is too far away for a selfie worth keeping.
 */
export function selfieFrame(
  face: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number,
): PixelRect | null {
  const faceWidth = face.width * frameWidth;
  let width = faceWidth / SELFIE_FACE_SHARE;
  let height = width / SELFIE_ASPECT;
  if (height > frameHeight) {
    height = frameHeight;
    width = height * SELFIE_ASPECT;
  }
  if (width > frameWidth) {
    width = frameWidth;
    height = width / SELFIE_ASPECT;
  }
  if (width < SELFIE_MIN_WIDTH) return null;
  const cx = (face.x + face.width / 2) * frameWidth;
  const cy = (face.y + face.height / 2) * frameHeight;
  const clamp = (v: number, size: number, limit: number) => Math.min(Math.max(0, v), limit - size);
  return {
    x: Math.round(clamp(cx - width / 2, width, frameWidth)),
    y: Math.round(clamp(cy - height * SELFIE_FACE_CENTRE_Y, height, frameHeight)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** PURE. The rectangle mirrored left to right, for a frame drawn mirrored. */
export function mirrorRect(rect: PixelRect, frameWidth: number): PixelRect {
  return { ...rect, x: frameWidth - rect.x - rect.width };
}

/**
 * PURE. How good a candidate is: sharper and more squarely facing the camera
 * wins. The pose terms are each 0..1 (1 = straight on); sharpness, a
 * Laplacian variance, is capped so a noisy frame cannot outscore a frontal one.
 */
export function selfieScore(pose: HeadPose, sharpness: number): number {
  const straight =
    (1 - Math.min(1, Math.abs(pose.yaw) / MAX_YAW)) +
    (1 - Math.min(1, Math.abs(pose.pitch) / MAX_PITCH)) +
    (1 - Math.min(1, Math.abs(pose.roll) / MAX_ROLL));
  return straight / 3 + Math.min(1, sharpness / 120);
}
