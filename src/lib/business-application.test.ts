import { describe, expect, it } from 'vitest';
import {
  businessSectionSteps,
  hasApplicantVerification,
  hasBusinessDocumentsStep,
  hasKeyPeopleCollection,
  isKeyPersonRowValid,
  keyPeoplePayload,
  keyPeopleRequireEmail,
  nextBusinessStep,
  prevBusinessStep,
  resolveBusinessDocumentTypes,
  splitFullName,
} from './business-application';
import type { WorkflowBusinessConfig } from '../types/business';

const base: WorkflowBusinessConfig = { country: 'NG' };
const full: WorkflowBusinessConfig = {
  country: 'NG',
  keyPeople: { enabled: true, collect: true },
  documents: { enabled: true },
  applicant: { verification: true },
};

describe('step gates', () => {
  it('keyPeople collection needs enabled AND collect', () => {
    expect(hasKeyPeopleCollection(base)).toBe(false);
    expect(hasKeyPeopleCollection({ ...base, keyPeople: { enabled: true } })).toBe(false);
    expect(hasKeyPeopleCollection({ ...base, keyPeople: { collect: true } })).toBe(false);
    expect(hasKeyPeopleCollection({ ...base, keyPeople: { enabled: true, collect: true } })).toBe(true);
  });

  it('documents + applicant gates', () => {
    expect(hasBusinessDocumentsStep(base)).toBe(false);
    expect(hasBusinessDocumentsStep(full)).toBe(true);
    expect(hasApplicantVerification(base)).toBe(false);
    expect(hasApplicantVerification(full)).toBe(true);
  });
});

describe('resolveBusinessDocumentTypes', () => {
  it('defaults to a required incorporation certificate when types absent/empty', () => {
    expect(resolveBusinessDocumentTypes({ ...base, documents: { enabled: true } })).toEqual([
      { key: 'incorporation_certificate', label: 'Certificate of incorporation', required: true, maxAgeMonths: null },
    ]);
    expect(resolveBusinessDocumentTypes({ ...base, documents: { enabled: true, types: [] } })).toEqual([
      { key: 'incorporation_certificate', label: 'Certificate of incorporation', required: true, maxAgeMonths: null },
    ]);
  });

  it('applies default labels, custom labels, and the required flag', () => {
    const types = resolveBusinessDocumentTypes({
      ...base,
      documents: {
        enabled: true,
        types: [
          { key: 'memart', required: true },
          { key: 'tax_document', label: 'TIN certificate' },
        ],
      },
    });
    expect(types).toEqual([
      { key: 'memart', label: 'Memorandum and articles / company constitution', required: true, maxAgeMonths: null },
      { key: 'tax_document', label: 'TIN certificate', required: false, maxAgeMonths: null },
    ]);
  });

  it('is empty when the step is not enabled', () => {
    expect(resolveBusinessDocumentTypes(base)).toEqual([]);
    expect(resolveBusinessDocumentTypes(undefined)).toEqual([]);
  });
});

describe('section sequencing', () => {
  it('orders the configured steps', () => {
    expect(businessSectionSteps(base)).toEqual(['business-details']);
    // Documents follow the company they belong to; people come after.
    expect(businessSectionSteps(full)).toEqual([
      'business-details',
      'business-documents',
      'business-key-people',
      'applicant-role',
    ]);
  });

  it('nextBusinessStep walks the section, then submitted', () => {
    expect(nextBusinessStep('business-details', { business: full })).toBe('business-documents');
    expect(nextBusinessStep('business-documents', { business: full })).toBe('business-key-people');
    expect(nextBusinessStep('business-key-people', { business: full })).toBe('applicant-role');
    expect(nextBusinessStep('applicant-role', { business: full })).toBe('id-type');
    expect(nextBusinessStep('business-details', { business: base })).toBe('submitted');
  });

  it('the questionnaire sits INSIDE the section, before key people', () => {
    // Its questions are about the COMPANY, so it stays with the company form —
    // naming the directors hands the application over to other people, and the
    // applicant's own questions must not trail that.
    const questionnaire = { fields: [{ key: 'a', label: 'A', type: 'text' as const }] };
    expect(nextBusinessStep('business-documents', { business: full, questionnaire })).toBe(
      'questionnaire',
    );
    expect(nextBusinessStep('questionnaire', { business: full, questionnaire })).toBe(
      'business-key-people',
    );
    // No key people / applicant configured: the questionnaire is the end.
    expect(nextBusinessStep('questionnaire', { business: base, questionnaire })).toBe('submitted');
    expect(prevBusinessStep('questionnaire', { business: full, questionnaire })).toBe(
      'business-documents',
    );
    expect(prevBusinessStep('business-key-people', { business: full, questionnaire })).toBe(
      'questionnaire',
    );
  });

  it('prevBusinessStep mirrors, landing on consent at the front', () => {
    expect(prevBusinessStep('business-details', { business: full })).toBe('consent');
    expect(prevBusinessStep('business-documents', { business: full })).toBe('business-details');
    expect(prevBusinessStep('business-key-people', { business: full })).toBe('business-documents');
    expect(prevBusinessStep('applicant-role', { business: full })).toBe('business-key-people');
    // Unconfigured middle steps are skipped in both directions.
    const docsOnly: WorkflowBusinessConfig = { ...base, documents: { enabled: true } };
    expect(prevBusinessStep('business-documents', { business: docsOnly })).toBe('business-details');
  });
});

describe('key-people rows', () => {
  const valid = { name: 'Bola Owner', role: 'beneficial_owner' as const, roles: ['beneficial_owner' as const], title: '', email: '', country: '', ownershipPct: '', isCorporate: false, registrationNumber: '', owners: [] };

  it('validates name, role, optional email and ownership', () => {
    expect(isKeyPersonRowValid(valid)).toBe(true);
    expect(isKeyPersonRowValid({ ...valid, name: ' B ' })).toBe(false);
    expect(isKeyPersonRowValid({ ...valid, email: 'not-an-email' })).toBe(false);
    expect(isKeyPersonRowValid({ ...valid, email: 'bola@x.com' })).toBe(true);
    expect(isKeyPersonRowValid({ ...valid, ownershipPct: '101' })).toBe(false);
    expect(isKeyPersonRowValid({ ...valid, ownershipPct: '60' })).toBe(true);
  });

  it('maps valid rows to the payload shape, dropping empty optionals', () => {
    expect(
      keyPeoplePayload([
        {
          name: ' Bola Owner ',
          role: 'beneficial_owner',
          roles: ['beneficial_owner'],
          title: '',
          email: 'bola@x.com',
          country: 'ng',
          ownershipPct: '60',
          isCorporate: false,
          registrationNumber: '', owners: [],
        },
        { name: 'Jide Director', role: 'director', roles: ['director'], title: '', email: '', country: '', ownershipPct: '', isCorporate: false, registrationNumber: '', owners: [] },
        { name: '', role: 'director', roles: ['director'], title: '', email: '', country: '', ownershipPct: '', isCorporate: false, registrationNumber: '', owners: [] }, // invalid → dropped
      ]),
    ).toEqual([
      { name: 'Bola Owner', role: 'beneficial_owner', roles: ['beneficial_owner'], email: 'bola@x.com', country: 'NG', ownershipPct: 60 },
      { name: 'Jide Director', role: 'director', roles: ['director'] },
    ]);
  });
});

describe('splitFullName', () => {
  it('splits into first/last, tolerating single tokens and blanks', () => {
    expect(splitFullName('John Doe')).toEqual({ firstName: 'John', lastName: 'Doe' });
    expect(splitFullName('  Ada  Ngozi   Obi ')).toEqual({ firstName: 'Ada', lastName: 'Ngozi Obi' });
    expect(splitFullName('Cher')).toEqual({ firstName: 'Cher' });
    expect(splitFullName('   ')).toBeUndefined();
  });
});

describe('a corporate shareholder', () => {
  const corp = {
    name: 'Acme Holdings Ltd',
    role: 'shareholder' as const,
    roles: ['shareholder' as const],
    title: '',
    email: '',
    country: 'NG',
    ownershipPct: '60',
    isCorporate: true,
    registrationNumber: 'RC123456',
    owners: [],
  };

  it('is sent as a company, with its registration number', () => {
    expect(keyPeoplePayload([corp])[0]).toMatchObject({
      name: 'Acme Holdings Ltd',
      isCorporate: true,
      registrationNumber: 'RC123456',
    });
  });

  it('is valid without an email even when the workflow requires one', () => {
    // A company has no inbox to verify and is never sent an invite, so
    // demanding one would block a disclosure the applicant is right to make.
    expect(isKeyPersonRowValid(corp, new Set(['shareholder']))).toBe(true);
    expect(isKeyPersonRowValid({ ...corp, isCorporate: false }, new Set(['shareholder']))).toBe(false);
  });

  it('is never sent as a company when it is the applicant themselves', () => {
    // They ticked "this is me" on a row they had also marked corporate; a
    // company cannot be the person filling in the form.
    expect(keyPeoplePayload([{ ...corp, name: 'Ada Obi' }], 0)[0]).toMatchObject({
      isApplicant: true,
    });
    expect(keyPeoplePayload([{ ...corp, name: 'Ada Obi' }], 0)[0]).not.toHaveProperty('isCorporate');
  });
});

describe('who the form demands an email from', () => {
  const business = (kp: Record<string, unknown>) =>
    ({ country: 'NG', keyPeople: { enabled: true, collect: true, ...kp } }) as never;

  it('asks only the people who will actually be sent a link', () => {
    // The old rule asked everybody, so an applicant was blocked on a
    // signatory's address that nothing would ever use.
    const roles = keyPeopleRequireEmail(
      business({ requireEmail: true, perRole: { beneficial_owner: 'full_kyc' } }),
    );
    expect(roles.has('beneficial_owner')).toBe(true);
    expect(roles.has('director')).toBe(false);
  });

  it('honours an explicit list over the invited default', () => {
    const roles = keyPeopleRequireEmail(
      business({ requireEmail: true, level: 'full_kyc', requireEmailRoles: ['director'] }),
    );
    expect([...roles]).toEqual(['director']);
  });

  it('asks nobody when the switch is off', () => {
    expect(keyPeopleRequireEmail(business({ level: 'full_kyc' })).size).toBe(0);
  });
});

describe('owners declared for a corporate shareholder', () => {
  const corp = {
    name: 'Acme Holdings Ltd',
    role: 'shareholder' as const,
    roles: ['shareholder' as const],
    title: '',
    email: '',
    country: 'NG',
    ownershipPct: '60',
    isCorporate: true,
    registrationNumber: 'RC123456',
    owners: [
      { name: 'Jane Doe', ownershipPct: '75', email: 'jane@x.com', country: 'gb' },
      { name: '', ownershipPct: '', email: '', country: '' },
    ],
  };

  it('sends the named owners and drops the half-typed rows', () => {
    expect(keyPeoplePayload([corp])[0]!.owners).toEqual([
      { name: 'Jane Doe', ownershipPct: 75, email: 'jane@x.com', country: 'GB' },
    ]);
  });

  it('sends nothing when the party is a person', () => {
    // Whoever owns a person is not a question, and the server ignores it.
    expect(keyPeoplePayload([{ ...corp, isCorporate: false }])[0]).not.toHaveProperty('owners');
  });

  it('sends nothing when no owner was named', () => {
    expect(keyPeoplePayload([{ ...corp, owners: [] }])[0]).not.toHaveProperty('owners');
  });
});
