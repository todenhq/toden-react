'use client';

import React from 'react';
import { CountryFlag } from '../components/CountryFlag';
import { regionCountryName } from '../lib/regions';
import { type TextFn } from '../i18n';
import type { PoaDocumentType } from '../types/config';

// Proof of Address: the pieces the step and its parts share (200-line rule):
// a kind's name, the flag, the card frame, what the document must show.
//
// The country the document is for shows beside its flag (user decision
// 2026-09-05), so a person on a multi-market flow sees which market the paper
// is read against. Null when the flow does not know it yet: nothing is
// invented.

/** Each kind's segment in its `proofOfAddress.kind.*` keys. */
const KIND_KEYS: Record<PoaDocumentType, string> = {
  utility_bill: 'utilityBill',
  bank_statement: 'bankStatement',
  tenancy_agreement: 'tenancyAgreement',
  government_document: 'governmentDocument',
  other: 'other',
};

/** A kind's name. The org's own name for 'other' (otherLabel) wins, as before. */
export function poaKindLabel(type: PoaDocumentType, otherLabel: string | null, t: TextFn): string {
  return t(`proofOfAddress.kind.${KIND_KEYS[type]}`, undefined, type === 'other' ? otherLabel : null);
}

export function PoaFlag({ country, className }: { country: string | null; className: string }) {
  if (!country) return null;
  return <CountryFlag code={country} className={className} title={regionCountryName(country)} />;
}

export const POA_CARD = 'w-full rounded-2xl border bg-background transition-colors duration-150';
