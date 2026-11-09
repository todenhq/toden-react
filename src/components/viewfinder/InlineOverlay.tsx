'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DocumentScanOverlay } from './DocumentScanOverlay';
import { DocumentGhost, type DocumentSpecimenSubject } from './DocumentGhost';
import { DocumentPill, SideBadge } from './ImmersiveControls';
import { HintPill, Shutter, SideButton, TORCH_CAPTION_OFF, TORCH_CAPTION_ON } from './ImmersiveBottomBar';
import type { HintTone } from './immersive-glass';
import { Flash, FlashOff } from '../icons';
import type { DocumentFraming } from '../../lib/document-framing-gate';
import { inlineGuideBand, inlineHintTop, inlineLayout } from '../../lib/inline-layout';

// The desktop / inline viewfinder: the full-screen camera's glass controls,
// arranged inside the 16:10 box in the modal rather than over a phone screen.
//
//   top row      document pill (centred), side badge (right)
//   instruction  under the top row
//   guide        in the band left between them (lib/inline-layout.ts)
//   bottom row   the shutter (centred), the torch beside it if there is one
//
// It draws from the same DocumentScanOverlay and the same documentGuideRect as
// immersive, and passes the ghost, the scan overlay and (from the capture step)
// the fallback crop the same band, so all three are one rectangle that never
// sits under a control.
//
// What it deliberately does NOT carry, because the surrounding desktop chrome
// already does: the back control (the step header has one) and the upload
// escape (the caption beneath the camera has one).

/** A guess at the side badge's width until it has been measured. */
const BADGE_WIDTH_GUESS = 96;

/** The box's size, a new object only when a number changes. */
export function useBoxSize(probeRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const host = probeRef.current?.parentElement;
    if (!host) return undefined;
    const measure = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;
      setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    return () => observer?.disconnect();
  }, [probeRef]);
  return size;
}

/** The side badge's width, so the centred document pill can give way to it. */
function useWidth(ref: React.RefObject<HTMLDivElement | null>, guess: number) {
  const [width, setWidth] = useState(guess);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [ref]);
  return width;
}

export function InlineOverlay({
  side,
  documentLabel,
  specimen,
  showSpecimen,
  country,
  guideAspect,
  framing,
  progress,
  hint,
  hintTone,
  busy,
  onCapture,
  shutterBlockedReason = null,
  hasTorch = false,
  torch = false,
  onToggleTorch,
  primaryColor,
}: {
  side: 'front' | 'back';
  documentLabel: string;
  /** The ID being captured, for the sample document. */
  specimen: DocumentSpecimenSubject;
  /** Off once the turn-over prompt has already shown this side. */
  showSpecimen: boolean;
  country?: string | null;
  guideAspect: number;
  framing: DocumentFraming;
  progress: number;
  hint: string;
  /** The colour of the instruction's icon (immersiveHintTone). */
  hintTone: HintTone;
  busy: boolean;
  onCapture: () => void;
  /** Why the shutter cannot take a photo yet; null when it can. */
  shutterBlockedReason?: string | null;
  /** A desktop camera rarely has a torch; the slot is empty without one. */
  hasTorch?: boolean;
  torch?: boolean;
  onToggleTorch?: () => void;
  primaryColor: string;
}) {
  const probeRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const size = useBoxSize(probeRef);
  const badgeWidth = useWidth(badgeRef, BADGE_WIDTH_GUESS);

  // The sizes for this box, and the band the guide is fitted into. Both are
  // derived from the box's height alone, as the capture step's crop is.
  const layout = inlineLayout(size?.height ?? 0);
  const band = useMemo(() => (size ? inlineGuideBand(size) : null), [size]);

  // The document pill is centred and gives way first: it may use the width
  // left between the badge and its mirror on the left, and truncates past it.
  const sideWidth = Math.max(layout.topRowHeight, badgeWidth);
  const pillMax = `max(${layout.topRowHeight}px, calc(100% - ${2 * (layout.edge + sideWidth + layout.topRowGap)}px))`;

  // Three equal slots, so the shutter stays centred with or without a torch.
  const slot = 'flex flex-1 items-center justify-center';

  return (
    <>
      {/* Measures the box: its parent is the camera box. */}
      <div ref={probeRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0" />

      {/* The guide is drawn only once the box is measured, so it never flashes
          on a rectangle that is not the one the controls leave room for. */}
      {band && showSpecimen && (
        <DocumentGhost
          key={side}
          aspect={guideAspect}
          band={band}
          accent={primaryColor}
          subject={specimen}
          documentFound={framing !== 'none' && framing !== 'wrongShape'}
        />
      )}

      {band && (
        <DocumentScanOverlay
          framing={framing}
          progress={progress}
          aspect={guideAspect}
          band={band}
          primaryColor={primaryColor}
        />
      )}

      {/* Top row: document centred, side on the right. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{ top: layout.edge, height: layout.topRowHeight }}
      >
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <DocumentPill
            label={documentLabel}
            country={country}
            maxWidth={pillMax}
            height={layout.topRowHeight}
            fontSize={layout.pillFontSize}
            flagClassName={layout.flagClassName}
          />
        </div>
        <div ref={badgeRef} className="absolute top-0" style={{ right: layout.edge }}>
          <SideBadge
            side={side}
            primaryColor={primaryColor}
            height={layout.topRowHeight}
            fontSize={layout.badgeFontSize}
          />
        </div>
      </div>

      {/* The instruction, under the top row and above the guide's band. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
        style={{ top: inlineHintTop(layout) }}
      >
        <HintPill
          hint={hint}
          tone={hintTone}
          primaryColor={primaryColor}
          maxWidth="88%"
          metrics={{
            fontSize: layout.hintFontSize,
            lineHeight: layout.hintLineHeight,
            paddingV: layout.hintPaddingV,
          }}
        />
      </div>

      {/* Bottom row: the shutter, centred, and the torch slot beside it. */}
      <div
        className="pointer-events-none absolute z-20 flex items-start justify-center"
        style={{ left: layout.edge, right: layout.edge, bottom: layout.edge, height: layout.shutterSize }}
      >
        <div className={slot} style={{ height: layout.shutterSize }} />
        <div className={slot} style={{ height: layout.shutterSize }}>
          <Shutter
            onCapture={onCapture}
            busy={busy}
            progress={progress}
            primaryColor={primaryColor}
            blockedReason={shutterBlockedReason}
            size={layout.shutterSize}
          />
        </div>
        <div className={slot} style={{ height: layout.shutterSize }}>
          {hasTorch && onToggleTorch && (
            <SideButton
              icon={torch ? Flash : FlashOff}
              caption={layout.sideCaptions ? (torch ? TORCH_CAPTION_ON : TORCH_CAPTION_OFF) : undefined}
              label={torch ? 'Turn off the torch' : 'Turn on the torch'}
              lit={torch}
              litColour={primaryColor}
              onClick={onToggleTorch}
              size={layout.sideButtonSize}
            />
          )}
        </div>
      </div>
    </>
  );
}
