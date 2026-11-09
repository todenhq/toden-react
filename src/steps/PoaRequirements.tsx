'use client';

import React, { useState } from 'react';
import { Info } from '../components/icons';
import { useText } from '../i18n';
import type { PoaDocumentType, ProofOfAddressConfig } from '../types/config';
import { PoaAcceptedSheet } from './PoaAcceptedSheet';

/**
 * "See accepted documents": opens the full list, every kind on offer with the
 * documents inside it (PoaAcceptedSheet). What the document must show (name,
 * address, how recent) is the step's own description, so it is not repeated.
 */
export function PoaRequirements({
  kinds,
  selected,
  poa,
  labelFor,
  otherLabel,
}: {
  kinds: PoaDocumentType[];
  selected: PoaDocumentType;
  poa: ProofOfAddressConfig | undefined;
  labelFor: (kind: PoaDocumentType) => string;
  otherLabel: string | null;
}) {
  const t = useText();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-1.5 rounded-md text-xs font-semibold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {t('proofOfAddress.accepted.open')}
      </button>
      {open && (
        <PoaAcceptedSheet
          kinds={kinds}
          selected={selected}
          poa={poa}
          labelFor={labelFor}
          otherLabel={otherLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
