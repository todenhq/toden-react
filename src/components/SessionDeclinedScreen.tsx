import { useEffect, useRef } from 'react';
import { useText } from '../i18n';
import { VerificationError } from '../types/verification';
import { SubmitSuccessScreen } from '../steps/SubmittedScreens';
import { sessionDeclinedCopy, type SessionDeclined } from '../lib/session-declined';

// ─── The declined screen ────────────────────────────────────────────────────
//
// The server declined this verification session (a one-time code ran out of
// attempts on a step set to decline). Terminal, like the cancelled screen
// (SessionCancelledScreen.tsx): the server refuses the session from then on,
// so no Try again is offered and the only action is Close. Drawn as the
// terminal screen's `declined` tone so it reads as the same design as a
// declined decision.

/**
 * Fire `onError` with `session_declined` ONCE, the first time the run is
 * marked declined, whichever call learned it (the contact check, the session
 * start, a progress save or the submission).
 */
export function useReportDecline(
  declined: SessionDeclined | null,
  onError: ((error: VerificationError) => void) | undefined,
  describe: (declined: SessionDeclined) => string,
): void {
  const reported = useRef(false);
  useEffect(() => {
    if (!declined || reported.current) return;
    reported.current = true;
    try {
      onError?.(new VerificationError('session_declined', describe(declined)));
    } catch {
      /* a consumer's handler must never break the flow */
    }
  }, [declined, onError, describe]);
}

/** `onClose` absent: nothing to close to (a full-page hosted link), so no button. */
export function SessionDeclinedScreen({ declined, onClose }: { declined: SessionDeclined; onClose?: () => void }) {
  const t = useText();
  const copy = sessionDeclinedCopy(declined, (key) => t(key));
  return (
    <div role="alert">
      <SubmitSuccessScreen
        tone="declined"
        title={copy.title}
        description={copy.description}
        action={onClose ? { label: t('common.close'), onClick: onClose } : undefined}
      />
    </div>
  );
}
