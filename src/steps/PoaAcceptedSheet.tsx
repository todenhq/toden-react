'use client';

import React, { useState } from 'react';
import { Calendar, Check } from '../components/icons';
import { Drawer, DrawerContent, SheetHeader, useSheetClose } from '../components/ui/drawer';
import { useText } from '../i18n';
import { acceptedSubtypes, poaKindDays, poaPeriodLabel, poaSubtypeKey } from '../lib/poa-subtypes';
import { cn } from '../lib/utils';
import type { PoaDocumentType, ProofOfAddressConfig } from '../types/config';
import { POA_TYPE_ICONS } from './PoaAcceptedDocuments';

/**
 * Every document the workflow accepts, kind by kind, with how recent each kind
 * must be. The house drawer (components/ui/drawer.tsx), as the key-person
 * sheet uses it: from the bottom on a phone, dragged down to dismiss; a side
 * sheet from the right on a wider screen, where the documents sit in two
 * columns. Decided once per open, matching the modal's own breakpoint.
 */
export function PoaAcceptedSheet({
  kinds,
  selected,
  poa,
  labelFor,
  otherLabel,
  onClose,
}: {
  kinds: PoaDocumentType[];
  /** The kind picked on the step, marked in the list. */
  selected: PoaDocumentType;
  poa: ProofOfAddressConfig | undefined;
  labelFor: (kind: PoaDocumentType) => string;
  otherLabel: string | null;
  onClose: () => void;
}) {
  const t = useText();
  const sheet = useSheetClose(onClose);
  const [direction] = useState<'bottom' | 'right'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 'right' : 'bottom',
  );

  return (
    <Drawer direction={direction} {...sheet.rootProps}>
      <DrawerContent direction={direction} className={direction === 'bottom' ? 'max-h-[85%]' : undefined}>
        <SheetHeader
          direction={direction}
          title={t('proofOfAddress.accepted.title')}
          description={t('proofOfAddress.accepted.description')}
          onClose={sheet.close}
          closeLabel={t('proofOfAddress.accepted.close')}
        />

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-6">
          {kinds.map((kind) => {
            const Icon = POA_TYPE_ICONS[kind];
            const chosen = kind === selected;
            const documents =
              kind === 'other' && otherLabel
                ? [otherLabel]
                : acceptedSubtypes(kind, poa?.documentSubtypes).map((s) => t(poaSubtypeKey(s)));
            return (
              <section
                key={kind}
                aria-labelledby={`poa-accepted-${kind}`}
                className={cn('rounded-2xl border p-3.5', chosen ? 'border-primary/40 bg-primary/[0.04]' : 'border-border')}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      chosen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 id={`poa-accepted-${kind}`} className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {labelFor(kind)}
                  </h3>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Calendar className="h-3 w-3" aria-hidden />
                    {poaPeriodLabel(poaKindDays(poa, kind), t)}
                  </span>
                </div>
                <ul className="mt-2.5 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {documents.map((document) => (
                    <li key={document} className="flex items-start gap-2 text-xs leading-4">
                      <Check className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">{document}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
