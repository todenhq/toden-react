'use client';

import { useId, useRef } from 'react';
import { Camera, Flash, FlashOff, Image } from '../icons';
import { useText } from '../../i18n';
import { BackButton, CloseButton, DocumentPill, TopBar } from './ImmersiveControls';
import {
  BottomBar,
  HintPill,
  Shutter,
  SideButton,
  TORCH_CAPTION_OFF,
  TORCH_CAPTION_ON,
  UPLOAD_CAPTION,
} from './ImmersiveBottomBar';
import { useBoxSize } from './InlineOverlay';
import { hintTop, safeTop } from '../../lib/immersive-layout';
import { inlineHintTop, inlineLayout } from '../../lib/inline-layout';
import { PHOTO_COPY, PHOTO_SHUTTER } from '../../lib/photo-mode';

// Everything drawn over the photo camera (components/PhotoCamera.tsx): the
// scan's top bar, instruction and bottom row, and nothing that scans. No guide,
// no sample document, no detection and no gate: the shutter is always enabled.
//
//   immersive (phone)  the full-screen camera's controls (immersive-layout.ts)
//   inline (desktop)   the same controls inside the 16:10 box in the modal
//                      (inline-layout.ts), as the scan's InlineOverlay
//
// Mirrors the React Native SDK's components/viewfinder/PhotoViewfinder.tsx.

export interface PhotoOverlayProps {
  layout: 'immersive' | 'inline';
  /** What is being photographed, in the top row's centre pill. */
  title: string;
  /** The neutral instruction under the top row; null for none. */
  hint: string | null;
  onCapture: () => void;
  /** Closes only the camera. */
  onBack: () => void;
  /** The flow's own close; null draws no X. */
  onClose: (() => void) | null;
  /** The step's file chooser; null draws no Upload. */
  onUpload: (() => void) | null;
  hasTorch: boolean;
  torch: boolean;
  onToggleTorch: () => void;
  primaryColor: string;
}

export function PhotoOverlay(p: PhotoOverlayProps) {
  return p.layout === 'immersive' ? <ImmersivePhotoOverlay {...p} /> : <InlinePhotoOverlay {...p} />;
}

function ImmersivePhotoOverlay(p: PhotoOverlayProps) {
  return (
    <>
      <TopBar onBack={p.onBack} documentLabel={p.title} onClose={p.onClose} />
      {p.hint && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: safeTop(hintTop(0)) }}
        >
          <HintPill hint={p.hint} tone="neutral" primaryColor={p.primaryColor} maxWidth="88%" />
        </div>
      )}
      <BottomBar
        onUpload={p.onUpload}
        onCapture={p.onCapture}
        busy={PHOTO_SHUTTER.busy}
        progress={PHOTO_SHUTTER.progress}
        blockedReason={PHOTO_SHUTTER.blockedReason}
        hasTorch={p.hasTorch}
        torch={p.torch}
        onToggleTorch={p.onToggleTorch}
        primaryColor={p.primaryColor}
        shutterIcon={Camera}
        shutterLabel={PHOTO_COPY.shutter}
        uploadHint={PHOTO_COPY.uploadHint}
      />
    </>
  );
}

function InlinePhotoOverlay(p: PhotoOverlayProps) {
  const t = useText();
  const probeRef = useRef<HTMLDivElement | null>(null);
  const uploadHintId = useId();
  const size = useBoxSize(probeRef);
  const layout = inlineLayout(size?.height ?? 0);
  // The title pill is centred and gives way first, between the back control
  // and its mirror on the right.
  const pillMax = `max(${layout.topRowHeight}px, calc(100% - ${2 * (layout.edge + layout.topRowHeight + layout.topRowGap)}px))`;
  // Three equal slots, so the shutter stays centred with or without the others.
  const slot = 'flex flex-1 items-center justify-center';

  return (
    <>
      {/* Measures the box: its parent is the camera box. */}
      <div ref={probeRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0" />

      {/* Top row: back, the title centred, and the flow's close if offered. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{ top: layout.edge, height: layout.topRowHeight }}
      >
        <BackButton
          onClick={p.onBack}
          size={layout.topRowHeight}
          className="absolute top-0"
          style={{ left: layout.edge }}
        />
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <DocumentPill
            label={p.title}
            maxWidth={pillMax}
            height={layout.topRowHeight}
            fontSize={layout.pillFontSize}
          />
        </div>
        {p.onClose && (
          <CloseButton
            onClick={p.onClose}
            size={layout.topRowHeight}
            className="absolute top-0"
            style={{ right: layout.edge }}
          />
        )}
      </div>

      {p.hint && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
          style={{ top: inlineHintTop(layout) }}
        >
          <HintPill
            hint={p.hint}
            tone="neutral"
            primaryColor={p.primaryColor}
            maxWidth="88%"
            metrics={{
              fontSize: layout.hintFontSize,
              lineHeight: layout.hintLineHeight,
              paddingV: layout.hintPaddingV,
            }}
          />
        </div>
      )}

      {/* Bottom row: Upload, the shutter centred, the torch if there is one. */}
      <div
        className="pointer-events-none absolute z-20 flex items-start justify-center"
        style={{ left: layout.edge, right: layout.edge, bottom: layout.edge, height: layout.shutterSize }}
      >
        <div className={slot} style={{ height: layout.shutterSize }}>
          {p.onUpload && (
            <>
              <span id={uploadHintId} className="sr-only">
                {PHOTO_COPY.uploadHint}
              </span>
              <SideButton
                icon={Image}
                caption={layout.sideCaptions ? UPLOAD_CAPTION : undefined}
                label={t('uploadDocument.camera.uploadInstead')}
                describedBy={uploadHintId}
                onClick={p.onUpload}
                size={layout.sideButtonSize}
              />
            </>
          )}
        </div>
        <div className={slot} style={{ height: layout.shutterSize }}>
          <Shutter
            onCapture={p.onCapture}
            busy={PHOTO_SHUTTER.busy}
            progress={PHOTO_SHUTTER.progress}
            primaryColor={p.primaryColor}
            blockedReason={PHOTO_SHUTTER.blockedReason}
            size={layout.shutterSize}
            icon={Camera}
            label={PHOTO_COPY.shutter}
          />
        </div>
        <div className={slot} style={{ height: layout.shutterSize }}>
          {p.hasTorch && (
            <SideButton
              icon={p.torch ? Flash : FlashOff}
              caption={layout.sideCaptions ? (p.torch ? TORCH_CAPTION_ON : TORCH_CAPTION_OFF) : undefined}
              label={p.torch ? 'Turn off the torch' : 'Turn on the torch'}
              lit={p.torch}
              litColour={p.primaryColor}
              onClick={p.onToggleTorch}
              size={layout.sideButtonSize}
            />
          )}
        </div>
      </div>
    </>
  );
}
