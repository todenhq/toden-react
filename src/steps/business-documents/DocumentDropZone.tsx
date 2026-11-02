'use client';

import React, { useRef, useState } from 'react';
import { CircleCheck, FileText, ImageUp, Loader2, RefreshCcw, X } from '../../components/icons';
import { UploadedFileThumb } from '../../components/UploadedFilePreview';
import { useText } from '../../i18n';
import { UPLOAD_HINT } from '../../lib/upload-limits';
import { displayFileName } from '../../lib/display-file-name';
import { cn } from '../../lib/utils';
import { BUSINESS_DOC_ACCEPTED_MIMES } from '../BusinessDocumentSlot';

const sizeLabel = (bytes: number | undefined) =>
  bytes == null ? null : bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** A phone, where the area is tapped rather than a file dropped on it. */
const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

/**
 * The one upload a group needs: the whole area is the control (press it to
 * choose a file, or drop one on it; on a phone the system picker also offers
 * the camera), then the file it holds with Replace and Remove. There is no
 * separate Choose button, so the only primary button on the screen is Continue.
 */
export function DocumentDropZone({
  title,
  fileName,
  size,
  file,
  uploading,
  error,
  onPick,
  onRemove,
}: {
  /** The group, for labels read out with the controls. */
  title: string;
  fileName: string | null;
  size?: number;
  file: File | null;
  uploading: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const t = useText();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accept = BUSINESS_DOC_ACCEPTED_MIMES.join(',');
  const take = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) onPick(picked);
    e.target.value = '';
  };

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={take} />
    </>
  );

  if (fileName !== null) {
    const kb = sizeLabel(size);
    return (
      <div className="space-y-2">
        {inputs}
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--verification-success,#0DA211)]/30 bg-[var(--verification-success,#0DA211)]/[0.06] p-3.5">
          {file ? (
            <UploadedFileThumb file={file} label={title} />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={fileName}>{displayFileName(fileName) ?? title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--verification-success,#0DA211)]">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden />
              {t('business.documents.uploaded')}
              {kb && <span className="text-muted-foreground">· {kb}</span>}
            </p>
          </div>
          <button
            type="button"
            aria-label={`${t('business.documents.replace')}: ${title}`}
            onClick={() => fileRef.current?.click()}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`${t('business.documents.remove')}: ${title}`}
            onClick={onRemove}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {inputs}
      <button
        type="button"
        disabled={uploading}
        aria-label={`${t('business.documents.drop.title')}: ${title}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped && !uploading) onPick(dropped);
        }}
        className={cn(
          'flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors duration-150 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait',
          dragging ? 'border-primary bg-primary/[0.08]' : 'border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.06]',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImageUp className="h-5 w-5" aria-hidden />}
        </span>
        <span className="mt-3 block text-sm font-semibold" aria-live="polite">
          {uploading
            ? t('business.documents.uploading')
            : dragging
              ? t('business.documents.drop.active')
              : t(isTouch() ? 'business.documents.drop.tap' : 'business.documents.drop.title')}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{UPLOAD_HINT}</span>
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
