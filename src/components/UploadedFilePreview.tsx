'use client';

import React, { useEffect, useState } from 'react';
import { FileText, X } from './icons';

// Preview affordance for user-uploaded files (business documents, proof of
// address): a thumbnail in the uploaded row that opens a full-screen viewer —
// <img> for images, <iframe> for PDFs. Preview works off the in-memory File
// via an object URL (no server round-trip; after a remount that loses the
// File, callers fall back to their plain uploaded row).

/** Object URL for a File, revoked automatically on change/unmount. Created
 *  INSIDE the effect (not useMemo) so StrictMode's mount→cleanup→remount cycle
 *  re-creates a fresh URL instead of leaving a revoked one in `src`. */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export function isPdf(file: File): boolean {
  return (file.type.split(';')[0] || '').toLowerCase() === 'application/pdf';
}

export function FileViewerOverlay({
  url,
  pdf,
  label,
  onClose,
}: {
  url: string;
  pdf: boolean;
  label: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/90 animate-fade-in"
      role="dialog"
      aria-label={`Preview of ${label}`}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="truncate text-sm font-medium text-white/90">{label}</p>
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 p-4 pt-0" onClick={(e) => e.stopPropagation()}>
        {pdf ? (
          <iframe src={url} title={label} className="h-full w-full rounded-lg bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="mx-auto h-full w-auto max-w-full rounded-lg object-contain" />
        )}
      </div>
    </div>
  );
}

/**
 * 48px tap-to-preview thumbnail for an uploaded file. Images render a real
 * thumbnail; PDFs a document tile. Null `file` renders nothing (caller shows
 * its non-preview fallback).
 */
export function UploadedFileThumb({ file, label }: { file: File | null; label: string }) {
  const url = useObjectUrl(file);
  const [open, setOpen] = useState(false);
  if (!file || !url) return null;
  const pdf = isPdf(file);

  return (
    <>
      <button
        type="button"
        aria-label={`Preview ${label}`}
        onClick={() => setOpen(true)}
        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {pdf ? (
          <span className="flex h-full w-full items-center justify-center bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} preview`} className="h-full w-full object-cover" />
        )}
      </button>
      {open && <FileViewerOverlay url={url} pdf={pdf} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}
