'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Crop, Loader2, RefreshCw, X } from './icons';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useText } from '../i18n';
import { clockwiseQuarterTurns, turnCanvasBack } from '../lib/document-turn';
import {
  clampCropRect,
  dragCropRect,
  initialCropRect,
  insetContainRect,
  quarterTurnScale,
  refitCropRect,
  turnedSize,
  type CropHandle,
  type CropRectangle,
} from '../lib/document-crop-geometry';
import { GLASS_CLASSES, IMMERSIVE_GLASS } from './viewfinder/immersive-glass';
import {
  BOTTOM_OFFSET,
  CAPTION_GAP,
  CAPTION_LINE_HEIGHT,
  GUIDE_GAP_ABOVE_CONTROLS,
  SIDE_BUTTON_SIZE,
  SIDE_MARGIN,
  TOP_BAR_GAP,
  TOP_BAR_HEIGHT,
  TOP_BAR_OFFSET,
  safeBottom,
  safeTop,
} from '../lib/immersive-layout';

// Interactive document cropper, shown after a document photo is picked: a
// draggable, fixed-aspect crop box over the photo. A port of the React Native
// SDK's components/DocumentCropper.tsx (itself a port of the Flutter screen).
//
// Two layouts around one stage:
// - `immersive` (a phone): the full-screen editor the scan screen opens it
//   from. A black stage, the same dark glass controls and the same 8px rhythm
//   (lib/immersive-layout.ts), clear of the safe areas.
// - `inline` (a desktop): the bordered panel inside the modal, under the step's
//   own header, as the desktop camera is inline too.
//
// ISO/IEC 7810 ID-1: 85.6 mm × 53.98 mm → AR ≈ 1.5858, the default box. A
// document of another shape passes its own (`aspect`); a long NIN slip's box
// stands upright on a phone (documentCropGuide in lib/document-turn.ts) and its
// crop is turned back to landscape before it is returned (`turnBack`). Rotate
// turns the photo a quarter clockwise at a time, smoothly on screen, and the
// box is fitted afresh to the turned photo. Geometry: lib/document-crop-geometry.ts.

// ISO/IEC 7810 ID-1 standard dimensions: 85.6 mm × 53.98 mm
export const ID_ASPECT_RATIO = 85.6 / 53.98; // ≈ 1.5858

const CORNER_TARGET = 56; // grab target around each corner handle
const EDGE_TARGET = 44; // grab target around each mid-edge bar
const ARM = 22; // corner-bracket arm length
const HANDLE_THICKNESS = 4;
const EDGE_BAR = 20; // mid-edge bar length
const GRID_FADE_MS = 150;
const TURN_MS = 280; // Rotate's quarter turn on screen
const FRAME_OUT_MS = 120; // the crop frame leaving as a turn starts
const FRAME_IN_MS = 150; // and returning, refitted, as it ends
/** How long the turning copy waits for the turned photo to load before giving way. */
const TURN_LOAD_TIMEOUT_MS = 1500;
/** Ease-out (cubic), as RN's Easing.out(Easing.cubic). */
const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** Arrow keys move the box (or a handle) this far; with Shift, further. */
const KEY_STEP = 4;
const KEY_STEP_LARGE = 20;

/** A camera editor's stage: the photo reads against pure black. */
export const CROPPER_STAGE = '#000000';
const DIM = 'rgba(0,0,0,0.6)';
const GRID = 'rgba(255,255,255,0.35)';
const HELP = 'rgba(255,255,255,0.7)';

// Fixed strings, as the scan screen's captions are: a catalogue key would have
// to join the shared customisable-texts contract that every SDK must match.
const HELP_TEXT = 'Drag the corners to the edges of your ID';
const ROTATE_HINT = 'Turns the photo a quarter turn clockwise.';
const BOX_LABEL = 'Crop frame. Use the arrow keys to move it.';
const HANDLE_LABELS: Record<Exclude<CropHandle, 'move'>, string> = {
  tl: 'Resize from the top left corner',
  tr: 'Resize from the top right corner',
  bl: 'Resize from the bottom left corner',
  br: 'Resize from the bottom right corner',
  t: 'Resize from the top edge',
  r: 'Resize from the right edge',
  b: 'Resize from the bottom edge',
  l: 'Resize from the left edge',
};
const HANDLE_CURSORS: Record<CropHandle, string> = {
  move: 'move',
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  t: 'ns-resize',
  b: 'ns-resize',
  l: 'ew-resize',
  r: 'ew-resize',
};
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** The title: the document by name when it is known. */
export function cropperTitle(documentLabel?: string): string {
  const label = documentLabel?.trim();
  return label ? `Fit your ${label} in the frame` : 'Fit your ID in the frame';
}

/**
 * `source` turned `turns` quarter turns clockwise, as an object URL (a JPEG
 * data URI where the browser cannot make one). Turned from the original each
 * time, so rotating round never re-encodes a re-encode. The encode is async
 * (toBlob), so the on-screen turn keeps running while it is made. Null when the
 * browser gives no 2D context.
 */
function turnedPhoto(source: HTMLImageElement, turns: number): Promise<string | null> {
  const turn = clockwiseQuarterTurns(source.naturalWidth, source.naturalHeight, turns);
  const canvas = document.createElement('canvas');
  canvas.width = turn.width;
  canvas.height = turn.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.setTransform(...turn.matrix);
  ctx.drawImage(source, 0, 0);
  if (typeof canvas.toBlob !== 'function' || typeof URL.createObjectURL !== 'function') {
    return Promise.resolve(canvas.toDataURL('image/jpeg', 0.95));
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/jpeg', 0.95);
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });
}

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

export interface ImageCropperProps {
  /** Full data-URI of the uploaded image */
  src: string;
  /** Called with the cropped image as a JPEG data-URI */
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
  /** Width over height of the crop box. Defaults to an ID card; a NIN slip is longer. */
  aspect?: number;
  /**
   * True when the box stands upright for a long document (lib/document-turn.ts):
   * the crop is turned back a quarter counter-clockwise, so it is stored
   * landscape, as the camera stores an upright capture.
   */
  turnBack?: boolean;
  /**
   * `immersive`: the full-screen editor of a phone, which owns the surface (the
   * step hands it over, as the camera does). `inline`: the panel in a desktop
   * modal, under the step's header.
   */
  layout?: 'inline' | 'immersive';
  /** The selected ID type's name, for the immersive title ("Fit your NIN slip in the frame"). */
  documentLabel?: string;
}

export function ImageCropper({
  src,
  onConfirm,
  onCancel,
  aspect = ID_ASPECT_RATIO,
  turnBack = false,
  layout = 'inline',
  documentLabel,
}: ImageCropperProps) {
  const t = useText();
  const immersive = layout === 'immersive';
  const rotateHintId = useId();
  const reduceMotion = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // The picked photo, decoded once, and its own size before any Rotate.
  const originalRef = useRef<HTMLImageElement | null>(null);
  const [original, setOriginal] = useState<{ w: number; h: number } | null>(null);
  const [container, setContainer] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropRectangle | null>(null);
  const [processing, setProcessing] = useState(false);
  // Clockwise quarter turns from Rotate, and the photo as turned.
  const [turns, setTurns] = useState(0);
  const [shownSrc, setShownSrc] = useState(src);
  const shownSrcRef = useRef(src);
  shownSrcRef.current = shownSrc;
  const [rotating, setRotating] = useState(false);
  // The rule-of-thirds grid shows only while a handle or the box is held.
  const [dragging, setDragging] = useState(false);

  const natural = original ? turnedSize(original, turns) : null;
  const naturalW = natural?.w ?? 0;
  const naturalH = natural?.h ?? 0;

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive || !img.naturalWidth) return;
      originalRef.current = img;
      setOriginal({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  // The stage's size, again whenever it changes (a phone turned, the modal resized).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setContainer((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Letterboxed inside the stage with a 16 margin, so no handle meets its edge.
  const imgRect = useMemo<CropRectangle | null>(() => {
    if (!naturalW || !naturalH || !container) return null;
    return insetContainRect(naturalW, naturalH, container.w, container.h);
  }, [naturalW, naturalH, container]);

  // A resized stage carries the box with the photo; a Rotate refits it afresh.
  const placedOn = useRef<{ rect: CropRectangle; turns: number } | null>(null);
  useEffect(() => {
    const prev = placedOn.current;
    placedOn.current = imgRect ? { rect: imgRect, turns } : null;
    if (!imgRect || !prev || prev.turns !== turns || prev.rect === imgRect) return;
    setCrop((c) => (c ? refitCropRect(c, prev.rect, imgRect, aspect) : c));
  }, [imgRect, turns, aspect]);

  // Place the box once the photo's rect is known (again after a Rotate).
  useEffect(() => {
    if (imgRect && !crop) setCrop(initialCropRect(imgRect, aspect));
  }, [imgRect, crop, aspect]);

  // ── Rotate, animated ──────────────────────────────────────────────────────
  // The photo as shown turns a quarter on screen (a compositor transform) while
  // the real turn is made from the original in the background. The turning
  // copy sits over the stage and holds its final pose until the turned photo
  // has loaded underneath, then gives way to it: no snap, no blank frame. The
  // crop frame fades out as the turn starts and back in, refitted, as it ends.
  // One turn at a time: presses and drags during a turn are ignored.
  const [turning, setTurning] = useState<{ src: string; rect: CropRectangle; scale: number; ready: boolean } | null>(
    null,
  );
  const turnElRef = useRef<HTMLImageElement>(null);
  const turnBusy = useRef(false);
  const swapPending = useRef(false);
  const spinStart = useRef<(() => void) | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const objectUrls = useRef<string[]>([]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current = [];
    };
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // Starts the on-screen turn, once the turning copy has drawn (or after a short wait).
  const startSpin = () => {
    const go = spinStart.current;
    spinStart.current = null;
    go?.();
  };

  const endTurn = () => {
    if (!turnBusy.current || !alive.current) return;
    swapPending.current = false;
    spinStart.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTurning(null);
    setRotating(false);
    turnBusy.current = false;
    // Turned photos no longer shown are let go.
    objectUrls.current = objectUrls.current.filter((u) => {
      if (u === shownSrcRef.current) return true;
      URL.revokeObjectURL(u);
      return false;
    });
  };

  const rotate = async () => {
    const source = originalRef.current;
    if (turnBusy.current || rotating || processing || !original || !container || !imgRect || !source) return;
    turnBusy.current = true;
    dragRef.current = null;
    setDragging(false);
    const next = (turns + 1) % 4;
    const target = turnedSize(original, next);
    const to = insetContainRect(target.w, target.h, container.w, container.h);
    const scale = quarterTurnScale(imgRect, to);
    const turnedPose = `rotate(90deg) scale(${scale})`;
    const restPose = 'rotate(0deg) scale(1)';
    const still = reduceMotion;
    setRotating(true);
    setTurning({ src: shownSrc, rect: imgRect, scale, ready: false });

    let started: () => void = () => undefined;
    const begun = new Promise<void>((resolve) => {
      started = resolve;
    });
    const spun = new Promise<void>((resolve) => {
      spinStart.current = () => {
        setTurning((tn) => (tn ? { ...tn, ready: true } : tn));
        started();
        // Reduced motion: no turn on screen, the photo is swapped once ready.
        const el = turnElRef.current;
        if (still || !el || typeof el.animate !== 'function') return resolve();
        const anim = el.animate([{ transform: restPose }, { transform: turnedPose }], {
          duration: TURN_MS,
          easing: EASE_OUT,
          fill: 'forwards',
        });
        anim.finished.then(
          () => resolve(),
          () => resolve(),
        );
      };
    });
    later(startSpin, 250);

    // Made once the turn is under way, so the encode never delays its start.
    await begun;
    await nextFrame();
    let turned: string | null;
    try {
      turned = next === 0 ? src : await turnedPhoto(source, next);
    } catch {
      turned = null;
    }
    if (turned && turned.startsWith('blob:')) objectUrls.current.push(turned);
    await spun;
    if (!alive.current) return;
    if (turned === null) {
      // The photo stays as it was; the person can still crop it.
      const el = turnElRef.current;
      if (still || !el || typeof el.animate !== 'function') return endTurn();
      const back = el.animate([{ transform: turnedPose }, { transform: restPose }], {
        duration: FRAME_OUT_MS * 1.5,
        easing: EASE_OUT,
        fill: 'forwards',
      });
      back.finished.then(endTurn, endTurn);
      return;
    }
    swapPending.current = true;
    setShownSrc(turned);
    setTurns(next);
    setCrop(null);
    // The turned photo's load ends the turn; this only guards a load that never reports.
    later(endTurn, TURN_LOAD_TIMEOUT_MS);
  };

  // ── Dragging ──────────────────────────────────────────────────────────────
  // Pointer events, so a mouse and a finger are one path. Pointer capture keeps
  // moves coming when the pointer leaves the handle; they bubble to the stage.
  const dragRef = useRef<{ handle: CropHandle; x: number; y: number; start: CropRectangle } | null>(null);

  const beginDrag = (handle: CropHandle) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // No dragging a frame that is hidden for a turn.
    if (!crop || !imgRect || turnBusy.current || processing) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { handle, x: e.clientX, y: e.clientY, start: crop };
    setDragging(true);
  };

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !imgRect) return;
    const next = dragCropRect(d.handle, d.start, e.clientX - d.x, e.clientY - d.y, aspect);
    setCrop(clampCropRect(next, imgRect, aspect));
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
  };

  // Arrow keys: the focused box moves, a focused handle is dragged that way.
  const onHandleKey = (handle: CropHandle) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = ARROWS[e.key];
    if (!dir || !crop || !imgRect || turnBusy.current || processing) return;
    e.preventDefault();
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    setCrop(clampCropRect(dragCropRect(handle, crop, dir[0] * step, dir[1] * step, aspect), imgRect, aspect));
  };

  // ── Confirm ───────────────────────────────────────────────────────────────

  const confirm = () => {
    const img = imgRef.current;
    if (!img || !natural || !imgRect || !crop || processing || rotating) return;
    const area = { natural, imgRect, crop };
    setProcessing(true);
    // A frame for the spinner to show before the canvas work.
    setTimeout(() => {
      if (!alive.current) return;
      try {
        const { natural: n, imgRect: r, crop: c } = area;
        const scaleX = n.w / r.w;
        const scaleY = n.h / r.h;
        const sx = Math.min(Math.max((c.x - r.x) * scaleX, 0), n.w - 1);
        const sy = Math.min(Math.max((c.y - r.y) * scaleY, 0), n.h - 1);
        const sw = Math.min(c.w * scaleX, n.w - sx);
        const sh = Math.min(c.h * scaleY, n.h - sy);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sw));
        canvas.height = Math.max(1, Math.round(sh));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessing(false);
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        // A turn the browser cannot do keeps the upright crop: the server detects page rotation.
        const out = turnBack ? (turnCanvasBack(canvas) ?? canvas) : canvas;
        onConfirm(out.toDataURL('image/jpeg', 0.92));
      } catch {
        setProcessing(false);
      }
    }, 0);
  };

  const rotateDisabled = !crop || processing || rotating;
  const confirmDisabled = !crop || rotating || processing;
  const frameShown = !turning;

  // ── The stage: the photo, the turning copy, the frame and its handles ─────

  const stage = (
    <div
      ref={stageRef}
      className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
      style={{ backgroundColor: CROPPER_STAGE }}
      onPointerMove={onDragMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
      {!imgRect ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white" aria-hidden />
        </div>
      ) : (
        <>
          <img
            ref={imgRef}
            src={shownSrc}
            alt="Document"
            draggable={false}
            // Hidden under the turning copy until the turned photo has loaded here.
            onLoad={() => {
              if (swapPending.current) endTurn();
            }}
            className="pointer-events-none absolute max-w-none select-none"
            style={{
              left: imgRect.x,
              top: imgRect.y,
              width: imgRect.w,
              height: imgRect.h,
              opacity: turning?.ready ? 0 : 1,
            }}
          />
          {turning ? (
            <img
              ref={turnElRef}
              src={turning.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              onLoad={startSpin}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                left: turning.rect.x,
                top: turning.rect.y,
                width: turning.rect.w,
                height: turning.rect.h,
                transformOrigin: '50% 50%',
                willChange: 'transform',
              }}
            />
          ) : null}
        </>
      )}

      {container && crop ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: frameShown ? 1 : 0,
              transition: reduceMotion
                ? undefined
                : `opacity ${frameShown ? FRAME_IN_MS : FRAME_OUT_MS}ms ease-out`,
            }}
          >
            <CropFrame crop={crop} container={container} dragging={dragging} reduceMotion={reduceMotion} />
          </div>

          {/* Grab targets: the box to move it, then the bars and corners over it. */}
          <div
            role="group"
            tabIndex={0}
            aria-label={BOX_LABEL}
            onPointerDown={beginDrag('move')}
            onKeyDown={onHandleKey('move')}
            className="absolute touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, cursor: HANDLE_CURSORS.move }}
          />
          {handleTargets(crop).map(({ handle, x, y, size }) => (
            <div
              key={handle}
              role="button"
              tabIndex={0}
              aria-label={HANDLE_LABELS[handle]}
              onPointerDown={beginDrag(handle)}
              onKeyDown={onHandleKey(handle)}
              className="absolute touch-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                cursor: HANDLE_CURSORS[handle],
              }}
            />
          ))}
        </>
      ) : null}
    </div>
  );

  if (immersive) {
    return (
      <div className="flex min-h-0 flex-1 flex-col animate-fade-in" style={{ backgroundColor: CROPPER_STAGE }}>
        {/* Top bar: close, the title, and an empty slot that keeps the title centred. */}
        <div
          className="flex shrink-0 items-center"
          style={{
            marginTop: safeTop(TOP_BAR_OFFSET),
            height: TOP_BAR_HEIGHT,
            gap: TOP_BAR_GAP,
            paddingLeft: SIDE_MARGIN,
            paddingRight: SIDE_MARGIN,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.cancel')}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              GLASS_CLASSES,
            )}
            style={{ width: TOP_BAR_HEIGHT, height: TOP_BAR_HEIGHT }}
          >
            <X size={20} aria-hidden />
          </button>
          <h2
            className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold leading-[22px]"
            style={{ color: IMMERSIVE_GLASS.text }}
          >
            {cropperTitle(documentLabel)}
          </h2>
          <div aria-hidden="true" className="shrink-0" style={{ width: TOP_BAR_HEIGHT, height: TOP_BAR_HEIGHT }} />
        </div>

        {stage}

        <p
          className="shrink-0 text-center text-[14px] leading-5"
          style={{
            color: HELP,
            paddingLeft: SIDE_MARGIN,
            paddingRight: SIDE_MARGIN,
            marginBottom: GUIDE_GAP_ABOVE_CONTROLS,
          }}
        >
          {HELP_TEXT}
        </p>

        {/* Bottom bar: Rotate as a round glass button, then the primary action. */}
        <div
          className="flex shrink-0 items-start"
          style={{
            gap: 12,
            paddingLeft: SIDE_MARGIN,
            paddingRight: SIDE_MARGIN,
            // The caption hangs below the round button; the row reserves its space.
            paddingBottom: CAPTION_GAP + CAPTION_LINE_HEIGHT,
            marginBottom: safeBottom(BOTTOM_OFFSET),
          }}
        >
          <div className="relative shrink-0" style={{ width: SIDE_BUTTON_SIZE, height: SIDE_BUTTON_SIZE }}>
            <button
              type="button"
              onClick={rotate}
              disabled={rotateDisabled}
              aria-label={t('uploadDocument.crop.rotate')}
              aria-describedby={rotateHintId}
              aria-busy={rotating || undefined}
              className={cn(
                'flex items-center justify-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                GLASS_CLASSES,
              )}
              style={{
                width: SIDE_BUTTON_SIZE,
                height: SIDE_BUTTON_SIZE,
                opacity: rotateDisabled && !rotating ? 0.5 : 1,
              }}
            >
              {/* The photo turning is the feedback; no spinner over the icon. */}
              <RefreshCw size={22} aria-hidden />
            </button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute whitespace-nowrap text-center text-[12px] font-medium"
              style={{
                top: SIDE_BUTTON_SIZE + CAPTION_GAP,
                left: -SIDE_BUTTON_SIZE,
                right: -SIDE_BUTTON_SIZE,
                lineHeight: `${CAPTION_LINE_HEIGHT}px`,
                color: IMMERSIVE_GLASS.caption,
              }}
            >
              {t('uploadDocument.crop.rotate')}
            </span>
          </div>
          <span id={rotateHintId} className="sr-only">
            {ROTATE_HINT}
          </span>

          <button
            type="button"
            onClick={confirm}
            disabled={confirmDisabled}
            aria-label={t('uploadDocument.crop.confirm')}
            aria-busy={processing || undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center rounded-full bg-primary px-5 text-primary-foreground transition-opacity active:opacity-[0.85]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
            )}
            style={{ height: SIDE_BUTTON_SIZE, opacity: confirmDisabled && !processing ? 0.5 : undefined }}
          >
            {processing ? (
              <Loader2 size={20} className="animate-spin" aria-hidden />
            ) : (
              <span className="truncate text-[16px] font-semibold">{t('uploadDocument.crop.confirm')}</span>
            )}
          </button>
        </div>
      </div>
    );
  }

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

      {stage}

      {/* Footer */}
      <div className="flex gap-3 border-t border-border px-3 py-3 shrink-0">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          {t('common.cancel')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={rotate}
          disabled={rotateDisabled}
          aria-describedby={rotateHintId}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('uploadDocument.crop.rotate')}
        </Button>
        <span id={rotateHintId} className="sr-only">
          {ROTATE_HINT}
        </span>
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={confirm}
          disabled={confirmDisabled}
          aria-busy={processing || undefined}
        >
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {t('uploadDocument.crop.confirm')}
        </Button>
      </div>
    </div>
  );
}

/** The dim surround, the thirds grid while dragging, the border, the corners and the bars. */
function CropFrame({
  crop,
  container,
  dragging,
  reduceMotion,
}: {
  crop: CropRectangle;
  container: { w: number; h: number };
  dragging: boolean;
  reduceMotion: boolean;
}) {
  const hairline = 1 / (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  return (
    <svg className="absolute inset-0" width={container.w} height={container.h} aria-hidden="true">
      {/* Dim surround (4 rects) */}
      <rect x={0} y={0} width={container.w} height={Math.max(0, crop.y)} fill={DIM} />
      <rect
        x={0}
        y={crop.y + crop.h}
        width={container.w}
        height={Math.max(0, container.h - crop.y - crop.h)}
        fill={DIM}
      />
      <rect x={0} y={crop.y} width={Math.max(0, crop.x)} height={crop.h} fill={DIM} />
      <rect
        x={crop.x + crop.w}
        y={crop.y}
        width={Math.max(0, container.w - crop.x - crop.w)}
        height={crop.h}
        fill={DIM}
      />

      {/* Rule-of-thirds grid, only while dragging */}
      <g
        style={{
          opacity: dragging ? 1 : 0,
          transition: reduceMotion ? undefined : `opacity ${GRID_FADE_MS}ms ease-out`,
        }}
      >
        {gridLines(crop).map((l, i) => (
          <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke={GRID} strokeWidth={hairline} />
        ))}
      </g>

      {/* White border */}
      <rect x={crop.x} y={crop.y} width={crop.w} height={crop.h} fill="none" stroke="#FFFFFF" strokeWidth={1.5} />

      {/* L-shaped corner handles, on the corners */}
      {cornerPaths(crop).map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={HANDLE_THICKNESS}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      ))}

      {/* Mid-edge bars: along the edge they sit on */}
      {edgeBars(crop).map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={HANDLE_THICKNESS / 2} fill="#FFFFFF" />
      ))}
    </svg>
  );
}

/** Where each handle's grab target is centred, and how big it is. */
function handleTargets(c: CropRectangle): Array<{ handle: Exclude<CropHandle, 'move'>; x: number; y: number; size: number }> {
  const r = c.x + c.w;
  const b = c.y + c.h;
  const midX = c.x + c.w / 2;
  const midY = c.y + c.h / 2;
  // Corners last, so they sit over the bars on a small box.
  return [
    { handle: 't', x: midX, y: c.y, size: EDGE_TARGET },
    { handle: 'r', x: r, y: midY, size: EDGE_TARGET },
    { handle: 'b', x: midX, y: b, size: EDGE_TARGET },
    { handle: 'l', x: c.x, y: midY, size: EDGE_TARGET },
    { handle: 'tl', x: c.x, y: c.y, size: CORNER_TARGET },
    { handle: 'tr', x: r, y: c.y, size: CORNER_TARGET },
    { handle: 'bl', x: c.x, y: b, size: CORNER_TARGET },
    { handle: 'br', x: r, y: b, size: CORNER_TARGET },
  ];
}

/** The four L brackets, each drawn through its corner point. */
function cornerPaths(c: CropRectangle): string[] {
  const r = c.x + c.w;
  const b = c.y + c.h;
  return [
    `M ${c.x} ${c.y + ARM} L ${c.x} ${c.y} L ${c.x + ARM} ${c.y}`,
    `M ${r - ARM} ${c.y} L ${r} ${c.y} L ${r} ${c.y + ARM}`,
    `M ${c.x} ${b - ARM} L ${c.x} ${b} L ${c.x + ARM} ${b}`,
    `M ${r - ARM} ${b} L ${r} ${b} L ${r} ${b - ARM}`,
  ];
}

/** A 20 × 4 bar centred on each edge, lying along it. */
function edgeBars(c: CropRectangle): CropRectangle[] {
  const half = HANDLE_THICKNESS / 2;
  const midX = c.x + c.w / 2;
  const midY = c.y + c.h / 2;
  return [
    { x: midX - EDGE_BAR / 2, y: c.y - half, w: EDGE_BAR, h: HANDLE_THICKNESS },
    { x: midX - EDGE_BAR / 2, y: c.y + c.h - half, w: EDGE_BAR, h: HANDLE_THICKNESS },
    { x: c.x - half, y: midY - EDGE_BAR / 2, w: HANDLE_THICKNESS, h: EDGE_BAR },
    { x: c.x + c.w - half, y: midY - EDGE_BAR / 2, w: HANDLE_THICKNESS, h: EDGE_BAR },
  ];
}

function gridLines(c: CropRectangle): Array<[number, number, number, number]> {
  const r = c.x + c.w;
  const b = c.y + c.h;
  return [
    [c.x + c.w / 3, c.y, c.x + c.w / 3, b],
    [c.x + (c.w * 2) / 3, c.y, c.x + (c.w * 2) / 3, b],
    [c.x, c.y + c.h / 3, r, c.y + c.h / 3],
    [c.x, c.y + (c.h * 2) / 3, r, c.y + (c.h * 2) / 3],
  ];
}
