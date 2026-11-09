'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Loader2, Upload } from '../components/icons';
import { useText } from '../i18n';
import { cn } from '../lib/utils';

/** A phone or tablet, where a dropped file is not a thing. */
function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches));
  }, []);
  return touch;
}

const TILE =
  'flex min-h-[88px] flex-col items-start justify-between gap-3 rounded-2xl p-3.5 text-left transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * How the document comes in, as the workflow's `proofOfAddress.capture` says:
 * take a photo, upload a file, or both side by side (the default). The photo
 * opens the SDK's own camera (components/PhotoCamera), on a desktop as well.
 * The file tile also takes a dropped file. While the upload runs the tiles
 * give way to one progress row.
 */
export function PoaUploadActions({
  capture = 'both',
  uploading,
  onCamera,
  onFile,
  onDropFile,
}: {
  capture?: 'both' | 'camera' | 'file';
  uploading: boolean;
  onCamera: () => void;
  onFile: () => void;
  onDropFile: (file: File) => void;
}) {
  const t = useText();
  const touch = useTouchDevice();
  const [dragging, setDragging] = useState(false);

  if (uploading) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-border px-3.5 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
        <span className="text-sm font-medium">{t('proofOfAddress.uploading')}</span>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-2.5', capture === 'both' ? 'grid-cols-2' : 'grid-cols-1')}>
      {capture !== 'file' && (
        <button type="button" onClick={onCamera} className={cn(TILE, 'bg-primary text-primary-foreground shadow-sm shadow-primary/25')}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <Camera className="h-[18px] w-[18px]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{t('proofOfAddress.action.camera')}</span>
            <span className="block text-xs opacity-80">{t('proofOfAddress.action.cameraHint')}</span>
          </span>
        </button>
      )}
      {capture !== 'camera' && (
        <button
          type="button"
          onClick={onFile}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) onDropFile(file);
          }}
          className={cn(
            TILE,
            'border',
            capture === 'file' && 'min-h-0 flex-row items-center justify-start',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-[18px] w-[18px]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">
              {dragging ? t('proofOfAddress.drop') : t('proofOfAddress.action.file')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {touch ? t('proofOfAddress.action.fileHint') : `${t('proofOfAddress.action.fileHint')}, ${t('proofOfAddress.action.dropHint')}`}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
