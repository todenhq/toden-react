'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { useVerificationContext } from '../../context/VerificationContext';
import { NO_SAVE } from '../../lib/address-book';
import { AddressBookSheet, SheetActions, SheetHeading, BookIcon, EnterIcon } from './AddressBookParts';
import { useText } from '../../i18n';

const BUTTON = 'h-12 w-full rounded-xl text-base font-medium';

/**
 * Asked once the person confirms their address: keep it in their Toden address
 * book? Saving is their choice, so nothing happens until they answer. The
 * entrance photo is part of a saved address and the sheet says so; the
 * directions stay a choice of their own. Closing it keeps them on the review;
 * "Not now" carries on without saving.
 */
export function SaveAddressSheet({
  line,
  onClose,
  onDecided,
}: {
  line: string;
  onClose: () => void;
  /** The answer is stored; the confirmation carries on. */
  onDecided: () => void;
}) {
  const t = useText();
  const { state, dispatch } = useVerificationContext();
  const [withDirections, setWithDirections] = useState(false);
  const hasDirections = Boolean(state.address?.directions?.trim());
  const hasPhoto = Boolean(state.mediaIds.addressPhoto);
  const preview = state.addressPhotoPreview;

  const decide = (save: boolean) => {
    dispatch({
      type: 'SET_ADDRESS_BOOK_SAVE',
      payload: save ? { save: true, photo: true, directions: withDirections } : NO_SAVE,
    });
    onClose();
    onDecided();
  };

  return (
    <AddressBookSheet onClose={onClose}>
      <div className="space-y-4">
        <SheetHeading
          icon={BookIcon}
          title={t('address.book.save.title')}
          description={t('address.book.save.description')}
        />
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          {preview ? (
            <img src={preview} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <EnterIcon className="h-5 w-5" aria-hidden />
            </span>
          )}
          <span className="min-w-0">
            <span className="line-clamp-2 block text-sm font-medium">{line}</span>
            {hasPhoto && <span className="mt-0.5 block text-xs text-muted-foreground">{t('address.book.save.photo')}</span>}
          </span>
        </div>
        {hasDirections && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <Checkbox checked={withDirections} onCheckedChange={(value) => setWithDirections(value === true)} />
            {t('address.book.save.directions')}
          </label>
        )}
        <SheetActions>
          <Button onClick={() => decide(true)} className={BUTTON}>
            {t('address.book.save.confirm')}
          </Button>
          <Button variant="ghost" onClick={() => decide(false)} className={BUTTON}>
            {t('address.book.save.skip')}
          </Button>
        </SheetActions>
      </div>
    </AddressBookSheet>
  );
}
