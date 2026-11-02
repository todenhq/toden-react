'use client';

import { useVerificationConfig } from '../context/VerificationConfigContext';
import { keyPeopleRequireOwnership, rowMissingStake } from '../lib/key-person-stake';
import React from 'react';
import { Building2, FileText, Pencil, X } from '../components/icons';
import { CountryFlag } from '../components/CountryFlag';
import {
  initialsOf,
  keyPersonRoleLabel,
  isKeyPersonRowValid,
  rowNeedsEmail,
} from '../lib/business-application';
import { regionCountryName } from '../lib/regions';
import { cn } from '../lib/utils';
import type { KeyPersonEntry } from '../context/types';
import type { KeyPersonRole } from '../types/business';
import { useText } from '../i18n';

/**
 * One saved key person, summarised — monogram avatar with their ID-issuing
 * country flag badged on its corner, name, role · ownership meta, and the
 * country + email their invite will go to. The whole card opens the edit
 * sheet (the pencil is the affordance); removal lives INSIDE that sheet, so a
 * stray tap can never delete a person.
 *
 * Same visual language as the applicant step's "this is me" cards, so the two
 * screens read as one system.
 */
const EMPTY_ROLES: ReadonlySet<KeyPersonRole> = new Set();

export function KeyPersonCard({
  entry,
  emailRequiredFor = EMPTY_ROLES,
  onClick,
  roleLabel,
  onRemove,
}: {
  entry: KeyPersonEntry;
  /** Roles the workflow demands an address from. */
  emailRequiredFor?: ReadonlySet<KeyPersonRole>;
  onClick: () => void;
  /** Names the hat the HOSTING section is about (sectioned step); falls back
   *  to the headline role. */
  roleLabel?: string;
  /** The sectioned step's X: take this person out of that section. */
  onRemove?: () => void;
}) {
  const t = useText();
  const corp = entry.isCorporate;
  const name =
    entry.name.trim() || t(corp ? 'keyPeople.card.unnamedCompany' : 'keyPeople.card.unnamedPerson');
  const country = entry.country.trim() ? entry.country.trim().toUpperCase() : null;
  const pct = entry.ownershipPct.trim();
  // A row persisted by the old inline UI (or interrupted mid-edit) may be
  // incomplete — the card says so instead of silently blocking Continue.
  const stakeRequired = keyPeopleRequireOwnership(useVerificationConfig().business);
  const incomplete = !isKeyPersonRowValid(entry, emailRequiredFor, stakeRequired);
  // Say WHICH thing is missing, on the row it is missing from. A person who
  // needs an email is a different fix from a half-typed row, and "incomplete"
  // sends them into the form to work out which.
  const named = entry.name.trim().length >= 2;
  const problem =
    named && rowMissingStake(entry, stakeRequired)
      ? t('keyPeople.card.ownershipRequired')
      : rowNeedsEmail(entry, emailRequiredFor) && entry.email.trim() === '' && named
        ? t('keyPeople.card.emailRequired')
        : t('keyPeople.card.incomplete');

  const meta = [
    // Says why this row has no verification link beside it, on the row itself.
    corp ? t('keyPeople.card.company') : null,
    roleLabel ?? keyPersonRoleLabel(entry.role, t),
    (entry.title ?? '').trim() || null,
    pct ? t('keyPeople.card.ownership', { pct }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // The flag alone doesn't say WHICH country — spell it out, alongside the
  // email their invite goes to.
  const detail = [
    country ? regionCountryName(country) : null,
    corp ? entry.registrationNumber.trim() || null : null,
    entry.email.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      aria-label={`Edit ${name}`}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
        incomplete ? 'border-destructive' : 'border-border hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      {/* Monogram avatar with the ID-issuing-country flag badge. */}
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {corp ? <Building2 className="h-4 w-4" aria-hidden /> : initialsOf(name)}
        {country && (
          <span className="absolute -bottom-0.5 -right-1 rounded-full ring-2 ring-background">
            <CountryFlag code={country} className="block h-4 w-4" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span>
        {incomplete ? (
          <span className="mt-0.5 block truncate text-xs text-destructive">{problem}</span>
        ) : detail !== '' ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
        {entry.documentRemoved && (
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t('keyPeople.card.documentRemoved')}</span>
          </span>
        )}
      </span>

      <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${name} from this section`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          className="-mr-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </span>
      )}
    </button>
  );
}
