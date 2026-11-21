// ---------------------------------------------------------------------------
// Which way the head is facing, for the head directions gesture set: turned
// to the person's own left or right, looking up or down.
//
// LEFT AND RIGHT ARE THE PERSON'S OWN. FaceMesh is fed the camera's frame as
// it comes (not the mirrored preview), so the picture is the person as someone
// facing them sees them: their left is on the picture's RIGHT. Turning the
// head to their left swings the nose toward the picture's right. On screen the
// preview is mirrored, so their left is the screen's left too, and "turn your
// head to the left" means the same thing whichever way they read it.
//
// Up and down are read from where the nose tip sits between the bridge of the
// nose and the chin. The nose stands out from the face, so tipping the head
// back carries its tip up that line and tipping it forward carries it down.
// Faces differ in where the tip rests, so it is measured against the person's
// own resting value, taken while they hold still before the first gesture.
// ---------------------------------------------------------------------------

import type { NormalizedLandmark } from '../types';
import type { DirectionChallenge } from '../types';
import { L } from './landmarks';

/** How far the nose must swing from the middle of the face, as a share of its
 *  width, to count as a turn. The classic turn's own line. */
export const TURN_OFFSET = 0.15;
/** How far the nose tip must move along the bridge-to-chin line, as a share of
 *  that line, to count as looking up or down: about fifteen degrees. */
export const LOOK_OFFSET = 0.05;
/** A direction must hold for this many frames in a row (about a tenth of a
 *  second), so a passing wobble is not taken for the gesture. */
export const DIRECTION_HOLD_FRAMES = 4;

/** Sideways: positive toward the person's own LEFT, as a share of the face's width. */
export function headTurn(landmarks: NormalizedLandmark[]): number {
  const left = landmarks[L.leftCheek].x;
  const right = landmarks[L.rightCheek].x;
  const width = Math.abs(right - left);
  if (width === 0) return 0;
  return (landmarks[L.noseTip].x - (left + right) / 2) / width;
}

/** Where the nose tip sits from the bridge of the nose (0) to the chin (1). */
export function headTilt(landmarks: NormalizedLandmark[]): number {
  const bridge = landmarks[L.noseBase].y;
  const span = landmarks[L.chin].y - bridge;
  if (span <= 0) return 0;
  return (landmarks[L.noseTip].y - bridge) / span;
}

export type Facing = DirectionChallenge | null;

/**
 * The one direction the head is plainly facing, or null when it is facing the
 * camera. `restTilt` is the person's own `headTilt` at rest. The larger of the
 * two movements wins, so a turn with a slight dip is still a turn.
 */
export function facing(landmarks: NormalizedLandmark[], restTilt: number): Facing {
  const turn = headTurn(landmarks);
  const tilt = headTilt(landmarks) - restTilt;
  const turned = Math.abs(turn) / TURN_OFFSET;
  const tilted = Math.abs(tilt) / LOOK_OFFSET;
  if (turned < 1 && tilted < 1) return null;
  if (turned >= tilted) return turn > 0 ? 'turnLeft' : 'turnRight';
  return tilt < 0 ? 'lookUp' : 'lookDown';
}

/** The direction straight across from one: what "the wrong way" is. */
export function oppositeDirection(direction: DirectionChallenge): DirectionChallenge {
  switch (direction) {
    case 'turnLeft':
      return 'turnRight';
    case 'turnRight':
      return 'turnLeft';
    case 'lookUp':
      return 'lookDown';
    case 'lookDown':
      return 'lookUp';
  }
}
