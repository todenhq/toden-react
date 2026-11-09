// ---------------------------------------------------------------------------
// Blink Detection (Eye Aspect Ratio)
//
// EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|) — the eyelid gap relative to the
// eye's width. Two things make a FIXED threshold unusable in the browser:
//
//  1. Aspect ratio. MediaPipe normalizes x by the frame WIDTH and y by the
//     frame HEIGHT, so a raw normalized EAR (vertical over horizontal) is
//     scaled by the frame's aspect ratio. A 640x480 desktop feed inflates it
//     1.33x; a portrait phone feed (480x640) shrinks it to 0.75x — a ~1.8x
//     swing that put the open-eye EAR on a phone BELOW the desktop-tuned
//     "recovered" bar, so a blink could never complete on mobile. We undo it
//     by scaling x by `aspect` before measuring.
//
//  2. Eye shape. Eyelid geometry varies enormously between people, and head
//     pitch/glasses shift it further. So instead of an absolute "closed"
//     number we calibrate an OPEN-eye reference from recent frames and look
//     for a RELATIVE drop — which also keeps the check honest on phones that
//     run FaceMesh at a lower frame rate and only catch a blink part-closed.
// ---------------------------------------------------------------------------

import type { NormalizedLandmark } from '../types';
import { distance } from './landmarks';

// Canonical 6-point EAR sets from the MediaPipe eye contours, ordered
// [outer corner, upper-a, upper-b, inner corner, lower-b, lower-a] so both
// vertical pairs — (1,5) and (2,4) — genuinely span upper lid to lower lid.
const EYE_POINTS = {
  left: [33, 160, 158, 133, 153, 144],
  right: [362, 385, 387, 263, 373, 380],
} as const;

// ~3s of frames at 15fps. Long enough to hold a stable open-eye reference,
// short enough to follow a genuine change in head pose or distance.
const WINDOW = 45;
// Don't judge until we've seen the eye for a moment.
const MIN_SAMPLES = 6;
// The eyelid gap must shrink at least 28% below the open reference to count as
// closed — far outside frame-to-frame noise (~±5%), but reachable by a
// half-closed frame caught mid-blink on a slow device.
const CLOSED_RATIO = 0.72;
// ...and come back up to near the reference to count as reopened.
const OPEN_RATIO = 0.85;
// The reopen must follow the close within ~1.3s at 15fps, else it isn't a blink.
const MAX_GAP = 20;

export interface BlinkState {
  /** Recent aspect-corrected EAR samples, oldest first. */
  samples: number[];
  /** Frames since the eye was last seen closed; null = not seen closed yet. */
  sinceClosed: number | null;
}

export function createBlinkState(): BlinkState {
  return { samples: [], sinceClosed: null };
}

export function calculateEAR(
  landmarks: NormalizedLandmark[],
  eye: 'left' | 'right',
  aspect: number,
): number {
  const p = EYE_POINTS[eye].map((i) => landmarks[i]);
  if (p.some((point) => !point)) return 0;

  const vertical1 = distance(p[1], p[5], aspect);
  const vertical2 = distance(p[2], p[4], aspect);
  const horizontal = distance(p[0], p[3], aspect);

  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.round((sorted.length - 1) * p);
  return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
}

/**
 * Detect a blink — a drop in eyelid gap followed by a recovery.
 *
 * @param aspect videoWidth / videoHeight of the analyzed frame. Required for a
 *   device-independent EAR; defaults to a square frame.
 */
export function detectBlink(
  landmarks: NormalizedLandmark[],
  state: BlinkState,
  aspect = 1,
): boolean {
  const left = calculateEAR(landmarks, 'left', aspect);
  const right = calculateEAR(landmarks, 'right', aspect);
  if (left === 0 && right === 0) return false;
  const ear = (left + right) / 2;

  state.samples.push(ear);
  if (state.samples.length > WINDOW) state.samples.shift();
  if (state.sinceClosed !== null) state.sinceClosed++;

  if (state.samples.length < MIN_SAMPLES) return false;

  // Open-eye reference: the 75th percentile of the window. A blink is a small
  // minority of frames so it can't drag the reference down with it, while a
  // real change in pose or distance moves it within a couple of seconds.
  const open = percentile(state.samples, 0.75);
  if (open <= 0) return false;

  const ratio = ear / open;

  if (ratio < CLOSED_RATIO) {
    state.sinceClosed = 0;
    return false;
  }

  if (state.sinceClosed !== null) {
    if (state.sinceClosed > MAX_GAP) {
      state.sinceClosed = null; // too slow to be a blink — wait for a new one
    } else if (ratio > OPEN_RATIO) {
      state.sinceClosed = null;
      return true;
    }
  }

  return false;
}
