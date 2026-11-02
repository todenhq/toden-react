import { describe, expect, it } from 'vitest';
import { BUSINESS_SCOPES, isBusinessSubject, isScopedBusiness, unsupportedScopeConfig } from './scope';
import { isBusinessFlow } from './business';
import { buildStepOrder, type StepOrderOptions } from './step-order';
import { firstStepAfterConsent } from './contact-steps';
import { handoffCaptureNeeded } from './handoff-capture';
import { createTextFn } from '../i18n/translate';
import { BUSINESS_VARIANT_BASES, businessKey } from '../i18n/business-variants';
import { DEFAULT_TEXTS } from '../i18n/catalogue';
import { CUSTOMISABLE_AVAILABILITY } from '../i18n/customisable';
import { consentDescription, consentProcessSteps, consentTitle } from '../steps/consent-copy';
import { successDescription } from '../steps/success-copy';
import { decidedCopy } from '../steps/completed-copy';
import { NO_BIOMETRIC_COPY } from './biometric-copy';
import { mapToVerificationError } from './errors';
import { VerificationApiError } from '../services/api';
import type { VerificationConfigValue } from '../context/VerificationConfigContext';

// Scoped BUSINESS workflows: a business may carry the address, questionnaire or
// contact scope. The scope decides the steps (never the KYB application), the
// screens name the business, and a biometric scope on a business is refused.

const business = { country: 'NG' } as never;

const options = (over: Partial<StepOrderOptions> = {}): StepOrderOptions => ({
  isBusiness: false,
  hasDocCapture: true,
  hasLiveness: true,
  hasCountrySelect: false,
  hasEmailVerification: false,
  hasPhoneVerification: false,
  hasPoa: false,
  hasSupportingDocuments: false,
  hasAddressCollection: false,
  hasQuestionnaire: false,
  ...over,
});

describe('which flow a scoped business workflow runs', () => {
  it('knows the scopes a business may carry', () => {
    expect([...BUSINESS_SCOPES].sort()).toEqual(['address', 'contact', 'questionnaire']);
  });

  it('never enters the KYB application once a scope is set', () => {
    expect(isBusinessFlow({ subjectType: 'business', business })).toBe(true);
    for (const scope of BUSINESS_SCOPES) {
      expect(isBusinessFlow({ subjectType: 'business', business, scope })).toBe(false);
    }
  });

  it('names a scoped business, and only a scoped business', () => {
    expect(isScopedBusiness({ subjectType: 'business', scope: 'address' })).toBe(true);
    expect(isScopedBusiness({ subjectType: 'business' })).toBe(false);
    expect(isScopedBusiness({ subjectType: 'individual', scope: 'address' })).toBe(false);
    expect(isScopedBusiness({ subjectType: 'business', scope: 'biometric-enrollment' })).toBe(false);
    expect(isBusinessSubject({ subjectType: 'business' })).toBe(true);
  });

  it('refuses a business workflow with a biometric scope, and nothing else', () => {
    expect(unsupportedScopeConfig({ subjectType: 'business', scope: 'biometric-authentication' })).toBe(true);
    expect(unsupportedScopeConfig({ subjectType: 'business', scope: 'biometric-enrollment' })).toBe(true);
    expect(unsupportedScopeConfig({ subjectType: 'individual', scope: 'biometric-enrollment' })).toBe(false);
    expect(unsupportedScopeConfig({ subjectType: 'business', scope: 'address' })).toBe(false);
    expect(unsupportedScopeConfig({ subjectType: 'business' })).toBe(false);
  });

  it('builds the scope order even when told the flow is a business', () => {
    expect(buildStepOrder(options({ isBusiness: true, business, scope: 'questionnaire', hasQuestionnaire: true }))).toEqual([
      'consent',
      'questionnaire',
      'submitted',
    ]);
    expect(buildStepOrder(options({ isBusiness: true, business, scope: 'contact', hasEmailVerification: true }))).toEqual([
      'consent',
      'email-verification',
      'submitted',
    ]);
    const address = buildStepOrder(
      options({ isBusiness: true, business, scope: 'address', hasPoa: true, hasAddressCollection: true }),
    );
    expect(address).toEqual(['consent', 'proof-of-address', 'address-collection', 'address-review', 'submitted']);
    expect(address).not.toContain('business-details');
  });

  it('leaves consent for the scope headline, not the business form', () => {
    expect(
      firstStepAfterConsent({ subjectTypeIsBusiness: isBusinessFlow({ subjectType: 'business', business, scope: 'questionnaire' }), scope: 'questionnaire' }),
    ).toBe('questionnaire');
  });

  it('never offers the phone for a camera on a business', () => {
    expect(handoffCaptureNeeded({ subjectType: 'business', scope: 'biometric-enrollment' })).toBe(false);
    expect(handoffCaptureNeeded({ subjectType: 'business', scope: 'questionnaire' })).toBe(false);
    expect(handoffCaptureNeeded({ subjectType: 'business', scope: 'address', addressCollection: { enabled: true } })).toBe(true);
    expect(handoffCaptureNeeded({ subjectType: 'business', scope: 'address' })).toBe(false);
  });
});

describe('business wording on scoped screens', () => {
  const t = createTextFn();

  it('every business variant has a default and stands in for a real text', () => {
    for (const [variant, base] of Object.entries(BUSINESS_VARIANT_BASES)) {
      expect(DEFAULT_TEXTS[variant], variant).toBeTruthy();
      expect(DEFAULT_TEXTS[base], base).toBeTruthy();
      expect(variant).toBe(`${base}.business`);
      // Not on the editor's capped list: they inherit the base text instead.
      expect(variant in CUSTOMISABLE_AVAILABILITY, variant).toBe(false);
    }
  });

  it('swaps a key only on a scoped business', () => {
    expect(businessKey('contact.email.title', true)).toBe('contact.email.title.business');
    expect(businessKey('contact.email.title', false)).toBe('contact.email.title');
    expect(businessKey('contact.verifyCode', true)).toBe('contact.verifyCode');
  });

  it('lets the org words for the base text win over the business default', () => {
    const custom = createTextFn({ en: { 'contact.email.title': 'Confirm the address' } });
    expect(custom('contact.email.title.business')).toBe('Confirm the address');
    expect(t('contact.email.title.business')).toBe('Verify your business email');
    // An older dedicated field still wins over both.
    expect(t('questionnaire.title.business', undefined, 'Our questions')).toBe('Our questions');
  });

  it('titles and describes the consent screen for the business', () => {
    const c = { isBusiness: false, scopedBusiness: true };
    expect(consentTitle({ ...c, scope: 'address' }, t)).toBe('Business Address Verification');
    expect(consentTitle({ ...c, scope: 'questionnaire' }, t)).toBe('A Few Questions About Your Business');
    expect(consentTitle({ ...c, scope: 'contact' }, t)).toBe('Confirm Your Business Contact Details');
    expect(consentDescription({ ...c, scope: 'address' }, t)).toContain('where your business operates');
    // A person keeps their own wording.
    expect(consentTitle({ isBusiness: false, scope: 'address' }, t)).toBe('Address Verification');
  });

  it('lists the business steps on the consent screen', () => {
    const config = {
      addressCollection: { enabled: true },
      proofOfAddress: { enabled: true },
      subjectType: 'business',
      scope: 'address',
    } as unknown as VerificationConfigValue;
    const labels = consentProcessSteps(config, { isBusiness: false, scope: 'address', scopedBusiness: true }, t).map(
      (s) => s.label,
    );
    expect(labels).toContain('Pin your business premises on a map');
    expect(labels).toContain("Upload a document showing your business's address");
    expect(labels).not.toContain('Collect your business registration details');
  });

  it('words the outcome for the business', () => {
    expect(successDescription(undefined, {}, true, 'contact', t)).toBe(
      "Your business contact verification has been submitted. You'll be notified of the result.",
    );
    expect(successDescription(undefined, {}, false, 'contact', t)).toBe(
      "Your contact verification has been submitted. You'll be notified of the result.",
    );
    const approved = decidedCopy(
      'approved',
      { isBusiness: true, scope: 'address', reason: null, words: NO_BIOMETRIC_COPY },
      t,
    );
    expect(approved?.description).toBe("Your business's address has been verified. There is nothing left to do here.");
  });

  it('keeps the scoped texts off the KYB application list in the editor', () => {
    expect(CUSTOMISABLE_AVAILABILITY['business.details.title']).toEqual({ subject: 'business', scopes: ['full'] });
    expect(CUSTOMISABLE_AVAILABILITY['proofOfAddress.title']?.subject).toBeUndefined();
  });
});

describe('a reference naming the other kind of record', () => {
  it('is a configuration error, not something a retry fixes', () => {
    const err = mapToVerificationError(
      new VerificationApiError('This reference belongs to an individual.', 422, 'entity_type_mismatch'),
      'verify',
    );
    expect(err.code).toBe('invalid_workflow');
    expect(err.message).toBe(
      'This verification is set up for a different kind of record. Contact the organisation that sent it.',
    );
  });
});
