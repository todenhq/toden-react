import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VerificationApiError } from '../services/api';
import { defaultText } from '../i18n/translate';
import { mapToVerificationError } from './errors';
import { recoveryStepFor } from './submit-recovery';
import { verificationReducer, initialVerificationState } from '../context/VerificationContext';
import { classifySessionStartFailure, progressSaveStopsFlow, sessionEndAction } from './session-cancelled';
import {
  isSessionDeclinedError,
  sessionDeclinedCopy,
  sessionDeclinedFrom,
  type SessionDeclined,
} from './session-declined';
import { SessionDeclinedScreen } from '../components/SessionDeclinedScreen';

// A contact step set to decline on the last attempt declines the session when
// a code runs out: 409 { error: 'session_declined', reasonCode, message } from
// the check, then from every request on the session. Like a cancellation,
// nothing may offer Try again.

const SERVER = 'Your verification was declined after too many incorrect codes.';
const DEFAULT_BODY =
  'The code was entered incorrectly too many times, so this verification has ended. Contact the organisation that sent it if you need help.';
const LIVENESS_DEFAULT_BODY =
  'The face check did not succeed in the attempts allowed, so this verification has ended. Contact the organisation that sent it if you need help.';
const declinedError = (message: string = SERVER, reasonCode: string | null = 'contact_attempts_exceeded') =>
  new VerificationApiError(message, 409, 'session_declined', {
    error: 'session_declined',
    message,
    ...(reasonCode ? { reasonCode } : {}),
  });
const cancelledError = () =>
  new VerificationApiError('Cancelled.', 409, 'session_cancelled', { error: 'session_cancelled', message: 'Cancelled.' });

describe('reading the refusal', () => {
  it('recognises session_declined and nothing else', () => {
    expect(isSessionDeclinedError(declinedError())).toBe(true);
    expect(isSessionDeclinedError(cancelledError())).toBe(false);
    expect(isSessionDeclinedError(new VerificationApiError('x', 429, 'too_many_attempts'))).toBe(false);
    expect(isSessionDeclinedError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isSessionDeclinedError(null)).toBe(false);
  });

  it('keeps the server sentence, the reason and the channel, never the bare code', () => {
    expect(sessionDeclinedFrom(declinedError(), 'email')).toEqual({
      message: SERVER,
      reasonCode: 'contact_attempts_exceeded',
      channel: 'email',
    });
    expect(sessionDeclinedFrom(declinedError('session_declined'))?.message).toBeNull();
    expect(sessionDeclinedFrom(declinedError('  '))?.message).toBeNull();
    expect(sessionDeclinedFrom(declinedError(SERVER, null))?.reasonCode).toBeNull();
    expect(sessionDeclinedFrom(cancelledError())).toBeNull();
  });

  it('stops the flow on a declined start or save', () => {
    expect(classifySessionStartFailure(declinedError())).toEqual({
      kind: 'declined',
      declined: { message: SERVER, reasonCode: 'contact_attempts_exceeded', channel: null },
    });
    expect(classifySessionStartFailure(new VerificationApiError('x', 500))).toEqual({ kind: 'ignore' });
    expect(progressSaveStopsFlow(declinedError())).toBe(true);
    expect(progressSaveStopsFlow(new VerificationApiError('x', 409, 'handoff_session_used'))).toBe(false);
  });

  it('ends the flow with the matching action', () => {
    expect(sessionEndAction(declinedError(), 'phone')).toEqual({
      type: 'SET_SESSION_DECLINED',
      payload: { message: SERVER, reasonCode: 'contact_attempts_exceeded', channel: 'phone' },
    });
    expect(sessionEndAction(cancelledError())).toEqual({
      type: 'SET_SESSION_CANCELLED',
      payload: { message: 'Cancelled.' },
    });
    expect(sessionEndAction(new VerificationApiError('x', 400, 'invalid_code'))).toBeNull();
  });
});

describe('the declined screen copy', () => {
  const copy = (d: Partial<SessionDeclined>) =>
    sessionDeclinedCopy({ message: null, reasonCode: 'contact_attempts_exceeded', channel: null, ...d }, defaultText);

  it('names the email address on the email step', () => {
    expect(copy({ channel: 'email' }).title).toBe("We couldn't verify your email address");
  });

  it('names the phone number on the phone step', () => {
    expect(copy({ channel: 'phone' }).title).toBe("We couldn't verify your phone number");
  });

  it('says the verification has ended when the channel is unknown', () => {
    expect(copy({ channel: null }).title).toBe('This verification has ended');
    expect(copy({ channel: null, reasonCode: null }).title).toBe('This verification has ended');
  });

  it("uses the server's sentence, else the default", () => {
    expect(copy({ channel: 'email', message: SERVER }).description).toBe(SERVER);
    expect(copy({ channel: 'email' }).description).toBe(DEFAULT_BODY);
    expect(copy({ channel: null }).description).toBe(DEFAULT_BODY);
  });

  it('words any other reason plainly', () => {
    const other = copy({ channel: 'email', reasonCode: 'something_else' });
    expect(other.title).toBe('This verification has ended');
    expect(other.description).toBe(
      'This verification has ended. Contact the organisation that sent it if you need help.',
    );
  });

  it('names the face when the face check ran out of attempts', () => {
    const face = (d: Partial<SessionDeclined>) => copy({ reasonCode: 'liveness_attempts_exceeded', ...d });
    expect(face({}).title).toBe("We couldn't verify your face");
    expect(face({}).description).toBe(LIVENESS_DEFAULT_BODY);
    expect(face({ message: 'Too many failed face checks.' }).description).toBe('Too many failed face checks.');
    // Whichever request learned it (a reload, a progress save), the reason decides.
    expect(face({ channel: 'email' }).title).toBe("We couldn't verify your face");
    expect(`${face({}).title} ${face({}).description}`).not.toContain('—');
  });

  it('renders the face check decline with one Close button', () => {
    const html = renderToStaticMarkup(
      <SessionDeclinedScreen
        declined={{ message: null, reasonCode: 'liveness_attempts_exceeded', channel: null }}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('We couldn&#x27;t verify your face');
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toMatch(/try again/i);
  });

  it('has no em dashes', () => {
    for (const channel of ['email', 'phone', null] as const) {
      const { title, description } = copy({ channel });
      expect(`${title} ${description}`).not.toContain('—');
    }
  });

  it('renders the declined tone with one Close button', () => {
    const html = renderToStaticMarkup(
      <SessionDeclinedScreen
        declined={{ message: null, reasonCode: 'contact_attempts_exceeded', channel: 'phone' }}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('We couldn&#x27;t verify your phone number');
    expect(html).toContain('M6 6l12 12M18 6L6 18'); // the declined cross
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('Close');
    expect(html).not.toMatch(/try again/i);
  });
});

describe('the submission', () => {
  it('maps to its own error code, never a retry', () => {
    for (const context of ['verify', 'upload'] as const) {
      const e = mapToVerificationError(declinedError(), context);
      expect(e.code).toBe('session_declined');
      expect(e.message).toBe(SERVER);
    }
    expect(mapToVerificationError(declinedError('session_declined'), 'verify').message).toBe(DEFAULT_BODY);
    expect(
      mapToVerificationError(declinedError('session_declined', 'liveness_attempts_exceeded'), 'verify').message,
    ).toBe(LIVENESS_DEFAULT_BODY);
  });

  it('offers no Go back', () => {
    expect(recoveryStepFor('session_declined', ['consent', 'email-verification', 'submitted'])).toBeNull();
  });
});

describe('the flow state', () => {
  const declined: SessionDeclined = { message: 'first', reasonCode: 'contact_attempts_exceeded', channel: 'email' };

  it('keeps the first end and survives a reset', () => {
    let s = verificationReducer(initialVerificationState, { type: 'SET_SESSION_DECLINED', payload: declined });
    s = verificationReducer(s, { type: 'SET_SESSION_DECLINED', payload: { ...declined, message: 'second' } });
    s = verificationReducer(s, { type: 'SET_SESSION_CANCELLED', payload: { message: 'cancelled' } });
    expect(s.sessionDeclined).toEqual(declined);
    expect(s.sessionCancelled).toBeNull();
    // A decline ends that session only: a reset (a new start) clears it.
    expect(verificationReducer(s, { type: 'RESET' }).sessionDeclined).toBeNull();
  });
});
