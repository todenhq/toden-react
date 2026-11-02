'use client';

import { useEffect, useRef } from 'react';
import { useVerificationContext } from '../context/VerificationContext';
import { prefillKeyPeople, shouldPrefill } from '../lib/key-people-prefill';
import {
  documentPeopleCount,
  documentPeopleReading,
  mergeDocumentPeople,
  pendingDocumentPeople,
} from '../lib/document-people';
import { withoutRemovedDocuments } from '../lib/document-people-sources';
import type { KeyPersonEntry } from '../context/types';

/**
 * What the key-people step opens with.
 *
 * First the register's own officer list, so the step is a confirmation rather
 * than a memory test: once only, and never over anything typed, since an
 * applicant who has already entered a name has told us something the register
 * did not. Then the people the company's own documents name (read as each was
 * uploaded, lib/document-people.ts), merged once per document: someone already
 * listed gains what was missing, anyone else is added for the applicant to
 * confirm. A read that finishes while the step is open is merged when it lands.
 * And the people of a document the applicant has since removed or replaced
 * are taken back out (lib/document-people-sources.ts). One dispatch for all
 * three, so none overwrites another.
 */
export function useKeyPeoplePrefill(rows: KeyPersonEntry[], defaultCountry: string) {
  const { state, dispatch } = useVerificationContext();
  const prefilled = useRef(false);
  const officers = state.businessCheck.keyPeople;
  const app = state.businessApplication;
  const pending = pendingDocumentPeople(app);
  const pendingKey = pending.join(',');
  const uploadedKey = app.documents.map((d) => d.mediaId).join(',');

  useEffect(() => {
    const uploaded = new Set(app.documents.map((d) => d.mediaId));
    const pruned = withoutRemovedDocuments(rows, uploaded);
    const fromRegister = !prefilled.current && officers.length > 0 && shouldPrefill(pruned.rows);
    if (!fromRegister && pending.length === 0 && pruned.rows === rows) return;
    let next = pruned.rows;
    if (fromRegister) {
      prefilled.current = true;
      next = prefillKeyPeople(officers, defaultCountry);
    }
    for (const mediaId of pending) {
      next = mergeDocumentPeople(next, app.documentPeople?.[mediaId] ?? [], defaultCountry, mediaId).rows;
    }
    // A removed document's people may be read again if it comes back.
    const applied = [...(app.documentPeopleApplied ?? []), ...pending].filter((m) => uploaded.has(m));
    dispatch({ type: 'SET_BUSINESS_APPLICATION', payload: { keyPeople: next, documentPeopleApplied: applied } });
    // rows/app are intentionally out of the dep list: this must run on the
    // arrival of officers or of a document's people, not on every edit the
    // applicant then makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officers, defaultCountry, pendingKey, uploadedKey]);

  return {
    /** People the documents named, already in the list. */
    fromDocuments: documentPeopleCount(app),
    /** A document is still being read for its people. */
    readingDocuments: documentPeopleReading(app),
    /** A read has landed whose people are not in the list yet. */
    merging: pending.length > 0,
    /** People kept from a removed document because the applicant had changed them. */
    keptFromRemoved: rows.filter((r) => r.documentRemoved).length,
  };
}
