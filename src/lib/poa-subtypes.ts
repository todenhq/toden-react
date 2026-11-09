import type { TextFn } from '../i18n/types';
import type { PoaDocumentSubtype, PoaDocumentType, ProofOfAddressConfig } from '../types/config';

// The documents each proof-of-address kind is made of, as business documents
// sit inside their groups. The applicant picks the kind; the server's reader
// recognises which document within it was uploaded.
//
// MIRRORS kyc-core's POA_DOCUMENT_SUBTYPES (src/lib/proof-of-address/types.ts).
// The keys are an add-only contract.

export const POA_SUBTYPES_BY_KIND: Record<PoaDocumentType, readonly PoaDocumentSubtype[]> = {
  utility_bill: ['electricity_bill', 'water_bill', 'gas_bill', 'internet_bill', 'phone_bill', 'waste_bill'],
  bank_statement: ['bank_statement', 'credit_card_statement', 'mortgage_statement', 'loan_statement'],
  tenancy_agreement: ['tenancy_agreement', 'lease_agreement', 'property_title'],
  government_document: [
    'tax_document',
    'property_rates_bill',
    'voter_registration',
    'voter_id',
    'benefits_letter',
    'government_letter',
  ],
  other: ['insurance_document', 'employer_letter', 'education_letter', 'other_document'],
};

const ALL = new Set<string>(Object.values(POA_SUBTYPES_BY_KIND).flat());

/** A subtype's text key: `proofOfAddress.subtype.electricityBill`. */
export const poaSubtypeKey = (subtype: PoaDocumentSubtype) =>
  `proofOfAddress.subtype.${subtype.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`;

/**
 * The subtypes accepted inside one kind. The workflow's `documentSubtypes`
 * narrows a kind only where it names at least one of that kind's subtypes;
 * a kind it says nothing about keeps all of them.
 */
export function acceptedSubtypes(
  kind: PoaDocumentType,
  configured: readonly string[] | undefined,
): PoaDocumentSubtype[] {
  const own = POA_SUBTYPES_BY_KIND[kind];
  const picked = (configured ?? []).filter((s) => ALL.has(s));
  const narrowed = own.filter((s) => picked.includes(s));
  return narrowed.length > 0 ? narrowed : [...own];
}

const camel = (subtype: PoaDocumentSubtype) => subtype.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * A kind's documents in one short phrase: "Electricity, water, gas or
 * internet". The short names are lower case so they read inside a sentence;
 * the phrase gets its capital here. Joined the language's own way.
 */
export function poaKindSummary(
  kind: PoaDocumentType,
  configured: readonly string[] | undefined,
  t: TextFn,
  language: string | undefined,
): string {
  const words = acceptedSubtypes(kind, configured).map((s) => t(`proofOfAddress.subtypeShort.${camel(s)}`));
  let phrase: string;
  try {
    phrase = new Intl.ListFormat(language || 'en', { type: 'disjunction' }).format(words);
  } catch {
    phrase = words.join(', ');
  }
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** The window a kind's document must fall within, in days (0 = any date). */
export function poaKindDays(poa: ProofOfAddressConfig | undefined | null, kind: PoaDocumentType): number {
  return poa?.documentValidity?.[kind] ?? poa?.maxAgeDays ?? 90;
}

/** "3 months", "1 year", "Any date". */
export function poaPeriodLabel(days: number, t: TextFn): string {
  if (days <= 0) return t('proofOfAddress.validity.any');
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? t('proofOfAddress.validity.year') : t('proofOfAddress.validity.years', { count: years });
  }
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? t('proofOfAddress.validity.month') : t('proofOfAddress.validity.months', { count: months });
}
