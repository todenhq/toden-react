'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload } from './icons';
import { Button } from './ui/button';
import { CameraPermissionPrimer } from './CameraPermissionPrimer';
import { PhotoOverlay } from './viewfinder/PhotoOverlay';
import { BackButton, TopBar } from './viewfinder/ImmersiveControls';
import { useImmersiveClose, useSetImmersiveCapture } from './immersive-capture';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useCamera } from '../hooks/useCamera';
import { useCameraPrimer } from '../hooks/useCameraPrimer';
import { useTorch } from '../hooks/useTorch';
import { useText } from '../i18n';
import { DOCUMENT_CAPTURE_HEIGHT, DOCUMENT_CAPTURE_WIDTH, isFrontFacingStream } from '../lib/capture-settings';
import { hasNoWebcam, isDesktopDevice } from '../lib/device';
import { safeReportError } from '../lib/errors';
import { useModalSurface } from '../lib/modal-surface';
import { inlineLayout } from '../lib/inline-layout';
import {
  PHOTO_COPY,
  captureStill,
  handlePhotoCameraKey,
  photoCameraExits,
  photoHint,
  stillFile,
} from '../lib/photo-mode';
import { cn } from '../lib/utils';
import { VerificationError } from '../types/verification';

// ─── "Take a photo" inside the SDK ──────────────────────────────────────────
//
// The document camera's look, minus the scanning (lib/photo-mode.ts). Used
// where the flow wants a plain photo (a proof of address, a supporting
// document, the entrance) and used to hand over to a file input with
// `capture`, which opens a camera on a phone only: on a desktop it was a file
// chooser.
//
// On a phone it takes the whole window, as the scan does (setImmersiveCapture
// hides the modal's header, and the camera covers the window). On a desktop
// it sits in the modal body in the scan's 16:10 box, under the step header.
//
// The caller renders it while open and hides its own content underneath (see
// hooks/usePhotoCamera.ts). The photo comes back as the File the step's file
// input would have given, so the step's own checks and upload run unchanged.
//
// Mirrors the React Native SDK's components/PhotoCamera.tsx.

export interface PhotoCameraProps {
  /** What is being photographed, in the top row's centre pill. */
  title: string;
  /** An optional neutral instruction under the top row. */
  instruction?: string | null;
  /** The photo's file name (lib/photo-mode.ts photoFileName). */
  fileName: string;
  /** The still, as a JPEG File. The camera has already closed. */
  onPhoto: (file: File) => void;
  /** Hide the camera; back, close, upload and a photo all use it. */
  onDismiss: () => void;
  /** The step's own file chooser, in the bottom row. Left out where the workflow wants the camera. */
  onUpload?: (() => void) | null;
  /** The way out when the camera cannot run (denied, none). Defaults to `onUpload`. */
  onUploadInstead?: (() => void) | null;
}

export function PhotoCamera(p: PhotoCameraProps) {
  const desktop = useMemo(() => isDesktopDevice(), []);
  const setImmersiveCapture = useSetImmersiveCapture();
  const surface = useModalSurface();
  const flowClose = useImmersiveClose();
  const rootRef = useRef<HTMLElement | null>(null);

  const { back, close } = photoCameraExits({ dismiss: p.onDismiss, flowClose });
  const leaveThen = (then: (() => void) | null | undefined) =>
    then
      ? () => {
          p.onDismiss();
          then();
        }
      : null;
  const upload = leaveThen(p.onUpload);
  const uploadInstead = leaveThen(p.onUploadInstead === undefined ? p.onUpload : p.onUploadInstead);

  // A phone: the camera takes the window, so the header goes, as for the scan.
  useEffect(() => {
    if (desktop) return undefined;
    setImmersiveCapture(true);
    return () => setImmersiveCapture(false);
  }, [desktop, setImmersiveCapture]);

  // Esc is back, and must not reach the dialog, whose Esc closes the flow:
  // listened for on the window's capture phase, ahead of the dialog's.
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => void handlePhotoCameraKey(event, () => backRef.current());
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // Focus moves to the camera as it opens.
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const body = (
    <PhotoCameraBody
      layout={desktop ? 'inline' : 'immersive'}
      title={p.title}
      hint={photoHint(p.instruction)}
      fileName={p.fileName}
      onPhoto={(file) => {
        p.onDismiss();
        p.onPhoto(file);
      }}
      onBack={back}
      // The desktop modal keeps its header, whose X sits just above.
      onClose={desktop ? null : close}
      onUpload={upload}
      onUploadInstead={uploadInstead}
    />
  );

  if (desktop) {
    return (
      <section ref={rootRef} tabIndex={-1} aria-label={p.title} className="space-y-3 outline-none">
        {body}
      </section>
    );
  }
  const sheet = (
    <section
      ref={rootRef}
      tabIndex={-1}
      aria-label={p.title}
      className={cn('inset-0 z-50 flex flex-col bg-black outline-none', surface ? 'absolute' : 'fixed')}
    >
      {body}
    </section>
  );
  return surface ? createPortal(sheet, surface) : sheet;
}

interface BodyProps {
  layout: 'immersive' | 'inline';
  title: string;
  hint: string | null;
  fileName: string;
  onPhoto: (file: File) => void;
  onBack: () => void;
  onClose: (() => void) | null;
  onUpload: (() => void) | null;
  onUploadInstead: (() => void) | null;
}

/** The scan's permission handling, then the camera. */
function PhotoCameraBody(p: BodyProps) {
  const config = useVerificationConfig();
  const t = useText();
  const primaryColor = config.appearance?.primaryColor ?? '#5645F5';
  const immersive = p.layout === 'immersive';

  // No camera at all (a desktop without a webcam, or no camera API): say so
  // rather than prime a prompt that can only fail.
  const [device, setDevice] = useState<'checking' | 'present' | 'none'>('checking');
  const noCameraApi = typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia;
  useEffect(() => {
    if (noCameraApi) {
      setDevice('none');
      return undefined;
    }
    let live = true;
    void hasNoWebcam().then((none) => {
      if (live) setDevice(none ? 'none' : 'present');
    });
    return () => {
      live = false;
    };
  }, [noCameraApi]);

  const primerStatus = useCameraPrimer();
  const [primed, setPrimed] = useState(false);
  const needsPrimer = device === 'present' && primerStatus === 'needed' && !primed;
  const allowed = device === 'present' && (primerStatus === 'granted' || primed);
  const camera = useCamera({
    facingMode: 'environment',
    enabled: allowed,
    resolution: { width: DOCUMENT_CAPTURE_WIDTH, height: DOCUMENT_CAPTURE_HEIGHT },
  });
  const torch = useTorch(camera.stream);
  // A webcam's preview is mirrored, as the scan's is; the photo is not.
  const mirror = isFrontFacingStream(camera.stream);

  // A denied camera is reported to onError once, as the scan reports it.
  const reportedRef = useRef(false);
  useEffect(() => {
    if (camera.permissionDenied && !reportedRef.current) {
      reportedRef.current = true;
      safeReportError(
        config.onError,
        new VerificationError(
          'camera_permission_denied',
          'Camera access is required to take this photo. Please allow camera access to continue.',
        ),
      );
    }
    if (!camera.permissionDenied) reportedRef.current = false;
  }, [camera.permissionDenied, config]);

  // The shutter is never disabled; this drops a second tap while the first
  // still is being taken, so two captures never contend for the camera.
  const capturingRef = useRef(false);
  const [flash, setFlash] = useState(0);
  const capture = async () => {
    const video = camera.videoRef.current;
    if (!video || !camera.isReady || capturingRef.current) return;
    capturingRef.current = true;
    setFlash((n) => n + 1);
    try {
      const blob = await captureStill(video, camera.stream?.getVideoTracks()[0] ?? null);
      p.onPhoto(stillFile(blob, p.fileName));
    } catch {
      /* a failed shutter is a no-op: the person can tap again */
    } finally {
      capturingRef.current = false;
    }
  };

  const unavailable = device === 'none' || (!!camera.error && !camera.permissionDenied);
  const failed = unavailable || camera.permissionDenied;

  // Before the camera runs: the scan's primer, with the camera's way back.
  if (needsPrimer && !failed) {
    return immersive ? (
      <div className="relative flex min-h-0 flex-1 flex-col bg-background">
        <div
          className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 76px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <CameraPermissionPrimer onGrant={() => setPrimed(true)} />
        </div>
        <TopBar onBack={p.onBack} documentLabel={p.title} onClose={p.onClose} />
      </div>
    ) : (
      <>
        <CameraPermissionPrimer onGrant={() => setPrimed(true)} />
        <Button variant="outline" className="w-full" onClick={p.onBack}>
          {t('common.back')}
        </Button>
      </>
    );
  }

  return (
    <div
      className={cn('relative bg-black', immersive ? 'min-h-0 flex-1 overflow-hidden' : 'overflow-hidden rounded-xl')}
      style={immersive ? undefined : { aspectRatio: '16/10' }}
    >
      {allowed && (
        <video
          ref={camera.videoRef}
          autoPlay
          playsInline
          muted
          className={cn('h-full w-full object-cover', mirror && 'transform-[scaleX(-1)]')}
        />
      )}

      {camera.isReady && !failed && (
        <PhotoOverlay
          layout={p.layout}
          title={p.title}
          hint={p.hint}
          onCapture={() => void capture()}
          onBack={p.onBack}
          onClose={p.onClose}
          onUpload={p.onUpload}
          hasTorch={torch.hasTorch}
          torch={torch.torch}
          onToggleTorch={torch.toggleTorch}
          primaryColor={primaryColor}
        />
      )}

      {flash > 0 && (
        <div key={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-white animate-capture-flash" />
      )}

      {!camera.isReady && !failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
          {camera.permissionDenied ? (
            <>
              <p className="text-sm font-medium">{t('uploadDocument.camera.denied')}</p>
              <p className="text-xs text-white/80">{t('uploadDocument.camera.deniedHint')}</p>
            </>
          ) : (
            <p className="text-sm">{device === 'none' ? PHOTO_COPY.noCamera : camera.error}</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {!noCameraApi && (
              <Button
                variant="outline"
                size="sm"
                // A listing before permission can miss a camera: asking is the real test.
                onClick={() => (device === 'none' ? setDevice('present') : camera.restart('environment'))}
                className="border-white/30 text-white"
              >
                {t('uploadDocument.tryAgain')}
              </Button>
            )}
            {p.onUploadInstead && (
              <Button
                variant="outline"
                size="sm"
                onClick={p.onUploadInstead}
                className="gap-1 border-white/30 text-white"
              >
                <Upload className="h-3.5 w-3.5" /> {t('uploadDocument.camera.uploadInstead')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Until the controls are up, the way back (and out) is still there. */}
      {(!camera.isReady || failed) &&
        (immersive ? (
          <TopBar onBack={p.onBack} documentLabel={p.title} onClose={p.onClose} />
        ) : (
          <BackButton
            onClick={p.onBack}
            size={inlineLayout(0).topRowHeight}
            className="absolute z-20"
            style={{ top: inlineLayout(0).edge, left: inlineLayout(0).edge }}
          />
        ))}
    </div>
  );
}
