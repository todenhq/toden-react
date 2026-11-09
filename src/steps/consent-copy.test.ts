import { describe, expect, it } from 'vitest';
import { createTextFn } from '../i18n/translate';
import { consentDescription, consentMinutes, consentProcessSteps, consentTitle } from './consent-copy';
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

describe('the consent screen’s time estimate', () => {
  const steps = (config: Partial<VerificationConfigValue>) =>
    consentProcessSteps({ ...config } as VerificationConfigValue, { isBusiness: false, scope: null });

  it('adds up what the flow will ask for, in whole minutes rounded up', () => {
    // ID number, document scan, selfie: 30 + 60 + 45 seconds.
    expect(consentMinutes(steps({}))).toBe(3);
  });

  it('is at least a minute', () => {
    expect(consentMinutes([])).toBe(1);
  });

  it('grows with the steps a workflow adds', () => {
    const base = consentMinutes(steps({}));
    const more = consentMinutes(steps({ proofOfAddress: { enabled: true } } as Partial<VerificationConfigValue>));
    expect(more).toBeGreaterThanOrEqual(base);
  });

  it('no longer promises to collect personal information', () => {
    expect(steps({}).map((s) => s.label)).not.toContain('Collect basic personal information');
  });
});

describe('the consent description says how long the flow takes', () => {
  it('adds the time as a sentence of its own', () => {
    expect(consentDescription({ isBusiness: false, scope: null, minutes: 3 })).toBe(
      "We're required to confirm who you are, and we'll guide you at every step. It takes about 3 minutes.",
    );
    expect(consentDescription({ isBusiness: false, scope: null, minutes: 1 })).toMatch(/It takes about a minute\.$/);
  });

  it('leaves the face and contact screens, which say their own time, alone', () => {
    expect(consentDescription({ isBusiness: false, scope: 'biometric-authentication', minutes: 1 })).not.toMatch(/It takes/);
    expect(consentDescription({ isBusiness: false, scope: 'contact', minutes: 1 })).not.toMatch(/It takes/);
  });
});

describe('the consent steps run in the flow’s order', () => {
  it('scans the document before checking the ID, then the selfie', () => {
    const labels = consentProcessSteps({} as VerificationConfigValue, { isBusiness: false, scope: null }).map((s) => s.label);
    expect(labels).toEqual(['Scan your ID document', 'Check that your ID is genuine', 'Take a selfie for facial verification']);
  });
});
