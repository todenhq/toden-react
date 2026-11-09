'use client';

import React, { useState } from 'react';
import { Drawer, DrawerContent, SheetHeader, useSheetClose } from '../components/ui/drawer';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { KeyPersonForm } from './KeyPersonForm';
import { isKeyPersonRowValid } from '../lib/business-application';
import type { KeyPeopleSection } from '../lib/key-people-sections';
import type { KeyPersonEntry } from '../context/types';
import type { KeyPersonRole } from '../types/business';
import { useText } from '../i18n';

/** What the sheet calls itself (a text key), per the section that opened it. */
const ADD_TITLES: Record<KeyPeopleSection, string> = {
  ubos: 'keyPeople.sheet.addUbo',
  shareholders: 'keyPeople.sheet.addShareholder',
  representatives: 'keyPeople.sheet.addRepresentative',
};

/**
 * The add/edit key-person sheet. The list step stays a clean stack of summary
 * cards; the FORM lives here — a bottom drawer with a grab handle, the five
 * fields, and a pinned primary action. Editing adds a visually separated
 * destructive "Remove this person" beneath the save (never beside it).
 *
 * Save is enabled once the draft is valid. A combined-ownership overshoot
 * WARNS here but never blocks saving — the fix may live on a different
 * person's %, and trapping the user inside this sheet would force them to
 * discard their work to go adjust it.
 */
const EMPTY_ROLES: ReadonlySet<KeyPersonRole> = new Set();

export function KeyPersonSheet({
  mode,
  section,
  corporateKyb = false,
  initial,
  uboThreshold,
  otherPctTotal,
  onSave,
  onRemove,
  onClose,
  defaultCountry,
  emailRequiredFor = EMPTY_ROLES,
}: {
  mode: 'add' | 'edit';
  /** The section whose add-tile or card opened the sheet. */
  section: KeyPeopleSection;
  /** The workflow sends corporate shareholders their own KYB application. */
  corporateKyb?: boolean;
  initial: KeyPersonEntry;
  uboThreshold?: number;
  /** Sum of every OTHER person's ownership % — for the combined warning. */
  otherPctTotal: number;
  onSave: (entry: KeyPersonEntry) => void;
  /** Edit mode only — removes the person and closes. */
  onRemove?: () => void;
  onClose: () => void;
  /** The workflow demands an address for everyone listed. */
  emailRequiredFor?: ReadonlySet<KeyPersonRole>;
  /** The business's own country, pinned to the top of the country picker. */
  defaultCountry?: string;
}) {
  const t = useText();
  // Close and dismiss slide the sheet away before the parent removes it.
  const sheet = useSheetClose(onClose);
  const [draft, setDraft] = useState<KeyPersonEntry>(initial);
  // Bottom drawer on mobile; side sheet from the right on desktop — matching
  // the modal's own layout breakpoint. Decided once per open (no resize
  // thrash mid-edit).
  const [direction] = useState<'bottom' | 'right'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
      ? 'right'
      : 'bottom',
  );

  const draftPct = Number(draft.ownershipPct);
  const combinedTotal =
    draft.ownershipPct.trim() !== '' && Number.isFinite(draftPct)
      ? otherPctTotal + draftPct
      : otherPctTotal;
  const fmtPct = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const combinedPctError =
    combinedTotal > 100
      ? t('keyPeople.form.ownership.combinedError', {
          total: fmtPct(combinedTotal),
          over: fmtPct(combinedTotal - 100),
        })
      : null;

  const canSave = isKeyPersonRowValid(draft);

  return (
    <Drawer direction={direction} {...sheet.rootProps}>
      <DrawerContent direction={direction}>
        <SheetHeader
          direction={direction}
          title={t(
            mode === 'add'
              ? ADD_TITLES[section]
              : draft.isCorporate
                ? 'keyPeople.sheet.editCompany'
                : 'keyPeople.sheet.editPerson',
          )}
          onClose={sheet.close}
        />

        <div
          className={cn(
            'overflow-y-auto px-4 pb-2 pt-3 sm:px-6',
            direction === 'right' ? 'flex-1' : 'max-h-[65vh]',
          )}
        >
          <KeyPersonForm
            emailRequiredFor={emailRequiredFor}
            defaultCountry={defaultCountry}
            entry={draft}
            section={section}
            corporateKyb={corporateKyb}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            uboThreshold={uboThreshold}
            combinedPctError={combinedPctError}
          />
        </div>

        <div className="px-4 pb-6 pt-2 sm:px-6">
          <Button className="w-full" disabled={!canSave} onClick={() => canSave && onSave(draft)}>
            {t(
              mode === 'add'
                ? draft.isCorporate
                  ? 'keyPeople.sheet.addCompany'
                  : 'keyPeople.sheet.addPerson'
                : 'keyPeople.sheet.save',
            )}
          </Button>
          {mode === 'edit' && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="mt-1 flex h-11 w-full items-center justify-center text-sm font-semibold text-destructive transition-opacity hover:opacity-80"
            >
              {t(draft.isCorporate ? 'keyPeople.sheet.removeCompany' : 'keyPeople.sheet.removePerson')}
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
