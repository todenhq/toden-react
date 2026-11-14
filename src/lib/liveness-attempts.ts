// ─── Maximum liveness attempts ──────────────────────────────────────────────
//
// A workflow may set `maxLivenessAttempts` (1 to 3, or `false` for no limit;
// left out it is 3, on by default, as the server reads it). The check runs in the
// browser, so the server only learns of a failure when the SDK reports it:
// `POST /liveness/failed`, once per failed check, never retried. The server
// counts failures on the attempt and answers how many tries are left; at the
// limit it declines the session (409 session_declined, reason
// `liveness_attempts_exceeded`), which the flow ends on like a used-up code
// (lib/session-declined.ts). Everything else (a network error, an old server)
// is ignored: Try Again works as it always did.
//
// Pure and import-free apart from types, so the step's hook stays small.

import type { TextFn } from '../i18n/types';

/** The server's answer to a reported failure. */
export type LivenessFailedResult =
  | { limited: false }
  /** `attemptsLeft` 0 only when the session ended some other way meanwhile. */
  | { limited: true; attemptsLeft: number };

/**
 * The response body read defensively: anything that is not a limited answer
 * with a whole, non-negative count reads as "no limit", which changes nothing.
 */
export function livenessFailedResult(raw: unknown): LivenessFailedResult {
  if (raw === null || typeof raw !== 'object') return { limited: false };
  const body = raw as { limited?: unknown; attemptsLeft?: unknown };
  if (body.limited !== true) return { limited: false };
  const left = body.attemptsLeft;
  if (typeof left !== 'number' || !Number.isFinite(left)) return { limited: false };
  return { limited: true, attemptsLeft: Math.max(0, Math.floor(left)) };
}

/** The default limit, for a workflow that leaves the setting out. */
export const DEFAULT_LIVENESS_ATTEMPTS = 3;

/**
 * The workflow's limit, or null when it turns the limit off (`false`). Left
 * out, or unreadable, it is the default of 3: the server decides in the end,
 * so reporting a failure it does not count costs one request and changes
 * nothing.
 */
export function livenessAttemptsLimit(config: { maxLivenessAttempts?: unknown }): number | null {
  const max = config.maxLivenessAttempts;
  if (max === false) return null;
  if (typeof max === 'number' && Number.isInteger(max) && max >= 1) return Math.min(max, DEFAULT_LIVENESS_ATTEMPTS);
  return DEFAULT_LIVENESS_ATTEMPTS;
}

/**
 * The failures that count as a failed check: the person did not complete it.
 * A detector that could not load and a missing camera are the device's fault,
 * not a try, and are never reported.
 */
const COUNTED_FAILURES: ReadonlySet<string> = new Set(['timeout', 'face_lost', 'flash_failed', 'face_swap']);

/** Whether a liveness failure reason is a failed check the server should count. */
export function isCountedLivenessFailure(reason: string | null | undefined): boolean {
  return typeof reason === 'string' && COUNTED_FAILURES.has(reason);
}

/**
 * The failure panel's second line, "1 attempt left." or "2 attempts left.",
 * or null when there is nothing to say (no limit, or none left).
 */
export function attemptsLeftLine(result: LivenessFailedResult | null, t: TextFn): string | null {
  if (!result || !result.limited || result.attemptsLeft < 1) return null;
  const count = result.attemptsLeft;
  return t(count === 1 ? 'presence.failed.attemptsLeft.one' : 'presence.failed.attemptsLeft.other', { count });
}
