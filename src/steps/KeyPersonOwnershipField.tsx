'use client';

import React from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { cn } from '../lib/utils';
import type { KeyPersonEntry } from '../context/types';
import type { KeyPersonRole } from '../types/business';
import { useText } from '../i18n';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { keyPeopleRequireOwnership, rowNeedsStake } from '../lib/key-person-stake';

/** Whether the role is an ownership one (% field is only meaningful then). */
function isOwnerRole(role: KeyPersonRole): boolean {
  return role === 'beneficial_owner' || role === 'shareholder';
}

/**
 * The ownership-percentage field, with the regulatory consequence surfaced as
 * feedback: at or above the threshold the server escalates the party to a
 * beneficial owner whatever role was picked, and for a company it does the
 * opposite, because that term means a natural person.
 */
export function KeyPersonOwnershipField({
  entry,
  onChange,
  uboThreshold,
  combinedPctError,
}: {
  entry: KeyPersonEntry;
  onChange: (patch: Partial<KeyPersonEntry>) => void;
  uboThreshold: number;
  combinedPctError: string | null;
}) {
  const t = useText();
  const required = keyPeopleRequireOwnership(useVerificationConfig().business) && rowNeedsStake(entry);
  const corp = entry.isCorporate;
  const pct = entry.ownershipPct.trim();
  const pctNum = Number(pct);
  const pctInvalid = pct !== '' && (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100);
  const uboHint =
    !corp && !pctInvalid && pct !== '' && pctNum >= uboThreshold && entry.role !== 'beneficial_owner';
  // The slider's position. It rests at 0 for an undeclared stake; the BOX is
  // what records a value, so an untouched slider still submits "not declared"
  // rather than a fabricated zero.
  const sliderValue = pct !== '' && Number.isFinite(pctNum) ? Math.min(100, Math.max(0, pctNum)) : 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="kp-sheet-pct">
        {t('keyPeople.form.ownership.label')}{' '}
        {required ? (
          <span aria-hidden className="text-destructive">*</span>
        ) : (
          <span className="text-muted-foreground">{t('keyPeople.form.optional')}</span>
        )}
      </Label>
      <div className="relative">
        {/* Native spinners hidden: the % suffix takes their corner, and a
            known-exact value is typed, not stepped. */}
        <Input
          id="kp-sheet-pct"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          placeholder="0"
          value={entry.ownershipPct}
          required={required}
          aria-describedby={required && pct === '' ? 'kp-sheet-pct-required' : undefined}
          onChange={(e) => onChange({ ownershipPct: e.target.value })}
          className={cn(
            'pr-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            (pctInvalid || combinedPctError) && 'border-destructive',
          )}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        >
          %
        </span>
      </div>
      {/* The slider is the fast coarse gesture; the box above keeps exact
          fractions (a register stake like 48.42 is typed, no thumb lands on
          it). Dragging writes whole numbers into the same field. */}
      <input
        type="range"
        aria-label="Ownership percentage"
        min={0}
        max={100}
        step={1}
        value={sliderValue}
        onChange={(e) => onChange({ ownershipPct: e.target.value })}
        // The sheet is a vaul drawer, and vaul reads ANY drag inside it as the
        // dismiss gesture — so dragging the thumb dragged the whole sheet.
        // This attribute is vaul's own opt-out for drag-interactive children.
        data-vaul-no-drag=""
        className="w-full cursor-pointer accent-primary"
      />
      {pctInvalid && (
        <p className="text-sm text-destructive">{t('keyPeople.form.ownership.errorRange')}</p>
      )}
      {required && pct === '' && (
        <p id="kp-sheet-pct-required" className="text-xs text-muted-foreground">
          {t('keyPeople.form.ownership.required')}
        </p>
      )}
      {!pctInvalid && combinedPctError && (
        <p className="text-sm text-destructive">{combinedPctError}</p>
      )}
      {uboHint && (
        <p className="text-xs text-muted-foreground">
          {t('keyPeople.form.ownership.uboHint', { threshold: uboThreshold })}
        </p>
      )}
      {/* The company fact moved to the form-level callout (KeyPersonForm),
          always visible on a corporate form rather than appearing only once
          a percentage is typed. */}
    </div>
  );
}
