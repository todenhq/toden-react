'use client';

import React from 'react';
import { Info } from '../components/icons';
import { useText } from '../i18n';

/**
 * Shareholders the register has not sent yet (lib/ownership-pending.ts).
 *
 * One quiet line, icon and words, in a polite live region: on the key-people
 * step it says owners can still be added by hand, and on the success screen it
 * says their invite links are coming. Mirrors the React Native SDK's
 * KeyPeopleOwnershipNote and the Flutter SDK's KeyPeopleOwnershipNote.
 */
export function KeyPeopleOwnershipNote({ where }: { where: 'step' | 'submitted' }) {
  const t = useText();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-left text-sm text-muted-foreground"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>
        {t(where === 'step' ? 'keyPeople.hints.ownershipPending' : 'keyPeople.await.ownershipPending')}
      </span>
    </div>
  );
}
