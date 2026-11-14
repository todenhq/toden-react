// ─── A declined session ─────────────────────────────────────────────────────
//
// A workflow whose contact step sets `declineOnLastAttempt` declines the whole
// session when the applicant uses up a one-time code: `POST /contact/check`
// answers `409 { error: 'session_declined', reasonCode, message }`, and from
// then on every request on that session (the hosted bootstrap, the link
// reopen, the session start, progress saves, `/verify`, any `hs_` bearer
// request) answers the same refusal. A workflow's `maxLivenessAttempts` does
// the same when a reported liveness failure reaches the limit
// (`POST /liveness/failed`, reason `liveness_attempts_exceeded`;
// lib/liveness-attempts.ts). It is exactly parallel to the cancelled
// refusal (lib/session-cancelled.ts), and like it must never reach the generic
// "Something went wrong / Try again" screen.
//
// Duck-typed on `code` and `body`, so this module stays import-free.

/** The server's error token for a refused, declined session. */
export const SESSION_DECLINED_CODE = 'session_declined';

/** The reason a session is declined when a contact code ran out of attempts. */
export const CONTACT_ATTEMPTS_EXCEEDED = 'contact_attempts_exceeded';

/** The reason a session is declined when the face check ran out of attempts. */
export const LIVENESS_ATTEMPTS_EXCEEDED = 'liveness_attempts_exceeded';

/** The contact step that learned of the decline, when one did. */
export type DeclinedChannel = 'email' | 'phone';

/** What the flow keeps about a declined session. */
export interface SessionDeclined {
  /** The server's own sentence, or null for the catalogue default. */
  message: string | null;
  /** Why the server declined it (`contact_attempts_exceeded`,
   *  `liveness_attempts_exceeded`), when it said. */
  reasonCode: string | null;
  /** The contact step that was refused, or null when unknown (a bootstrap). */
  channel: DeclinedChannel | null;
}

/** Whether an error thrown by the API client is a declined-session refusal. */
export function isSessionDeclinedError(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    (err as { code?: unknown }).code === SESSION_DECLINED_CODE
  );
}

/**
 * The server's own sentence for the refusal, or null when it sent none. A
 * message equal to the bare code is the client's fallback for a body without
 * one, not a sentence.
 */
export function sessionDeclinedMessage(err: unknown): string | null {
  if (err === null || typeof err !== 'object') return null;
  const raw = (err as { message?: unknown }).message;
  if (typeof raw !== 'string') return null;
  const message = raw.trim();
  if (!message || message === SESSION_DECLINED_CODE) return null;
  return message;
}

/** The refusal's `reasonCode`, read from the response body. */
export function sessionDeclinedReason(err: unknown): string | null {
  if (err === null || typeof err !== 'object') return null;
  const body = (err as { body?: unknown }).body;
  if (body === null || typeof body !== 'object') return null;
  const reason = (body as { reasonCode?: unknown }).reasonCode;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : null;
}

/** What a declined refusal tells the flow, or null for any other error. */
export function sessionDeclinedFrom(
  err: unknown,
  channel: DeclinedChannel | null = null,
): SessionDeclined | null {
  if (!isSessionDeclinedError(err)) return null;
  return { message: sessionDeclinedMessage(err), reasonCode: sessionDeclinedReason(err), channel };
}

/** The catalogue keys for the declined screen's title and description. */
export function sessionDeclinedKeys(declined: Pick<SessionDeclined, 'reasonCode' | 'channel'>): {
  title: string;
  description: string;
} {
  // The face check ran out of attempts: worded for the face, wherever it was learned.
  if (declined.reasonCode === LIVENESS_ATTEMPTS_EXCEEDED) {
    return { title: 'presence.declined.title', description: 'presence.declined.description' };
  }
  // Any other reason than a used-up code or face check gets the plain wording.
  if (declined.reasonCode !== null && declined.reasonCode !== CONTACT_ATTEMPTS_EXCEEDED) {
    return { title: 'general.sessionDeclined.title', description: 'general.sessionDeclined.description' };
  }
  return {
    title: declined.channel
      ? `contact.declined.${declined.channel}.title`
      : 'general.sessionDeclined.title',
    description: 'contact.declined.description',
  };
}

/**
 * The declined screen's words. The body is the server's sentence when it sent
 * one, otherwise the catalogue default for the reason.
 */
export function sessionDeclinedCopy(
  declined: SessionDeclined,
  t: (key: string) => string,
): { title: string; description: string } {
  const keys = sessionDeclinedKeys(declined);
  return { title: t(keys.title), description: declined.message ?? t(keys.description) };
}
