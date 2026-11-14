'use client';

import { useEffect, useRef, useState } from 'react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useVerificationConfig } from '../../context/VerificationConfigContext';
import { sessionDeclinedFrom } from '../../lib/session-declined';
import { isCountedLivenessFailure, livenessAttemptsLimit, type LivenessFailedResult } from '../../lib/liveness-attempts';

// ---------------------------------------------------------------------------
// Report each failed liveness check when the workflow sets
// `maxLivenessAttempts` (lib/liveness-attempts.ts), and keep the server's
// answer for the failure panel.
//
// One call per failure, never retried and never awaited by Try Again: the
// panel shows as usual while it is in flight, gains "N attempts left." when
// the answer arrives, and a 409 session_declined ends the flow on the declined
// screen (the modal reports it to onError once). Anything else is ignored.
// The builder preview never calls the server.
// ---------------------------------------------------------------------------

/**
 * The answer for the failure on screen now, or null while there is none (no
 * limit, still in flight, or the call failed).
 */
export function useLivenessAttempts(phase: string, reason: string | null): LivenessFailedResult | null {
  const config = useVerificationConfig();
  const { state, dispatch } = useVerificationContext();
  const [answer, setAnswer] = useState<{ failure: number; result: LivenessFailedResult } | null>(null);
  // Each failure gets its own number, so a late answer never labels a newer one.
  const failureRef = useRef(0);
  const wasFailedRef = useRef(false);

  const limited = livenessAttemptsLimit(config) !== null && !config.previewMode;
  const failed = phase === 'failed';

  useEffect(() => {
    const entered = failed && !wasFailedRef.current;
    wasFailedRef.current = failed;
    if (!entered) return;
    failureRef.current += 1;
    const failure = failureRef.current;
    if (!limited || !isCountedLivenessFailure(reason)) return;
    config.api
      .livenessFailed({
        ...(state.sessionId ? { sessionId: state.sessionId } : {}),
        ...(config.country ? { country: config.country } : {}),
      })
      .then((result) => setAnswer({ failure, result }))
      .catch((err: unknown) => {
        // The limit was reached: the modal swaps to the declined screen. Any
        // other failure is ignored, and Try Again works as it always did.
        const declined = sessionDeclinedFrom(err);
        if (declined) dispatch({ type: 'SET_SESSION_DECLINED', payload: declined });
      });
    // Fires on entering the failed phase only; the rest is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  return failed && answer && answer.failure === failureRef.current ? answer.result : null;
}
