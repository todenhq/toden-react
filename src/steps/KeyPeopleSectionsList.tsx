'use client';

import React from 'react';
import {
  grantRole,
  quickAddCandidates,
  sectionMembers,
  withoutSection,
  type KeyPeopleSection as SectionKey,
} from '../lib/key-people-sections';
import { KeyPeopleSection } from './KeyPeopleSection';
import { KeyPeopleUboExemption } from './KeyPeopleUboExemption';
import { KeyPeopleOwnershipNote } from './KeyPeopleOwnershipNote';
import { ownershipNoteSection } from '../lib/ownership-pending';
import type { KeyPeopleSectionDef } from './key-people-step-model';
import type { KeyPersonEntry } from '../context/types';
import type { KeyPersonRole } from '../types/business';

/**
 * The stacked sections with their shared-list plumbing: quick-add grants an
 * existing person the section's hat, and the card's X takes them out of that
 * section — dropping just the hat when membership rested on it, or the whole
 * person when a declared stake (or a last remaining hat) is what holds them
 * there. Split from BusinessKeyPeopleStep (200-line rule).
 */
export function KeyPeopleSectionsList({
  sections,
  rows,
  threshold,
  emailRequiredFor,
  uboUnidentifiable,
  ownershipPending = false,
  canAdd,
  onRows,
  onSheet,
  onExemption,
}: {
  sections: KeyPeopleSectionDef[];
  rows: KeyPersonEntry[];
  threshold: number;
  emailRequiredFor: ReadonlySet<KeyPersonRole>;
  uboUnidentifiable: boolean;
  /** The register is still sending the shareholders (lib/ownership-pending.ts). */
  ownershipPending?: boolean;
  canAdd: boolean;
  onRows: (next: KeyPersonEntry[]) => void;
  onSheet: (sheet: { mode: 'add' | 'edit'; section: SectionKey; index?: number }) => void;
  onExemption: (next: boolean) => void;
}) {
  const members = sectionMembers(rows, threshold);
  const noteIn = ownershipPending ? ownershipNoteSection(sections.map((s) => s.key)) : null;

  const removeFromSection = (section: SectionKey, index: number) => {
    const next = withoutSection(rows[index]!, section, threshold);
    onRows(
      next === null
        ? rows.filter((_, i) => i !== index)
        : rows.map((row, i) => (i === index ? next : row)),
    );
  };

  return (
    <div className="space-y-8">
      {sections.map(({ key, title, description, addLabel }, i) => (
        <React.Fragment key={key}>
          {i > 0 && <div className="border-t border-border" aria-hidden />}
          <KeyPeopleSection
            section={key}
            title={title}
            description={description}
            rows={rows}
            members={members[key]}
            quickAdd={
              key === 'ubos' && uboUnidentifiable ? [] : quickAddCandidates(rows, key, threshold)
            }
            emailRequiredFor={emailRequiredFor}
            notice={key === noteIn ? <KeyPeopleOwnershipNote where="step" /> : undefined}
            addLabel={addLabel}
            canAdd={canAdd && !(key === 'ubos' && uboUnidentifiable)}
            onAdd={() => onSheet({ mode: 'add', section: key })}
            onEdit={(index) => onSheet({ mode: 'edit', section: key, index })}
            onRemove={(index) => removeFromSection(key, index)}
            onQuickAdd={(index) =>
              onRows(rows.map((row, i2) => (i2 === index ? grantRole(row, key) : row)))
            }
          >
            {key === 'ubos' && (
              <KeyPeopleUboExemption
                checked={uboUnidentifiable}
                hasUbos={members.ubos.length > 0}
                onChange={onExemption}
              />
            )}
          </KeyPeopleSection>
        </React.Fragment>
      ))}
    </div>
  );
}
