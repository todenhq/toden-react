import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VerificationApiError } from '../services/api';
import { codeIsUsedUp, describeCheckError } from '../lib/contact-errors';
import { defaultText } from '../i18n/translate';
import {
  CONTACT_PRIMARY_LABEL,
  contactCodeReducer,
  contactPrimaryAction,
  initialContactCodeState,
} from './contact-code-state';
import { ContactCodePanel } from './ContactCodePanel';

// A wrong code answers 400 invalid_code with attemptsRemaining; at 0 the code
// is used up, and a further check answers 429 too_many_attempts. Either way
// the field is disabled and the primary button sends a new code, until one is
// sent.

const wrong = (attemptsRemaining?: number) =>
  new VerificationApiError('Invalid code', 400, 'invalid_code', {
    error: 'invalid_code',
    ...(attemptsRemaining !== undefined ? { attemptsRemaining } : {}),
  });
const tooMany = () => new VerificationApiError('Too many', 429, 'too_many_attempts', { error: 'too_many_attempts' });
const USED_UP_COPY = 'Too many incorrect attempts. Request a new code.';

describe('a used-up code', () => {
  it('is the last wrong attempt or a too_many_attempts refusal', () => {
    expect(codeIsUsedUp(wrong(0))).toBe(true);
    expect(codeIsUsedUp(tooMany())).toBe(true);
    expect(codeIsUsedUp(wrong(2))).toBe(false);
    expect(codeIsUsedUp(wrong())).toBe(false); // an older server sends no count
    expect(codeIsUsedUp(new VerificationApiError('x', 400, 'challenge_expired'))).toBe(false);
    expect(codeIsUsedUp(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('says to request a new code', () => {
    expect(describeCheckError(wrong(0))).toBe(USED_UP_COPY);
    expect(describeCheckError(tooMany())).toBe(USED_UP_COPY);
    expect(describeCheckError(wrong(2))).toBe('That code is not correct. Please try again.');
  });
});

describe('the code state', () => {
  const typed = contactCodeReducer(initialContactCodeState, { type: 'typed', code: '123456' });

  it('is used up after the last attempt, with the field emptied', () => {
    const s = contactCodeReducer(typed, { type: 'checkFailed', error: wrong(0) });
    expect(s).toEqual({ code: '', usedUp: true });
  });

  it('is used up after too_many_attempts', () => {
    expect(contactCodeReducer(typed, { type: 'checkFailed', error: tooMany() }).usedUp).toBe(true);
  });

  it('stays enabled for a wrong code with attempts left, and empties the field for the next try', () => {
    expect(contactCodeReducer(typed, { type: 'checkFailed', error: wrong(1) })).toEqual({ code: '', usedUp: false });
  });

  it('keeps the typed code after a network failure, so it can be sent again', () => {
    expect(contactCodeReducer(typed, { type: 'checkFailed', error: new TypeError('Failed to fetch') })).toEqual(typed);
  });

  it('ignores typing while used up', () => {
    const usedUp = contactCodeReducer(typed, { type: 'checkFailed', error: tooMany() });
    expect(contactCodeReducer(usedUp, { type: 'typed', code: '9' })).toBe(usedUp);
  });

  it('clears the code and re-enables the field once a new code is sent', () => {
    const usedUp = contactCodeReducer(typed, { type: 'checkFailed', error: wrong(0) });
    const fresh = contactCodeReducer(usedUp, { type: 'sent' });
    expect(fresh).toEqual({ code: '', usedUp: false });
    expect(contactCodeReducer(fresh, { type: 'typed', code: '4' }).code).toBe('4');
  });
});

describe('the primary button', () => {
  it('sends a new code instead of verifying a used-up one', () => {
    expect(contactPrimaryAction({ verified: false, codeSent: true, usedUp: true })).toBe('sendNew');
    expect(defaultText(CONTACT_PRIMARY_LABEL.sendNew)).toBe('Send a new code');
  });

  it('is unchanged otherwise', () => {
    expect(contactPrimaryAction({ verified: false, codeSent: true, usedUp: false })).toBe('verify');
    expect(contactPrimaryAction({ verified: false, codeSent: false, usedUp: false })).toBe('send');
    expect(contactPrimaryAction({ verified: true, codeSent: true, usedUp: true })).toBe('continue');
  });
});

describe('the code panel', () => {
  const render = (usedUp: boolean, style: 'segmented' | 'text') =>
    renderToStaticMarkup(
      <ContactCodePanel
        code="123456"
        onChange={() => undefined}
        onComplete={() => undefined}
        codeLength={6}
        style={style}
        expiresAt={null}
        onResend={() => undefined}
        otherChannel={null}
        usedUp={usedUp}
      />,
    );

  it('disables the field in both styles when the code is used up', () => {
    for (const style of ['segmented', 'text'] as const) {
      const html = render(true, style);
      expect(html).toMatch(/<input[^>]*disabled=""/);
      // The primary button sends the new code; no second Resend.
      expect(html).not.toContain('Resend code');
    }
  });

  it('leaves the field enabled for a live code', () => {
    for (const style of ['segmented', 'text'] as const) {
      const html = render(false, style);
      expect(html).not.toMatch(/<input[^>]*disabled=""/);
      expect(html).toContain('Resend code');
    }
  });
});
