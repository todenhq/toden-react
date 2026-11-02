import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Upload, Flash, FlashOff } from '../icons';
import { DocumentScanOverlay } from './DocumentScanOverlay';
import { DocumentGhost, type DocumentSpecimenSubject } from './DocumentGhost';
import { DocumentPill, HintPill, SCRIM, SideBadge, Shutter } from './parts';
import type { DocumentFraming } from '../../lib/document-framing-gate';
import type { GuideBand } from '../../lib/document-guide';
import { cn } from '../../lib/utils';
import { useText } from '../../i18n';

// Everything drawn over the full-screen camera, laid out to match the Flutter
// document-capture screen: back control top-left, FRONT/BACK badge top-right,
// the document pill (with its issuing country's flag) centred beneath it, the
// hint as a dark pill above the controls, then the upload escape, the shutter
// and the torch.
//
// The animated frame itself is DocumentScanOverlay — a canvas port of Flutter's
// scan painter. This file is only the chrome around it, kept separate for the
// same reason Flutter splits overlay from painter. The individual pieces live
// in ./parts and are shared with InlineOverlay.

/** Height of the document pill under the badges (py-2 around a 20 px line). */
const DOCUMENT_PILL_HEIGHT = '2.25rem';
/**
 * Room kept above the upload link and shutter for a one-line hint and its gap.
 * Fixed rather than measured, so the guide does not move when the hint changes.
 */
const HINT_ROOM_PX = 60;

/**
 * The free band between the controls over the camera, measured from the screen
 * as laid out. An upright guide (a long document turned on a tall screen,
 * lib/document-turn.ts) is fitted to it, so it never runs under the badges or
 * the shutter. A new object only when a number changes, so nothing redraws
 * for nothing.
 */
function useGuideBand(
  topRef: React.RefObject<HTMLDivElement | null>,
  controlsRef: React.RefObject<HTMLDivElement | null>,
): GuideBand | null {
  const [band, setBand] = useState<GuideBand | null>(null);
  useLayoutEffect(() => {
    const marker = topRef.current;
    const controls = controlsRef.current;
    const host = marker?.parentElement;
    if (!marker || !controls || !host) return undefined;
    const measure = () => {
      const origin = host.getBoundingClientRect().top;
      const top = Math.round(marker.getBoundingClientRect().top - origin);
      const bottom = Math.round(controls.getBoundingClientRect().top - origin - HINT_ROOM_PX);
      setBand((prev) => (prev && prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    observer?.observe(controls);
    return () => observer?.disconnect();
  }, [topRef, controlsRef]);
  return band;
}

export function ImmersiveOverlay({
  side,
  documentLabel,
  specimen,
  showSpecimen,
  country,
  guideAspect,
  framing,
  progress,
  hint,
  busy,
  torch,
  hasTorch,
  onToggleTorch,
  onCapture,
  shutterBlockedReason = null,
  onBack,
  onUpload,
  primaryColor,
  onGuideBand,
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
  busy: boolean;
  torch: boolean;
  hasTorch: boolean;
  onToggleTorch: () => void;
  onCapture: () => void;
  /** Why the shutter cannot take a photo yet; null when it can. */
  shutterBlockedReason?: string | null;
  onBack: (() => void) | null;
  onUpload: (() => void) | null;
  primaryColor: string;
  /** Told the free band an upright guide is fitted to, so the guide crop matches. */
  onGuideBand?: (band: GuideBand | null) => void;
}) {
  const t = useText();
  const top = 'calc(env(safe-area-inset-top) + 0.75rem)';
  const topChromeRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const band = useGuideBand(topChromeRef, controlsRef);
  const reportBand = useRef(onGuideBand);
  reportBand.current = onGuideBand;
  useEffect(() => {
    reportBand.current?.(band);
  }, [band]);

  return (
    <>
      {/* The sample document, under the scan overlay so the guide's corners sit
          on its edges. Keyed by side so turning over shows the other face. */}
      {showSpecimen && (
        <DocumentGhost
          key={side}
          aspect={guideAspect}
          band={band}
          accent={primaryColor}
          subject={specimen}
          documentFound={framing !== 'none' && framing !== 'wrongShape'}
        />
      )}

      <DocumentScanOverlay
        framing={framing}
        progress={progress}
        aspect={guideAspect}
        band={band}
        primaryColor={primaryColor}
      />

      {/* Where the top controls end: the bottom of the document pill. */}
      <div
        ref={topChromeRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0"
        style={{ top: `calc(${top} + 3.25rem + ${DOCUMENT_PILL_HEIGHT})`, height: 0 }}
      />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="absolute z-20 flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{ top, left: '1rem', backgroundColor: SCRIM }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <SideBadge side={side} primaryColor={primaryColor} style={{ top, right: '1rem' }} />

      <DocumentPill
        label={documentLabel}
        country={country}
        style={{ top: `calc(${top} + 3.25rem)` }}
      />

      {/* Bottom stack: hint pill → upload escape → shutter + torch. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-5 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <HintPill>{hint}</HintPill>

        {/* The upload link and the shutter row: where the free band ends. */}
        <div ref={controlsRef} className="flex w-full flex-col items-center gap-5">
          {onUpload && (
            <button
              type="button"
              onClick={onUpload}
              className="pointer-events-auto inline-flex items-center gap-2 text-sm font-medium text-white/90 focus-visible:outline-none focus-visible:underline"
            >
              <Upload className="h-4 w-4" />
              {t('uploadDocument.camera.uploadInstead')}
            </button>
          )}

          <div className="relative flex w-full items-center justify-center">
            <Shutter
              onCapture={onCapture}
              busy={busy}
              primaryColor={primaryColor}
              blockedReason={shutterBlockedReason}
            />

            {/* Torch sits bottom-right rather than beside the shutter, matching
                Flutter. Hidden entirely when the device cannot toggle it. */}
            {hasTorch && (
              <button
                type="button"
                onClick={onToggleTorch}
                aria-label={torch ? 'Turn torch off' : 'Turn torch on'}
                aria-pressed={torch}
                className={cn(
                  'pointer-events-auto absolute right-0 flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                  torch ? 'text-black' : 'text-white',
                )}
                style={{ backgroundColor: torch ? '#ffffff' : SCRIM }}
              >
                {/* One family for one toggle: Flash and FlashOff are the same bolt,
                    slashed or not. Zap is a different shape in this icon set, so the
                    pair this used to make swapped two unrelated glyphs on one button. */}
                {torch ? <Flash className="h-5 w-5" /> : <FlashOff className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
