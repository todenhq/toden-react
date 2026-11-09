'use client';

import React from 'react';
import { Calendar, FileText, House, Landmark, Stamp, Zap, type AppIconComponent } from '../components/icons';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useText } from '../i18n';
import { cn } from '../lib/utils';
import { poaKindDays, poaKindSummary, poaPeriodLabel } from '../lib/poa-subtypes';
import type { PoaDocumentType, ProofOfAddressConfig } from '../types/config';

/**
 * One icon per document kind, under the SAME names the RN `Icon` map and
 * Flutter's `LucideIcons` carry, so the three SDKs pick the same icon for the
 * same kind. Web draws them from Hugeicons (the dashboard's set); the mobile
 * SDKs still draw Lucide's, so a kind reads consistently within each platform
 * and the list stays in lockstep by MEANING rather than by glyph.
 */
export const POA_TYPE_ICONS: Record<PoaDocumentType, AppIconComponent> = {
  utility_bill: Zap,
  bank_statement: Landmark,
  tenancy_agreement: House,
  government_document: Stamp,
  other: FileText,
};

/**
 * The document kind: one row per kind with its documents in a short phrase
 * and how recent it must be. The applicant picks the KIND; which document
 * within it they uploaded (a water bill, a lease) the server's reader
 * recognises (user decision 2026-11-07). One kind is picked because one
 * document is uploaded: a radio group. Locked once a file is attached, so the
 * kind cannot drift from the document already uploaded.
 *
 * The org's own name for the 'other' kind stands alone, without the generic
 * documents under it: "Council tax letter" is not an insurance policy.
 */
export function PoaAcceptedDocuments({
  kinds,
  value,
  onChange,
  disabled,
  poa,
  labelFor,
  otherLabel,
}: {
  kinds: PoaDocumentType[];
  value: PoaDocumentType;
  onChange: (kind: PoaDocumentType) => void;
  disabled?: boolean;
  poa: ProofOfAddressConfig | undefined;
  labelFor: (kind: PoaDocumentType) => string;
  otherLabel: string | null;
}) {
  const t = useText();
  const language = useVerificationConfig().language;
  return (
    // No visible heading: the kinds' names say what the choice is.
    <div
      role="radiogroup"
      aria-label={t('proofOfAddress.documentType')}
      className="divide-y divide-border overflow-hidden rounded-2xl border border-border"
    >
      {kinds.map((kind) => {
        const checked = kind === value;
        const summary =
          kind === 'other' && otherLabel ? null : poaKindSummary(kind, poa?.documentSubtypes, t, language);
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(kind)}
            className={cn(
              'relative flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none',
              'focus:outline-none focus-visible:bg-muted/60 disabled:cursor-not-allowed',
              checked ? 'bg-primary/[0.05]' : 'hover:bg-muted/40 disabled:opacity-50',
            )}
          >
            {/* The chosen row's edge marks it, as well as its radio. */}
            {checked && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" />}
            <span
              aria-hidden
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150',
                checked ? 'border-primary' : 'border-input',
              )}
            >
              {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-checkmark-pop" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[13px] leading-[1.125rem]', checked ? 'font-semibold' : 'font-medium')}>{labelFor(kind)}</span>
              {summary && <span className="mt-0.5 line-clamp-2 block text-[11px] leading-[0.95rem] text-muted-foreground">{summary}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" aria-hidden />
              {poaPeriodLabel(poaKindDays(poa, kind), t)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
