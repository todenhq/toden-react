// ---------------------------------------------------------------------------
// The ready pause: once the face is in place, a beat of "Hold still" before
// the first gesture is asked for, so the person has settled and is listening
// when it comes, rather than hearing it the instant they got into the window
// (user, 2026-11-17). Timed, not counted in frames, so a slow phone pauses as
// long. Moving out of place starts it again (the caller clears `readyAt`).
// ---------------------------------------------------------------------------

export const READY_PAUSE_MS = 1500;

export interface ReadyStep {
  /** When the face first held in place, on the caller's clock; null to start over. */
  readyAt: number | null;
  /** Whether to ask for the first gesture now. */
  go: boolean;
}

/** One frame of a face held in place: start the pause, keep it, or end it. */
export function readyPauseStep(readyAt: number | null, now: number): ReadyStep {
  if (readyAt === null) return { readyAt: now, go: false };
  if (now - readyAt < READY_PAUSE_MS) return { readyAt, go: false };
  return { readyAt: null, go: true };
}

/** How far through the pause it is, 0 to 1: 0 while the face is not yet in place. */
export function readyPauseShare(readyAt: number | null, now: number): number {
  if (readyAt === null) return 0;
  return Math.max(0, Math.min(1, (now - readyAt) / READY_PAUSE_MS));
}
