import { describe, expect, it } from 'vitest';
import { createTextFn } from '../i18n/translate';
import { consentDescription, consentProcessSteps, consentTitle } from './consent-copy';
import type { VerificationConfigValue } from '../context/VerificationConfigContext';

describe('recording sound on the consent screen', () => {
  it('is not listed, whichever recording is on', () => {
    const labels = (scope: string | null) =>
      consentProcessSteps({ documentAudio: true, livenessAudio: true } as VerificationConfigValue, { isBusiness: false, scope })
        .map((step) => step.label)
        .join(' ');
    expect(labels(null)).not.toMatch(/sound/i);
    expect(labels('biometric-authentication')).not.toMatch(/sound/i);
  });
});

describe('consent copy', () => {
  const t = createTextFn(undefined, undefined, { firstName: 'Ada' });

  it('greets by name, else names the flow', () => {
    expect(consentTitle({ isBusiness: false, scope: null, firstName: 'Ada' }, t)).toBe('Welcome, Ada');
    expect(consentTitle({ isBusiness: true, scope: null })).toBe('Business Verification');
    expect(consentTitle({ isBusiness: false, scope: 'biometric-enrollment' })).toBe('Face Enrolment');
    expect(consentTitle({ isBusiness: false, scope: null })).toBe('Identity Verification');
  });

  it('lets an older consent.title or consent.description win, tokens filled', () => {
    expect(consentTitle({ isBusiness: false, scope: null, firstName: 'Ada', legacy: 'Hi {firstName}' }, t)).toBe(
      'Hi Ada',
    );
    expect(consentDescription({ isBusiness: true, scope: null, legacy: 'Custom' })).toBe('Custom');
  });

  it('keeps a scope variant as written: only the shared welcome copy is customisable', () => {
    const custom = createTextFn({ en: { 'welcome.description.contact': 'Confirm it.' } });
    expect(consentDescription({ isBusiness: false, scope: 'contact' }, custom)).not.toBe('Confirm it.');
  });
});
