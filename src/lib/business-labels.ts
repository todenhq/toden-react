// Display labels for business documents and the roles people hold, in the
// flow's copy. The text lives in the text catalogue (business and keyPeople
// groups); the constants are the English defaults for callers without a flow.

import type { ApplicantRole, BusinessDocumentKey, KeyPersonRole } from '../types/business';
import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';

/** Text keys of the default display label per document key (server contract). */
const BUSINESS_DOCUMENT_TEXT_KEYS: Record<BusinessDocumentKey, string> = {
  incorporation_certificate: 'business.documents.type.incorporationCertificate',
  memart: 'business.documents.type.memart',
  proof_of_address: 'business.documents.type.proofOfAddress',
  tax_document: 'business.documents.type.taxDocument',
  regulatory_license: 'business.documents.type.regulatoryLicense',
  board_resolution: 'business.documents.type.boardResolution',
  other: 'business.documents.type.other',
  business_registration: 'business.documents.type.businessRegistration',
  good_standing_certificate: 'business.documents.type.goodStandingCertificate',
  registry_extract: 'business.documents.type.registryExtract',
  annual_return: 'business.documents.type.annualReturn',
  register_of_directors: 'business.documents.type.registerOfDirectors',
  shareholder_register: 'business.documents.type.shareholderRegister',
  share_certificate: 'business.documents.type.shareCertificate',
  ubo_declaration: 'business.documents.type.uboDeclaration',
  power_of_attorney: 'business.documents.type.powerOfAttorney',
  authorization_letter: 'business.documents.type.authorizationLetter',
  financial_statements: 'business.documents.type.financialStatements',
};

const KEY_PERSON_ROLE_TEXT_KEYS: Record<KeyPersonRole, string> = {
  director: 'keyPeople.role.director',
  beneficial_owner: 'keyPeople.role.beneficialOwner',
  signatory: 'keyPeople.role.signatory',
  shareholder: 'keyPeople.role.shareholder',
};

const APPLICANT_ROLE_TEXT_KEYS: Record<ApplicantRole, string> = {
  ...KEY_PERSON_ROLE_TEXT_KEYS,
  authorized_representative: 'business.applicant.role.authorizedRepresentative',
};

const labelsFrom = <K extends string>(keys: Record<K, string>, t: TextFn): Record<K, string> =>
  Object.fromEntries(Object.entries(keys).map(([k, key]) => [k, t(key as string)])) as Record<K, string>;

/** The display label of a document key, in the flow's copy. */
export function businessDocumentLabel(key: BusinessDocumentKey, t: TextFn = defaultText): string {
  const textKey = BUSINESS_DOCUMENT_TEXT_KEYS[key];
  return textKey ? t(textKey) : key;
}

/** The display label of a key-person role, in the flow's copy. */
export function keyPersonRoleLabel(role: KeyPersonRole, t: TextFn = defaultText): string {
  return t(KEY_PERSON_ROLE_TEXT_KEYS[role]);
}

/** The display label of an applicant role, or null for a role this build does not know. */
export function applicantRoleLabel(role: string, t: TextFn = defaultText): string | null {
  const textKey = APPLICANT_ROLE_TEXT_KEYS[role as ApplicantRole];
  return textKey ? t(textKey) : null;
}

/** Default display labels per document key (server contract). */
export const BUSINESS_DOCUMENT_LABELS: Record<BusinessDocumentKey, string> = labelsFrom(
  BUSINESS_DOCUMENT_TEXT_KEYS,
  defaultText,
);

export const KEY_PERSON_ROLE_LABELS: Record<KeyPersonRole, string> = labelsFrom(
  KEY_PERSON_ROLE_TEXT_KEYS,
  defaultText,
);

export const APPLICANT_ROLE_LABELS: Record<ApplicantRole, string> = labelsFrom(
  APPLICANT_ROLE_TEXT_KEYS,
  defaultText,
);
