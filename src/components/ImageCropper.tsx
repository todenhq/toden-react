'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Check, X, Crop } from './icons';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useText } from '../i18n';

// ISO/IEC 7810 ID-1 standard dimensions: 85.6 mm × 53.98 mm
export const ID_ASPECT_RATIO = 85.6 / 53.98; // ≈ 1.5858

type DragType = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

interface CropBox {
  x: number; // px offset from container left
  y: number; // px offset from container top
  width: number; // px — height is always derived via ID_ASPECT_RATIO
}

interface ImgBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getHeight(width: number, aspect: number): number {
  return width / aspect;
}

function clampCropBox(box: CropBox, bounds: ImgBounds, aspect: number): CropBox {
  let { x, y, width } = box;

  // Keep a sensible minimum size
  width = Math.max(60, width);

  // Shrink width if the resulting height would exceed the image area
  if (getHeight(width, aspect) > bounds.height) {
    width = bounds.height * aspect;
  }

  // Don't let width exceed the image width
  width = Math.min(width, bounds.width);

  const h = getHeight(width, aspect);
  x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - width));
  y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - h));

  return { x, y, width };
}

export interface ImageCropperProps {
  /** Full data-URI of the uploaded image */
  src: string;
  /** Called with the cropped image as a JPEG data-URI */
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
  /** Width over height of the crop box. Defaults to an ID card; a NIN slip is longer. */
  aspect?: number;
}

export function ImageCropper({ src, onConfirm, onCancel, aspect = ID_ASPECT_RATIO }: ImageCropperProps) {
  const t = useText();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [imgBounds, setImgBounds] = useState<ImgBounds | null>(null);

  // Refs so event handlers always see fresh values without re-registering
  const imgBoundsRef = useRef<ImgBounds | null>(null);
  imgBoundsRef.current = imgBounds;

  const initializedRef = useRef(false);

  const dragRef = useRef<{
    type: DragType;
    startClientX: number;
    startClientY: number;
    startBox: CropBox;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Compute the actual rendered image rect within the container
  // ---------------------------------------------------------------------------

  const computeBoundsAndInit = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;

    const natAR = img.naturalWidth / img.naturalHeight;
    const conAR = cw / ch;

    let rw: number, rh: number;
    if (natAR > conAR) {
      // Letterboxed top/bottom
      rw = cw;
      rh = cw / natAR;
    } else {
      // Pillarboxed left/right
      rh = ch;
      rw = ch * natAR;
    }

    const bounds: ImgBounds = {
      x: (cw - rw) / 2,
      y: (ch - rh) / 2,
      width: rw,
      height: rh,
    };

    setImgBounds(bounds);

    if (!initializedRef.current) {
      // Set initial crop box: 85% of image width, centered
      initializedRef.current = true;
      let cropW = bounds.width * 0.85;
      if (getHeight(cropW, aspect) > bounds.height * 0.9) {
        cropW = bounds.height * 0.9 * aspect;
      }
      const cropH = getHeight(cropW, aspect);
      setCropBox({
        x: bounds.x + (bounds.width - cropW) / 2,
        y: bounds.y + (bounds.height - cropH) / 2,
        width: cropW,
      });
    } else {
      // Clamp existing box to updated bounds
      setCropBox((prev) => (prev ? clampCropBox(prev, bounds, aspect) : null));
    }
  }, [aspect]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      computeBoundsAndInit();
    } else {
      img.addEventListener('load', computeBoundsAndInit);
      return () => img.removeEventListener('load', computeBoundsAndInit);
    }
  }, [computeBoundsAndInit]);

  // Re-compute if the container is resized (e.g., modal expand/collapse)
  useEffect(() => {
    const ro = new ResizeObserver(() => computeBoundsAndInit());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeBoundsAndInit]);

  // ---------------------------------------------------------------------------
  // Pointer drag logic — uses pointer capture so moves/up fire even off element
  // ---------------------------------------------------------------------------

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: DragType) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cropBox) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      type,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBox: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !imgBoundsRef.current) return;
    const { type, startClientX, startClientY, startBox } = dragRef.current;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;

    const startH = getHeight(startBox.width, aspect);
    const bottomEdge = startBox.y + startH;

    let newBox: CropBox;

    switch (type) {
      case 'move':
        newBox = { x: startBox.x + dx, y: startBox.y + dy, width: startBox.width };
        break;

      case 'resize-br':
        newBox = { ...startBox, width: startBox.width + dx };
        break;

      case 'resize-bl': {
        const w = startBox.width - dx;
        newBox = { x: startBox.x + dx, y: startBox.y, width: w };
        break;
      }

      case 'resize-tr': {
        const w = startBox.width + dx;
        newBox = { x: startBox.x, y: bottomEdge - getHeight(w, aspect), width: w };
        break;
      }

      case 'resize-tl': {
        const w = startBox.width - dx;
        newBox = { x: startBox.x + dx, y: bottomEdge - getHeight(w, aspect), width: w };
        break;
      }

      default:
        return;
    }

    setCropBox(clampCropBox(newBox, imgBoundsRef.current, aspect));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // ---------------------------------------------------------------------------
  // Crop to canvas and return base64
  // ---------------------------------------------------------------------------

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !cropBox || !imgBounds) return;

    const scaleX = img.naturalWidth / imgBounds.width;
    const scaleY = img.naturalHeight / imgBounds.height;

    const sx = (cropBox.x - imgBounds.x) * scaleX;
    const sy = (cropBox.y - imgBounds.y) * scaleY;
    const sw = cropBox.width * scaleX;
    const sh = getHeight(cropBox.width, aspect) * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  };

  const cropH = cropBox ? getHeight(cropBox.width, aspect) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden border border-border bg-background animate-fade-in"
      style={{ height: 'clamp(300px, 52vh, 500px)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 shrink-0">
        <Crop className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-none">{t('uploadDocument.crop.heading')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('uploadDocument.crop.hint')}</p>
        </div>
      </div>

      {/* Image + crop overlay */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-neutral-900 select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Source image (object-contain so letterboxing is handled by the browser) */}
        <img
          ref={imgRef}
          src={src}
          alt="Document"
          className="h-full w-full object-contain pointer-events-none"
          draggable={false}
        />

        {!imgBounds && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}

        {cropBox && imgBounds && (
          <>
            {/* Semi-transparent mask — 4 strips around the crop window */}
            {/* Top */}
            <div
              className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none"
              style={{ height: cropBox.y }}
            />
            {/* Bottom */}
            <div
              className="absolute inset-x-0 bottom-0 bg-black/60 pointer-events-none"
              style={{ top: cropBox.y + cropH }}
            />
            {/* Left */}
            <div
              className="absolute left-0 bg-black/60 pointer-events-none"
              style={{ top: cropBox.y, width: cropBox.x, height: cropH }}
            />
            {/* Right */}
            <div
              className="absolute right-0 bg-black/60 pointer-events-none"
              style={{ top: cropBox.y, left: cropBox.x + cropBox.width, height: cropH }}
            />

            {/* Crop frame — drag to move */}
            <div
              className="absolute border-2 border-white cursor-move touch-none"
              style={{ left: cropBox.x, top: cropBox.y, width: cropBox.width, height: cropH }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
            >
              {/* Rule-of-thirds grid */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-y-0 border-l border-white/25" style={{ left: '33.33%' }} />
                <div className="absolute inset-y-0 border-l border-white/25" style={{ left: '66.66%' }} />
                <div className="absolute inset-x-0 border-t border-white/25" style={{ top: '33.33%' }} />
                <div className="absolute inset-x-0 border-t border-white/25" style={{ top: '66.66%' }} />
              </div>

              {/* Corner resize handles */}
              {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                <div
                  key={corner}
                  className={cn(
                    'absolute h-7 w-7 touch-none z-10',
                    corner === 'tl' && '-left-1 -top-1 cursor-nwse-resize',
                    corner === 'tr' && '-right-1 -top-1 cursor-nesw-resize',
                    corner === 'bl' && '-left-1 -bottom-1 cursor-nesw-resize',
                    corner === 'br' && '-right-1 -bottom-1 cursor-nwse-resize',
                  )}
                  onPointerDown={(e) => handlePointerDown(e, `resize-${corner}` as DragType)}
                  style={{ touchAction: 'none' }}
                >
                  {/* L-shaped bracket */}
                  <svg
                    viewBox="0 0 28 28"
                    className="h-full w-full drop-shadow-sm"
                    style={{
                      transform:
                        corner === 'tr' ? 'scaleX(-1)' :
                        corner === 'br' ? 'scale(-1,-1)' :
                        corner === 'bl' ? 'scaleY(-1)' :
                        undefined,
                    }}
                  >
                    <path
                      d="M5 5 H16 M5 5 V16"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-border px-3 py-3 shrink-0">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleConfirm}
          disabled={!cropBox || !imgBounds}
        >
          <Check className="h-3.5 w-3.5" />
          {t('uploadDocument.crop.confirm')}
        </Button>
      </div>
    </div>
  );
}
