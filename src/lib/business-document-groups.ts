// Company documents asked for one per GROUP (Didit's model): the documents an
// organisation ticks inside one group are alternatives, and the applicant
// uploads whichever one they hold. A group is required when any document in it
// is required. The step walks the groups one at a time.
//
// MIRRORS kyc-core's src/lib/workflows/business-document-groups.ts (and its
// BUSINESS_DOCUMENT_GROUPS / BUSINESS_DOCUMENT_GROUP_OF), the React Native
// SDK's config/businessDocumentGroups.ts and the Flutter SDK's
// config/business_document_groups.dart. Change all four together.

import type { BusinessDocumentKey, WorkflowBusinessConfig } from '../types/business';
import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';
import { resolveBusinessDocumentTypes } from './business-application';

export type BusinessDocumentGroupKey =
  | 'legal_presence'
  | 'company_details'
  | 'ownership'
  | 'representative_authorisation'
  | 'address'
  | 'financial'
  | 'tax'
  | 'regulatory'
  | 'other';

/** The groups in the order they are asked for. */
export const BUSINESS_DOCUMENT_GROUP_ORDER: readonly BusinessDocumentGroupKey[] = [
  'legal_presence',
  'company_details',
  'ownership',
  'representative_authorisation',
  'address',
  'financial',
  'tax',
  'regulatory',
  'other',
];

/** Which group each document belongs to. A key this build does not know is 'other'. */
export const BUSINESS_DOCUMENT_GROUP_OF: Record<BusinessDocumentKey, BusinessDocumentGroupKey> = {
  incorporation_certificate: 'legal_presence',
  business_registration: 'legal_presence',
  good_standing_certificate: 'legal_presence',
  registry_extract: 'legal_presence',
  memart: 'company_details',
  annual_return: 'company_details',
  register_of_directors: 'ownership',
  shareholder_register: 'ownership',
  share_certificate: 'ownership',
  ubo_declaration: 'ownership',
  board_resolution: 'representative_authorisation',
  power_of_attorney: 'representative_authorisation',
  authorization_letter: 'representative_authorisation',
  proof_of_address: 'address',
  financial_statements: 'financial',
  tax_document: 'tax',
  regulatory_license: 'regulatory',
  other: 'other',
};

const GROUP_TEXT_KEYS: Record<BusinessDocumentGroupKey, string> = {
  legal_presence: 'business.documents.group.legalPresence',
  company_details: 'business.documents.group.companyDetails',
  ownership: 'business.documents.group.ownership',
  representative_authorisation: 'business.documents.group.representativeAuthorisation',
  address: 'business.documents.group.address',
  financial: 'business.documents.group.financial',
  tax: 'business.documents.group.tax',
  regulatory: 'business.documents.group.regulatory',
  other: 'business.documents.group.other',
};

/** A group's display title, or null for a group this build does not know. */
export function businessDocumentGroupTitle(key: string, t: TextFn = defaultText): string | null {
  const textKey = GROUP_TEXT_KEYS[key as BusinessDocumentGroupKey];
  return textKey ? t(textKey) : null;
}

export interface BusinessDocumentGroup {
  key: BusinessDocumentGroupKey;
  title: string;
  /** The documents that satisfy the group, in the order the workflow lists them. */
  types: Array<{ key: BusinessDocumentKey; label: string; maxAgeMonths: number | null }>;
  required: boolean;
}

/** The groups this flow asks for, in order. Empty when documents are off. */
export function businessDocumentGroups(
  business: WorkflowBusinessConfig | undefined,
  t: TextFn = defaultText,
): BusinessDocumentGroup[] {
  const slots = resolveBusinessDocumentTypes(business, t);
  return BUSINESS_DOCUMENT_GROUP_ORDER.flatMap((key) => {
    const inGroup = slots.filter((s) => (BUSINESS_DOCUMENT_GROUP_OF[s.key] ?? 'other') === key);
    if (inGroup.length === 0) return [];
    // The 'other' group holds one document whose name the organisation wrote,
    // so that name is a better title than "Other documents".
    const title = key === 'other' && inGroup.length === 1 ? inGroup[0]!.label : t(GROUP_TEXT_KEYS[key]);
    return [{
      key,
      title,
      types: inGroup.map(({ key: k, label, maxAgeMonths }) => ({ key: k, label, maxAgeMonths })),
      required: inGroup.some((s) => s.required),
    }];
  });
}

/** The upload that satisfies a group, if there is one. */
export function groupUpload<U extends { type: string }>(group: BusinessDocumentGroup, uploads: U[]): U | null {
  return uploads.find((u) => group.types.some((t) => t.key === u.type)) ?? null;
}

/** Where the step opens: the first group with no upload, else the last group. */
export function firstOpenGroupIndex(groups: BusinessDocumentGroup[], uploads: Array<{ type: string }>): number {
  const open = groups.findIndex((g) => groupUpload(g, uploads) === null);
  return open === -1 ? Math.max(groups.length - 1, 0) : open;
}

/**
 * The uploads after adding one: a group holds one document, so an upload
 * replaces whatever the same group already had.
 */
export function withGroupUpload<U extends { type: string }>(
  group: BusinessDocumentGroup,
  uploads: U[],
  upload: U,
): U[] {
  return [...uploads.filter((u) => !group.types.some((t) => t.key === u.type)), upload];
}

/**
 * The documents as the submission sends them: an upload made for a group names
 * its group and the server recognises which document it is; one restored from
 * before recognition still names its type.
 */
export function businessDocumentsPayload(
  uploads: Array<{ type: string; mediaId: string; group?: string }>,
): Array<{ group: string; mediaId: string } | { type: string; mediaId: string }> {
  return uploads.map((u) => (u.group ? { group: u.group, mediaId: u.mediaId } : { type: u.type, mediaId: u.mediaId }));
}

/** Whether the applicant may move past a group. */
export function canLeaveGroup(group: BusinessDocumentGroup, uploads: Array<{ type: string }>): boolean {
  return !group.required || groupUpload(group, uploads) !== null;
}
