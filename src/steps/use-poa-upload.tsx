'use client';

import React, { useRef, useState } from 'react';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useVerificationContext } from '../context/VerificationContext';
import { useText } from '../i18n';
import { PhotoCamera } from '../components/PhotoCamera';
import { usePhotoCamera } from '../hooks/usePhotoCamera';
import { PHOTO_COPY, photoFileName } from '../lib/photo-mode';
import { isPdfMime, uploadSizeError } from '../lib/upload-limits';
import type { PoaDocumentType } from '../types/config';

const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * The Proof of Address upload, split from the step (200-line rule): the hidden
 * file input, the SDK's own camera for "Take a photo" (components/PhotoCamera,
 * on a desktop as on a phone), the type and size checks, the upload, and the
 * in-memory File the uploaded card previews (lost on remount; the card then
 * degrades cleanly).
 */
export function usePoaUpload(kind: PoaDocumentType) {
  const config = useVerificationConfig();
  const { dispatch } = useVerificationContext();
  const t = useText();
  const fileInput = useRef<HTMLInputElement>(null);
  const camera = usePhotoCamera();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!ACCEPTED_MIMES.includes((file.type.split(';')[0] || '').toLowerCase())) {
      setError(t('proofOfAddress.error.fileType'));
      return;
    }
    if (uploadSizeError(file.type, file.size)) {
      setError(t(isPdfMime(file.type) ? 'proofOfAddress.error.pdfTooLarge' : 'proofOfAddress.error.imageTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const mediaId = await config.api.upload(file, 'proof_of_address');
      setPickedFile(file);
      dispatch({ type: 'SET_MEDIA_ID', payload: { mediaType: 'proofOfAddress', mediaId } });
      dispatch({ type: 'SET_POA_DOCUMENT', payload: { documentType: kind, fileName: file.name } });
    } catch {
      setError(t('proofOfAddress.error.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void upload(file);
    event.target.value = '';
  };

  const inputs = (
    <>
      <input ref={fileInput} type="file" accept={ACCEPTED_MIMES.join(',')} className="hidden" onChange={onPicked} />
    </>
  );

  const pickFile = () => fileInput.current?.click();
  // The camera's Upload is the step's own file chooser, left out of the camera
  // when the workflow wants a photo taken; it stays the way out when the
  // camera cannot run, as a desktop without one used to get the chooser.
  const cameraView = camera.open ? (
    <PhotoCamera
      title={t('proofOfAddress.title')}
      instruction={PHOTO_COPY.fitDocument}
      fileName={photoFileName(t('proofOfAddress.title'))}
      onPhoto={(file) => void upload(file)}
      onDismiss={camera.dismiss}
      onUpload={config.proofOfAddress?.capture === 'camera' ? null : pickFile}
      onUploadInstead={pickFile}
    />
  ) : null;

  return {
    inputs,
    /** The camera, while open; the step hides its own content under it. */
    cameraView,
    cameraOpen: camera.open,
    uploading,
    error,
    pickedFile,
    pickFile,
    takePhoto: () => camera.show(null),
    upload: (file: File) => void upload(file),
    clear: () => {
      setPickedFile(null);
      dispatch({ type: 'CLEAR_POA_DOCUMENT' });
    },
  };
}
