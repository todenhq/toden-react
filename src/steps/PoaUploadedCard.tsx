'use client';

import React, { useState } from 'react';
import { Check, FileText, RotateCcw, X } from '../components/icons';
import { FileViewerOverlay, isPdf, useObjectUrl } from '../components/UploadedFilePreview';
import { cn } from '../lib/utils';
import { useText } from '../i18n';
import { POA_CARD, PoaFlag } from './ProofOfAddressParts';

// Proof of Address after the upload: the sample page gives way to the
// person's own document, tilted on the same pile and ticked, with what it is
// and a way to change it. Tap the page to see it full size.

/** The page once uploaded: the person's own document in the sample's place. */
function UploadedPage({ file, label }: { file: File | null; label: string }) {
  const url = useObjectUrl(file);
  const [open, setOpen] = useState(false);
  const pdf = file ? isPdf(file) : false;
  const page = 'relative h-[150px] w-[116px] shrink-0 -rotate-2 rounded-lg bg-white shadow-md shadow-black/10 ring-1 ring-black/5';
  const badge = (
    <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--verification-success,#0DA211)] text-white ring-4 ring-background animate-checkmark-pop">
      <Check className="h-4 w-4" />
    </span>
  );

  // After a remount the File is gone: the page stands in, still ticked.
  if (!file || !url) {
    return (
      <span className={cn(page, 'flex items-center justify-center')}>
        <FileText className="h-8 w-8 text-gray-400" />
        {badge}
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={`Preview ${label}`}
        onClick={() => setOpen(true)}
        className={cn(page, 'transition-transform duration-200 ease-out hover:rotate-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none')}
      >
        <span className="block h-full w-full overflow-hidden rounded-lg">
          {pdf ? (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gray-50 text-gray-500">
              <FileText className="h-8 w-8" />
              <span className="text-[10px] font-semibold tracking-wide">PDF</span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover object-top" />
          )}
        </span>
        {badge}
      </button>
      {open && <FileViewerOverlay url={url} pdf={pdf} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The card after a file: the document, what it is, and a way to change it. */
export function PoaUploadedCard({
  pickedFile,
  fileName,
  typeLabel,
  country,
  onReplace,
  onRemove,
}: {
  pickedFile: File | null;
  fileName: string | null;
  typeLabel: string;
  country: string | null;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const t = useText();
  const action =
    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';
  return (
    <div className={cn(POA_CARD, 'flex items-center gap-5 border-border px-4 pb-5 pt-5 animate-fade-in')}>
      <UploadedPage file={pickedFile} label={typeLabel} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--verification-success,#0DA211)]">{t('proofOfAddress.uploaded')}</p>
        <p className="mt-1 truncate text-sm font-semibold">{fileName || typeLabel}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PoaFlag country={country} className="h-4 w-4 shrink-0" />
          <span className="truncate">{typeLabel}</span>
        </p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={onReplace} className={cn(action, 'border border-border hover:bg-muted')}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t('proofOfAddress.replace')}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className={cn(action, 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive')}
          >
            <X className="h-3.5 w-3.5" />
            {t('proofOfAddress.remove')}
          </button>
        </div>
      </div>
    </div>
  );
}
