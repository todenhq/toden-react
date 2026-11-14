import { VerificationApiError } from '../services/api';
import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';

// User-facing copy for the contact-verification send/check error codes. The
// texts live in the catalogue's `contact` group; this maps codes to keys.

const CHECK_ERRORS: Record<string, string> = {
  invalid_code: 'contact.error.invalidCode',
  challenge_expired: 'contact.error.codeExpired',
  too_many_attempts: 'contact.error.tooManyAttempts',
  challenge_not_found: 'contact.error.codeInvalid',
};

const SEND_ERRORS: Record<string, string> = {
  invalid_destination: 'contact.error.invalidDestination',
  send_rate_limited: 'contact.error.rateLimited',
  send_failed: 'contact.error.sendFailed',
};

function describe(err: unknown, map: Record<string, string>, t: TextFn): string {
  if (err instanceof VerificationApiError && err.code && map[err.code]) return t(map[err.code]!);
  if (err instanceof TypeError) return t('contact.error.network');
  return t('contact.error.generic');
}

/**
 * A workflow that takes work addresses only refuses a free-provider one with
 * `invalid_destination` and this reason; an older server sends no reason.
 */
const CORPORATE_EMAIL_REQUIRED = 'corporate_email_required';

export const describeSendError = (err: unknown, t: TextFn = defaultText): string =>
  err instanceof VerificationApiError &&
  err.code === 'invalid_destination' &&
  err.body?.reason === CORPORATE_EMAIL_REQUIRED
    ? t('contact.error.corporateEmailRequired')
    : describe(err, SEND_ERRORS, t);

/**
 * Whether a refused check means the CURRENT code is used up: the wrong entry
 * that spent its last attempt (`invalid_code` with `attemptsRemaining: 0`), or
 * a further check on a code already spent (`too_many_attempts`). The field is
 * then disabled until a new code is sent. A wrong code with attempts left, or
 * an older server that sends no count, is not.
 */
export function codeIsUsedUp(err: unknown): boolean {
  if (!(err instanceof VerificationApiError)) return false;
  if (err.code === 'too_many_attempts') return true;
  return err.code === 'invalid_code' && err.body?.attemptsRemaining === 0;
}

/**
 * Whether the server refused the code itself (wrong, used up or expired), as
 * opposed to the request failing. The step clears the field for these, and
 * keeps what was typed after a network failure so it can simply be retried.
 */
export function isWrongCode(err: unknown): boolean {
  return err instanceof VerificationApiError
    && (err.code === 'invalid_code' || err.code === 'too_many_attempts' || err.code === 'challenge_expired');
}

export const describeCheckError = (err: unknown, t: TextFn = defaultText): string =>
  codeIsUsedUp(err) ? t('contact.error.tooManyAttempts') : describe(err, CHECK_ERRORS, t);
