import { describe, expect, it } from 'vitest';
import { stepBeforeContact } from './contact-steps';

describe('Back on the email and phone checks', () => {
  it('takes the email check back to consent', () => {
    expect(stepBeforeContact({ emailVerification: { enabled: true } }, 'email')).toBe('consent');
  });

  it('takes the phone check back to the email check when the flow has one', () => {
    expect(stepBeforeContact({ emailVerification: { enabled: true } }, 'phone')).toBe('email-verification');
  });

  it('takes the phone check back to consent when there is no email check', () => {
    expect(stepBeforeContact({}, 'phone')).toBe('consent');
  });
});
