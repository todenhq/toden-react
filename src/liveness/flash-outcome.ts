// ---------------------------------------------------------------------------
// What to do once a flash (screen-reflection) sequence has run.
//
// An UNMEASURABLE flash used to count as a pass: bright ambient light drowns
// the reflection, and so does a phone screen held up to the camera, which lights
// itself. That soft pass is exactly what a replay needs. Now:
//
//   - measured and matched          → pass
//   - measured and NOT matched      → fail (a real contradiction)
//   - unmeasurable, first time      → retry once, after asking the person to
//                                     move away from bright light
//   - unmeasurable again, 'both'    → the gestures that ran first carried it
//   - unmeasurable again, 'flash'   → fall back to gesture challenges, so the
//                                     person still proves they are live
//
// Mirrored by the React Native (liveness/flashOutcome.ts) and Flutter
// (liveness/flash_outcome.dart) SDKs. Change all three together.
// ---------------------------------------------------------------------------

export type FlashOutcome = 'pass' | 'retry' | 'accept_gestures' | 'fallback_gestures' | 'fail';

/** How many times an unmeasurable flash is retried before the fallback. */
export const FLASH_INCONCLUSIVE_RETRIES = 1;

export function flashOutcome(
  result: { passed: boolean; inconclusive: boolean },
  mode: 'gestures' | 'flash' | 'both' | 'passive',
  retriesUsed: number,
): FlashOutcome {
  if (result.passed) return 'pass';
  if (!result.inconclusive) return 'fail';
  if (retriesUsed < FLASH_INCONCLUSIVE_RETRIES) return 'retry';
  return mode === 'both' ? 'accept_gestures' : 'fallback_gestures';
}

/** Shown while the unmeasurable flash is retried. */
export const FLASH_RETRY_GUIDANCE = 'Move away from bright light and hold still';
