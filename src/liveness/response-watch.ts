// ---------------------------------------------------------------------------
// Whether the person is responding to a gesture: doing anything with their
// face that an attempt at one would.
//
// The gesture narrator shows a gesture and then goes. It comes back only
// for someone who is not responding, so it has to tell a person who is trying
// (and should be left to it) from one who is waiting to be shown again. A
// gesture landing is not enough to go on: a nod takes a moment to land, and a
// person half way through one is plainly responding.
//
// Four things are watched, each as a share of the face's own size so that
// distance from the camera makes no difference: where the nose is across the
// face (a turn), how far down it (a nod), how wide the mouth is (a smile) and
// how open the eyes are (a blink).
// ---------------------------------------------------------------------------

import { L } from './gesture-detector/landmarks';
import type { NormalizedLandmark } from './types';

/** MediaPipe's points on the upper and lower lid of each eye, at its middle. */
const LIDS = [
  [159, 145],
  [386, 374],
] as const;

/** How far each measure has to change to count as the person doing something.
 *  Well clear of the tracker's own jitter, well under a real attempt. */
const NOTICED = [0.05, 0.035, 0.035, 0.014];
/** How fast the resting face is re-learnt, per frame, from a person who is
 *  only drifting. */
const SETTLING = 0.05;

function measures(face: NormalizedLandmark[]): number[] {
  const width = Math.abs(face[L.rightCheek].x - face[L.leftCheek].x) || 1;
  const height = Math.abs(face[L.chin].y - face[L.forehead].y) || 1;
  const middle = (face[L.leftCheek].x + face[L.rightCheek].x) / 2;
  const eyes = LIDS.reduce((sum, [upper, lower]) => sum + Math.abs(face[upper].y - face[lower].y), 0) / LIDS.length;
  return [
    (face[L.noseTip].x - middle) / width,
    (face[L.noseTip].y - face[L.forehead].y) / height,
    Math.abs(face[L.mouthRight].x - face[L.mouthLeft].x) / width,
    eyes / height,
  ];
}

export class ResponseWatch {
  private resting: number[] | null = null;
  private last = 0;

  /** When the person last did something, on the clock `seen` was given; 0 for never. */
  get respondedAt(): number {
    return this.last;
  }

  /** One frame of the face, at `now`. */
  seen(face: NormalizedLandmark[], now: number): void {
    const next = measures(face);
    const resting = this.resting;
    if (!resting) {
      this.resting = next;
      return;
    }
    if (next.some((measure, k) => Math.abs(measure - resting[k]) > NOTICED[k])) {
      this.last = now;
      // Where they are now is what the next move is measured from.
      this.resting = next;
      return;
    }
    for (let k = 0; k < resting.length; k++) resting[k] += (next[k] - resting[k]) * SETTLING;
  }

  /** A new face, or a new attempt: nothing is known of it yet. */
  reset(): void {
    this.resting = null;
    this.last = 0;
  }
}
