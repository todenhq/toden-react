import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DocumentScanOverlay } from './DocumentScanOverlay';
import { DocumentGhost, type DocumentSpecimenSubject } from './DocumentGhost';
import { TopBar } from './ImmersiveControls';
import { BottomBar, HintPill } from './ImmersiveBottomBar';
import type { HintTone } from './immersive-glass';
import type { DocumentFraming } from '../../lib/document-framing-gate';
import { documentGuideRect, type GuideBand } from '../../lib/document-guide';
import { immersiveGuideBand } from '../../lib/document-turn';
import { hintTop, safeTop } from '../../lib/immersive-layout';
import { TURNED_HINT_ROTATION, turnedHintBox } from '../../lib/turned-hint';

// Everything drawn over the full-screen camera, laid out to match the React
// Native SDK's ImmersiveOverlay (and so the Flutter screen it mirrors): the
// top bar (back, document pill, side badge), the instruction under it, the
// guide, then the bottom row (upload, shutter, torch). The numbers are
// lib/immersive-layout.ts's.
//
// The animated frame itself is DocumentScanOverlay — a canvas port of Flutter's
// scan painter. This file is only the chrome around it.

interface ViewGeometry {
  width: number;
  height: number;
  /** env(safe-area-inset-top) and -bottom, resolved to CSS pixels. */
  topInset: number;
  bottomInset: number;
}

/**
 * The view's size and its safe-area insets, measured from a probe whose
 * padding is the insets, so the band is computed from the same numbers the
 * controls are positioned with. A new object only when a number changes, so
 * nothing redraws for nothing.
 */
function useViewGeometry(probeRef: React.RefObject<HTMLDivElement | null>): ViewGeometry | null {
  const [geometry, setGeometry] = useState<ViewGeometry | null>(null);
  useLayoutEffect(() => {
    const probe = probeRef.current;
    const host = probe?.parentElement;
    if (!probe || !host) return undefined;
    const measure = () => {
      const style = getComputedStyle(probe);
      const next: ViewGeometry = {
        width: host.clientWidth,
        height: host.clientHeight,
        topInset: parseFloat(style.paddingTop) || 0,
        bottomInset: parseFloat(style.paddingBottom) || 0,
      };
      if (next.width <= 0 || next.height <= 0) return;
      setGeometry((prev) =>
        prev &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.topInset === next.topInset &&
        prev.bottomInset === next.bottomInset
          ? prev
          : next,
      );
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    // A rotation can change the insets without resizing the host.
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [probeRef]);
  return geometry;
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
  hintTone,
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
  /** The colour of the instruction's icon (immersiveHintTone). */
  hintTone: HintTone;
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
  const probeRef = useRef<HTMLDivElement | null>(null);
  const geometry = useViewGeometry(probeRef);
  // The band an upright guide (a turned NIN slip) is fitted to, clear of the
  // top bar and the bottom row (document-turn.ts immersiveBand).
  // `geometry` is a new object only when a number changes, so the band is too.
  const band = useMemo(
    () => (geometry ? immersiveGuideBand(geometry.height, geometry.topInset, geometry.bottomInset) : null),
    [geometry],
  );
  const reportBand = useRef(onGuideBand);
  reportBand.current = onGuideBand;
  useEffect(() => {
    reportBand.current?.(band);
  }, [band]);

  // A turned guide turns the hint with it (lib/turned-hint.ts), beside the
  // guide; the same rectangle the scan overlay draws.
  const turnedHint =
    guideAspect < 1 && geometry && band
      ? turnedHintBox(documentGuideRect({ width: geometry.width, height: geometry.height }, guideAspect, band))
      : null;

  return (
    <>
      {/* Measures the safe-area insets: its padding is them. */}
      <div
        ref={probeRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      />

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

      <TopBar
        onBack={onBack}
        country={country}
        documentLabel={documentLabel}
        side={side}
        primaryColor={primaryColor}
      />

      {/* The instruction, under the top bar; beside a turned guide instead. */}
      {turnedHint ? (
        <div
          className="pointer-events-none absolute z-20 flex items-center justify-center"
          style={{
            left: turnedHint.left,
            top: turnedHint.top,
            width: turnedHint.width,
            height: turnedHint.height,
            transform: `rotate(${TURNED_HINT_ROTATION})`,
          }}
        >
          <HintPill hint={hint} tone={hintTone} primaryColor={primaryColor} maxWidth="100%" />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: safeTop(hintTop(0)) }}
        >
          <HintPill hint={hint} tone={hintTone} primaryColor={primaryColor} maxWidth="88%" />
        </div>
      )}

      <BottomBar
        onUpload={onUpload}
        onCapture={onCapture}
        busy={busy}
        progress={progress}
        blockedReason={shutterBlockedReason}
        hasTorch={hasTorch}
        torch={torch}
        onToggleTorch={onToggleTorch}
        primaryColor={primaryColor}
      />
    </>
  );
}
