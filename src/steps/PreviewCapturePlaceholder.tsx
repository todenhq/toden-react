'use client';

import React, { useState } from 'react';
import { Camera, ImageUp, ScanFace, Video } from '../components/icons';
import { StepHeader } from '../components/StepHeader';
import { Button } from '../components/ui/button';
import { ReadyPrimer } from '../components/ReadyPrimer';
import { documentReady, READY_LIVENESS, READY_LIVENESS_DIRECTIONS, READY_LIVENESS_PASSIVE } from '../components/ready-primer-content';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useText } from '../i18n';
import { shortDocumentLabel } from '../lib/document-label';
import { specimenTitle } from '../lib/document-specimen';
import { regionCountryName } from '../lib/regions';
import { stepAfterCapture } from '../lib/post-capture';
import { documentCaptureMethods } from '../lib/document-capture-methods';
import { verifiedIdsFromState } from '../lib/supporting-documents';
import { DocumentUploadPanel } from './DocumentUploadPanel';
import { useReportLivenessCamera } from '../components/liveness-camera';

/**
 * Builder-preview stand-in for the camera steps (document capture & liveness).
 * The real steps request camera permission, load MediaPipe, and record video —
 * pointless (and intrusive) inside the dashboard's preview iframe, so preview
 * mode renders this static placeholder instead. Continue/back keep the flow
 * walkable end to end.
 */
export function PreviewCapturePlaceholder({ kind }: { kind: 'document' | 'liveness' }) {
  const { state, dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();
  // The real steps open with a "here's what happens next" screen before the
  // camera. Preview mode swaps the WHOLE step for this placeholder, so without
  // repeating the gate here the builder would show a flow its end users never
  // get — the one thing this preview must never do.
  const [ready, setReady] = useState(false);
  // Upload-only document capture (`allowDocumentScan: false`) never opens the
  // camera, so real users get no ready gate and no viewfinder: they land on the
  // upload screen. The preview shows that screen too, never the camera stand-in.
  const uploadOnlyDocument = kind === 'document' && !documentCaptureMethods(config).scan;
  const showReady = !ready && !uploadOnlyDocument;
  // The document step's heading as it opens: the front of a two-sided ID, or
  // the whole of a one-sided one (DocumentCaptureStep).
  const idTypeDef = state.selectedIdType ? config.getIdTypeDefinition(state.selectedIdType) : null;
  const fullName = idTypeDef?.label ?? state.selectedIdType ?? t('uploadDocument.documentFallback');
  // What the step calls it: "Passport", not "International Passport".
  const documentName = { document: shortDocumentLabel(state.selectedIdType, fullName) };
  const country = state.selectedCountry ?? config.country ?? null;
  const twoSided = (idTypeDef?.scanSides ?? 'front_only') === 'front_and_back';
  const documentKeys = twoSided
    ? uploadOnlyDocument
      ? { title: 'uploadDocument.title.uploadFront', description: 'uploadDocument.description.uploadFront' }
      : { title: 'uploadDocument.title.scanFront', description: 'uploadDocument.description.scanFront' }
    : uploadOnlyDocument
      ? { title: 'uploadDocument.title.upload', description: 'uploadDocument.description.upload' }
      : { title: 'uploadDocument.title.capture', description: 'uploadDocument.description.capture' };
  // Bright screen: the stand-in for the selfie camera holds the flow light,
  // exactly where the real step does. The ready screen keeps the org's theme.
  useReportLivenessCamera(kind === 'liveness' && !showReady);

  const hasLiveness =
    config.enableSelfie !== false &&
    (state.selectedIdType
      ? config.getIdTypeFeatures(config.country, state.selectedIdType)?.livenessCheck ?? config.enableLiveness !== false
      : config.enableLiveness !== false);
  const handleContinue = () => {
    if (kind === 'document' && hasLiveness) {
      dispatch({ type: 'SET_STEP', payload: 'liveness' });
      return;
    }
    const next = stepAfterCapture(config, verifiedIdsFromState(state, config));
    if (next === 'submitted') {
      dispatch({ type: 'SUBMIT_VERIFICATION' });
    } else {
      dispatch({ type: 'SET_STEP', payload: next });
    }
  };

  const handleBack = () => {
    if (kind === 'document') {
      dispatch({ type: 'SET_STEP', payload: 'id-type' });
    } else {
      const def = state.selectedIdType ? config.getIdTypeDefinition(state.selectedIdType) : null;
      const cameFromDocument = def ? def.requiresDocumentCapture : true;
      dispatch({ type: 'SET_STEP', payload: cameFromDocument ? 'document-capture' : 'id-input' });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Each heading is the real step's own, as it opens, so a workflow's own
          wording shows here too. Liveness names no method, since not every
          method asks for a gesture (flash and passive ask for none). */}
      <StepHeader
        title={kind === 'liveness' ? t('presence.title') : t(documentKeys.title, documentName)}
        description={kind === 'liveness' ? t('presence.intro.description') : t(documentKeys.description, documentName)}
        onBack={handleBack}
      />

      {showReady ? (
        // Same gate the real steps open with, so the builder shows the flow end
        // users actually walk. Continuing lands on the camera stand-in below.
        <ReadyPrimer
          {...(kind === 'document'
            ? documentReady({
                name: documentName.document,
                subject: {
                  idType: state.selectedIdType,
                  title: specimenTitle(state.selectedIdType, fullName),
                  country: country ? regionCountryName(country) : null,
                },
                twoSided,
                accent: config.appearance?.primaryColor ?? '#5645F5',
              })
            : config.livenessMode === 'passive'
              ? READY_LIVENESS_PASSIVE
              : config.livenessGestureSet === 'directions' && config.livenessMode !== 'flash'
                ? READY_LIVENESS_DIRECTIONS
                : READY_LIVENESS)}
          onReady={() => setReady(true)}
        />
      ) : uploadOnlyDocument ? (
        // The real upload screen, with no handlers: the picker never opens here.
        <DocumentUploadPanel />
      ) : kind === 'document' ? (
        // Document frame — ID-card aspect ratio.
        <div className="mx-auto flex aspect-[1.586] w-full max-w-sm flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40">
          <Camera className="h-8 w-8 text-muted-foreground/60" />
          <p className="px-6 text-center text-xs text-muted-foreground">
            Document Intelligence captures and reads the ID here. The camera opens only for real users.
          </p>
        </div>
      ) : (
        // Face oval — mirrors the liveness viewfinder.
        <div className="mx-auto flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-full border-2 border-dashed border-border bg-muted/40 sm:h-72 sm:w-72">
          <ScanFace className="h-9 w-9 text-muted-foreground/60" />
          <p className="max-w-[12rem] text-center text-xs text-muted-foreground">
            The face check runs here. The camera opens only for real users.
          </p>
        </div>
      )}

      {/* The preview note and Continue belong to the camera stand-in — while the
          ready screen is up it owns the only call to action, exactly as it does
          for real users. */}
      {!showReady && (
        <>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            {uploadOnlyDocument ? <ImageUp className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
            {uploadOnlyDocument
              ? 'The photo picker opens only for real users. This is a builder preview.'
              : 'The camera only activates for real users — this is a builder preview.'}
          </div>

          <Button onClick={handleContinue} className="w-full h-12 rounded-xl text-base font-medium">
            Continue
          </Button>
        </>
      )}
    </div>
  );
}
