'use client';

import { useState } from 'react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useVerificationConfig } from '../../context/VerificationConfigContext';
import { useText } from '../../i18n';
import { uploadSizeError } from '../../lib/upload-limits';
import { withGroupUpload, type BusinessDocumentGroup } from '../../lib/business-document-groups';
import type { BusinessDocumentKey } from '../../types/business';
import { BUSINESS_DOC_ACCEPTED_MIMES } from '../BusinessDocumentSlot';
import { readsDocumentPeople } from '../../lib/document-people';

/**
 * Uploading and removing a group's document. Each file uploads at once (type
 * 'business_document'); the group then holds that one document, replacing any
 * it had. The applicant never says which document it is: the upload names its
 * group, and the server recognises the document from its text. Until then its
 * `type` is the group's first document. Uploads ride flow state as
 * `[{ type, group, mediaId, fileName, size }]`.
 */
export function useGroupUpload() {
  const { state, dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();
  const uploads = state.businessApplication.documents;
  /** The group whose file is uploading. */
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // In-memory Files for tap-to-preview, by group (lost on remount; the mediaId is what matters).
  const [files, setFiles] = useState<Record<string, File>>({});

  const upload = async (group: BusinessDocumentGroup, file: File) => {
    setError(null);
    if (!BUSINESS_DOC_ACCEPTED_MIMES.includes((file.type.split(';')[0] || '').toLowerCase())) {
      setError(t('business.documents.errorFileType'));
      return;
    }
    const sizeError = uploadSizeError(file.type, file.size);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    setUploading(group.key);
    try {
      const mediaId = await config.api.upload(file, 'business_document');
      setFiles((prev) => ({ ...prev, [group.key]: file }));
      const type: BusinessDocumentKey = group.types[0]!.key;
      dispatch({
        type: 'SET_BUSINESS_APPLICATION',
        payload: {
          documents: withGroupUpload(group, state.businessApplication.documents, {
            type,
            group: group.key,
            mediaId,
            fileName: file.name,
            size: file.size,
          }),
        },
      });
      readPeople(group, mediaId);
    } catch {
      setError(t('business.documents.errorUpload'));
    } finally {
      setUploading(null);
    }
  };

  /**
   * Read the upload for the people it names, in the background, so the
   * key-people step opens with them. Best-effort: any failure leaves the step
   * as it always was, and the document is checked again at submission.
   */
  const readPeople = (group: BusinessDocumentGroup, mediaId: string) => {
    const sessionId = state.sessionId;
    const country = state.business.country || config.business?.country;
    if (!sessionId || !country || !readsDocumentPeople(config.business, group)) return;
    dispatch({ type: 'DOCUMENT_PEOPLE_READING', payload: { mediaId } });
    const number = state.business.registrationNumber.trim();
    const name = state.business.registrationName.trim();
    config.api
      .businessDocumentPeople({
        sessionId,
        mediaId,
        group: group.key,
        country,
        ...(number ? { registrationNumber: number } : {}),
        ...(name ? { registrationName: name } : {}),
      })
      .then((res) => dispatch({ type: 'DOCUMENT_PEOPLE_READ', payload: { mediaId, people: res.read ? res.people ?? [] : null } }))
      .catch(() => dispatch({ type: 'DOCUMENT_PEOPLE_READ', payload: { mediaId, people: null } }));
  };

  const remove = (group: BusinessDocumentGroup) => {
    setError(null);
    dispatch({
      type: 'SET_BUSINESS_APPLICATION',
      payload: { documents: uploads.filter((d) => !group.types.some((x) => x.key === d.type)) },
    });
  };

  return { uploads, uploading, error, clearError: () => setError(null), files, upload, remove };
}
