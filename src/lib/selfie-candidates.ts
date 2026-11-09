// The best selfie seen so far in one liveness run (rules in selfie-pick.ts).
//
// The detection loop snapshots the exact frame it hands the face mesh; when
// the landmarks come back, that frame is offered here. A frame that faces the
// camera with the eyes open and the face close enough is cut to the standard
// selfie frame and kept if it beats the one held. A broken run (the face lost,
// or a jump the continuity guard flags) clears it: the selfie must come from
// the same unbroken live run as the gestures.

import { calculateEAR } from '../liveness/gesture-detector';
import type { NormalizedLandmark } from '../liveness/types';
import { faceBoxOf } from './light-level';
import { laplacianVariance } from './selfie-sharpness';
import { headPose, isFrontal, mirrorRect, selfieFrame, selfieScore, SELFIE_MAX_WIDTH } from './selfie-pick';

/** Why a frame was or was not kept, so the capture step can say what to fix. */
export type SelfieVerdict = 'kept' | 'worse' | 'turned' | 'far' | 'eyes';

/** Eyes this far below their open baseline are closing or closed. */
const EYES_OPEN_SHARE = 0.75;
/** Sharpness is measured on a small copy: fast, and what matters is the face. */
const SHARPNESS_WIDTH = 120;

export class SelfieCandidates {
  private best: { canvas: HTMLCanvasElement; score: number } | null = null;
  private openEar = 0;

  /** The best selfie so far, already cut to the standard frame. */
  get bestCanvas(): HTMLCanvasElement | null {
    return this.best?.canvas ?? null;
  }

  clear(): void {
    this.best = null;
  }

  /**
   * Offer one analysed frame. `snap` is the frame as drawn (mirrored, as the
   * person sees themselves); the landmarks are in the camera's own orientation.
   */
  consider(snap: HTMLCanvasElement, landmarks: NormalizedLandmark[]): SelfieVerdict {
    const aspect = snap.width / Math.max(1, snap.height);
    // The open-eye baseline follows the run's widest eyes, slowly forgetting.
    const ear = (calculateEAR(landmarks, 'left', aspect) + calculateEAR(landmarks, 'right', aspect)) / 2;
    this.openEar = Math.max(this.openEar * 0.995, ear);

    const pose = headPose(landmarks, aspect);
    if (!pose || !isFrontal(pose)) return 'turned';
    const box = faceBoxOf(landmarks);
    const rect = box && selfieFrame(box, snap.width, snap.height);
    if (!rect) return 'far';
    if (ear < this.openEar * EYES_OPEN_SHARE) return 'eyes';

    const source = mirrorRect(rect, snap.width);
    const score = selfieScore(pose, sharpnessOf(snap, source));
    if (this.best && this.best.score >= score) return 'worse';

    const scale = Math.min(1, SELFIE_MAX_WIDTH / source.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    canvas.getContext('2d')?.drawImage(snap, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
    this.best = { canvas, score };
    return 'kept';
  }
}

/** The Laplacian variance of the frame's selfie region, on a small grey copy. */
function sharpnessOf(snap: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number }): number {
  const width = SHARPNESS_WIDTH;
  const height = Math.round((rect.height / rect.width) * width);
  const small = document.createElement('canvas');
  small.width = width;
  small.height = height;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(snap, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
  return laplacianVariance(gray, width, height);
}
