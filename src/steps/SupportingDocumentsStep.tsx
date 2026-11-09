'use client';

import React, { useRef, useState } from 'react';
import { StepHeader } from '../components/StepHeader';
import { supportingDocumentsIntro } from './supporting-documents-intro';
import { Button } from '../components/ui/button';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { BUSINESS_DOC_ACCEPTED_MIMES } from './BusinessDocumentSlot';
import { SupportingDocumentCard } from './SupportingDocumentCard';
import { isPdfMime, uploadSizeError } from '../lib/upload-limits';
import { resolveSupportingDocuments, verifiedIdsFromState } from '../lib/supporting-documents';
import { stepAfterSupportingDocuments } from '../lib/post-capture';
import { stepBeforeSupportingDocuments } from '../lib/supporting-documents-nav';
import { useText } from '../i18n';
import { VerificationApiError } from '../services/api';
import { hasSignature, type SignatureDrawing } from '../lib/signature';
import { displayFileName } from '../lib/display-file-name';
import { cn } from '../lib/utils';
import { GroupEdge, TuckedRow } from './business-documents/GroupRow';
import { PhotoCamera } from '../components/PhotoCamera';
import { usePhotoCamera } from '../hooks/usePhotoCamera';
import { PHOTO_COPY, photoFileName } from '../lib/photo-mode';

/**
 * Supporting-documents step: one upload slot per requested document.
 *
 * These are artefacts the organisation keeps ON FILE — the org names each one
 * and writes the guidance under it — and NOT the identity evidence this
 * verification is decided on. The person has already been verified against the government
 * record by the time they get here, so a document that cannot be read costs
 * them nothing: the server records it and the verification stands.
 *
 * Each card names the values that will be read off that document, because a
 * supporting document is whatever the organisation called it: a slot with a
 * title alone says nothing about what handing it over is FOR.
 *
 * Which documents are asked for depends on the ID they picked, so this step
 * only appears when that resolution produces something (see VerificationModal).
 */
export function SupportingDocumentsStep() {
  const { state, dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();
  const slots = resolveSupportingDocuments(
    config.supportingDocuments,
    verifiedIdsFromState(state, config),
  );

  const goBack = () =>
    dispatch({ type: 'SET_STEP', payload: stepBeforeSupportingDocuments(config, state) });
  const goNext = () => {
    const next = stepAfterSupportingDocuments(config);
    dispatch(next === 'submitted' ? { type: 'SUBMIT_VERIFICATION' } : { type: 'SET_STEP', payload: next });
  };
  const uploads = state.supportingDocuments;

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  // In-memory Files for tap-to-preview only; lost on remount, which degrades
  // the row to the plain uploaded state. The mediaId is what matters.
  const [files, setFiles] = useState<Record<string, File | undefined>>({});

  const uploadFor = (key: string) => uploads.find((d) => d.type === key) ?? null;
  const setError = (key: string, message: string | null) =>
    setErrors((prev) => ({ ...prev, [key]: message ?? undefined }));

  const handlePick = async (key: string, file: File) => {
    setError(key, null);
    if (!BUSINESS_DOC_ACCEPTED_MIMES.includes((file.type.split(';')[0] || '').toLowerCase())) {
      setError(key, t('supportingDocuments.error.fileType'));
      return;
    }
    if (uploadSizeError(file.type, file.size)) {
      const tooLarge = isPdfMime(file.type) ? 'pdfTooLarge' : 'imageTooLarge';
      setError(key, t(`supportingDocuments.error.${tooLarge}`));
      return;
    }
    setUploadingKey(key);
    try {
      const mediaId = await config.api.upload(file, 'supporting_document');
      setFiles((prev) => ({ ...prev, [key]: file }));
      dispatch({
        type: 'SET_SUPPORTING_DOCUMENTS',
        payload: [...uploads.filter((d) => d.type !== key), { type: key, mediaId, fileName: file.name, method: 'uploaded' }],
      });
    } catch {
      setError(key, t('supportingDocuments.error.uploadFailed'));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSign = async (key: string, drawing: SignatureDrawing) => {
    setError(key, null);
    if (!hasSignature(drawing)) {
      setError(key, t('supportingDocuments.error.signatureEmpty'));
      return;
    }
    setUploadingKey(key);
    try {
      const mediaId = await config.api.uploadSignature(drawing);
      dispatch({
        type: 'SET_SUPPORTING_DOCUMENTS',
        payload: [...uploads.filter((d) => d.type !== key), { type: key, mediaId, method: 'drawn' }],
      });
    } catch (err) {
      const empty = err instanceof VerificationApiError && err.code === 'signature_empty';
      setError(key, t(empty ? 'supportingDocuments.error.signatureEmpty' : 'supportingDocuments.error.signatureFailed'));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemove = (key: string) => {
    setFiles((prev) => ({ ...prev, [key]: undefined }));
    dispatch({ type: 'SET_SUPPORTING_DOCUMENTS', payload: uploads.filter((d) => d.type !== key) });
  };

  // "Take a photo" for a camera document: the SDK's own camera. It has no
  // Upload, as the workflow wants the document photographed now; when the
  // camera cannot run (denied, or a desktop without one) a photo can still be
  // chosen, as the old camera input fell back to on a desktop.
  const camera = usePhotoCamera<string>();
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraSlot = slots.find((s) => s.key === camera.target) ?? null;

  const requiredComplete = slots.every((slot) => !slot.required || uploadFor(slot.key) !== null);

  // One document at a time, stacked like the business documents: the open
  // one in front, the next tucked behind it above and the previous below.
  // It opens on the first document still to provide.
  const [active, setActive] = useState(() => {
    const first = slots.findIndex((slot) => uploadFor(slot.key) === null);
    return first === -1 ? 0 : first;
  });
  const index = Math.min(active, Math.max(slots.length - 1, 0));
  // Which way the last move went, so the open card arrives from that side.
  const [shown, setShown] = useState(index);
  const [direction, setDirection] = useState<'forward' | 'back' | null>(null);
  if (shown !== index) {
    setDirection(index > shown ? 'forward' : 'back');
    setShown(index);
  }
  const slot = slots[index];
  const nextSlot = slots[index + 1];
  const previousSlot = slots[index - 1];
  const last = index >= slots.length - 1;
  const provided = slot ? uploadFor(slot.key) !== null : true;

  const handleBack = () => (index > 0 ? setActive(index - 1) : goBack());
  const handleContinue = () => (last ? goNext() : setActive(index + 1));

  // What a tucked card says under its title.
  const heldBy = (key: string, label: string) => {
    const upload = uploadFor(key);
    if (!upload) return t('business.documents.skipped');
    if (upload.method === 'drawn') return t('supportingDocuments.signature.saved');
    return displayFileName(upload.fileName ?? label) ?? t('business.documents.uploaded');
  };
  const motion =
    direction === 'forward' ? 'animate-slide-down' : direction === 'back' ? 'animate-slide-up' : undefined;

  return (
    <>
    {camera.open && cameraSlot && (
      <PhotoCamera
        title={cameraSlot.label}
        instruction={PHOTO_COPY.fitDocument}
        fileName={photoFileName(cameraSlot.label)}
        onPhoto={(file) => void handlePick(cameraSlot.key, file)}
        onDismiss={camera.dismiss}
        onUpload={null}
        onUploadInstead={() => photoInput.current?.click()}
      />
    )}
    <div className={cn('space-y-6 animate-slide-up', camera.open && 'hidden')}>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked && camera.target) void handlePick(camera.target, picked);
          e.target.value = '';
        }}
      />

      <StepHeader
        title={t('supportingDocuments.title')}
        description={supportingDocumentsIntro(slots, t)}
        onBack={handleBack}
      />

      {slot && (
        <div>
          <p className="sr-only" aria-live="polite">
            {index + 1} / {slots.length}: {slot.label}
          </p>
          <div key={`ahead-${index}`} className={cn(direction && 'animate-fade-in')}>
            {slots[index + 2] && <GroupEdge side="top" />}
            {nextSlot && (
              <TuckedRow
                title={nextSlot.label}
                number={index + 2}
                done={uploadFor(nextSlot.key) !== null}
                detail={
                  nextSlot.description ??
                  t(nextSlot.required ? 'supportingDocuments.card.required' : 'supportingDocuments.card.optional')
                }
              />
            )}
          </div>
          <div key={slot.key} className={cn('relative z-10', motion)}>
            <SupportingDocumentCard
              position={index + 1}
              total={slots.length}
              label={slot.label}
              description={slot.description}
              required={slot.required}
              reads={slot.reads}
              // A restored upload may carry no file name; the mediaId is what says it is there.
              fileName={uploadFor(slot.key) ? (uploadFor(slot.key)?.fileName ?? slot.label) : null}
              capture={slot.capture}
              drawn={uploadFor(slot.key)?.method === 'drawn'}
              onSign={(drawing) => void handleSign(slot.key, drawing)}
              file={files[slot.key] ?? null}
              uploading={uploadingKey === slot.key}
              error={errors[slot.key] ?? null}
              onPick={(file) => void handlePick(slot.key, file)}
              onRemove={() => handleRemove(slot.key)}
              onTakePhoto={() => camera.show(slot.key)}
            />
          </div>
          <div key={`behind-${index}`} className={cn(direction && 'animate-fade-in')}>
            {previousSlot && (
              <TuckedRow
                title={previousSlot.label}
                number={index}
                done={uploadFor(previousSlot.key) !== null}
                detail={heldBy(previousSlot.key, previousSlot.label)}
                onOpen={() => setActive(index - 1)}
              />
            )}
            {slots[index - 2] && <GroupEdge side="bottom" />}
          </div>
        </div>
      )}

      <Button
        onClick={handleContinue}
        // The open document: a required one must be provided first. On the
        // last, every required document must be.
        disabled={(slot?.required && !provided) || (last && !requiredComplete) || uploadingKey !== null}
        className="w-full"
      >
        {t(slot && !slot.required && !provided ? 'common.skip' : 'common.continue')}
      </Button>
    </div>
    </>
  );
}
