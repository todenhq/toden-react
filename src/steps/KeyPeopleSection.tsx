'use client';

import React from 'react';
import { Building2, Plus, UserRound } from '../components/icons';
import { KeyPersonCard } from './KeyPersonCard';
import { keyPersonRoleLabel } from '../lib/business-application';
import { useText } from '../i18n';
import { SECTION_ROLE, type KeyPeopleSection } from '../lib/key-people-sections';
import type { KeyPersonEntry } from '../context/types';
import type { KeyPersonRole } from '../types/business';

/**
 * One section of the key-people step — heading, plain-language definition, the
 * member cards, quick-add chips for people already entered elsewhere, and the
 * dashed add-tile. Sections are VIEWS over one shared list (see
 * key-people-sections.ts): the same human appears in every section whose
 * definition they meet, and a chip grants them another hat rather than
 * retyping them.
 */
export function KeyPeopleSection({
  section,
  title,
  description,
  rows,
  members,
  quickAdd,
  emailRequiredFor,
  addLabel,
  canAdd,
  onAdd,
  onEdit,
  onRemove,
  onQuickAdd,
  children,
  notice,
}: {
  section: KeyPeopleSection;
  title: string;
  description: string;
  rows: KeyPersonEntry[];
  /** Indices (into rows) of this section's members. */
  members: number[];
  /** Indices offerable as one-tap chips. */
  quickAdd: number[];
  emailRequiredFor: ReadonlySet<KeyPersonRole>;
  addLabel: string;
  /** False once the list is at the server's cap. */
  canAdd: boolean;
  onAdd: () => void;
  onEdit: (index: number) => void;
  /** The card's X — take this person out of THIS section. */
  onRemove: (index: number) => void;
  onQuickAdd: (index: number) => void;
  /** Extra section furniture (the UBO exemption checkbox). */
  children?: React.ReactNode;
  /** A note shown under the definition (shareholders still on their way). */
  notice?: React.ReactNode;
}) {
  const t = useText();
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      {notice}

      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((index) => (
            <KeyPersonCard
              key={index}
              entry={rows[index]!}
              emailRequiredFor={emailRequiredFor}
              // The card names the hat THIS section is about, so the same
              // person reads "Beneficial owner" here and "Director" there.
              roleLabel={keyPersonRoleLabel(SECTION_ROLE[section], t)}
              onClick={() => onEdit(index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}

      {quickAdd.length > 0 && canAdd && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('keyPeople.section.quickAdd')}
          </p>
          <div className="flex flex-wrap gap-2">
            {quickAdd.map((index) => {
              const row = rows[index]!;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onQuickAdd(index)}
                  className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-3 pr-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  {row.isCorporate ? (
                    <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                  <span className="max-w-40 truncate">{row.name.trim()}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plus className="h-3 w-3" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-3.5 text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
        </button>
      )}

      {children}
    </section>
  );
}
