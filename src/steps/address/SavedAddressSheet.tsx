'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Loader2, Mail } from '../../components/icons';
import { ContactCodeEntry } from '../ContactCodeEntry';
import { useAddressFlow } from './use-address-flow';
import { useAddressBook } from './use-address-book';
import { AddressBookSheet, SavedAddressList, SheetActions, SheetHeading, BookIcon, EnterIcon } from './AddressBookParts';
import { useText } from '../../i18n';
import { useVerificationConfig } from '../../context/VerificationConfigContext';
import { offerTitleKey } from '../../lib/address-book';

const PRIMARY = 'h-12 w-full rounded-xl text-base font-medium';

/**
 * The offer of a saved address, over the first address step. It appears only
 * when the flow's email is recognised, ahead of any presence primer (somebody
 * using a saved address never needs it), and asks for one decision: use it (a
 * code to that email, then a pick) or enter a new one. The company receives the
 * address only once the verification passes and the person is confirmed as the
 * book's owner (kyc-core address-book/reuse).
 */
export function SavedAddressSheet() {
  const t = useText();
  const config = useVerificationConfig();
  const flow = useAddressFlow();
  const book = useAddressBook();
  const [selected, setSelected] = useState<string | null>(null);

  if (book.phase !== 'offer' && book.phase !== 'code' && book.phase !== 'pick') return null;

  // One address needs no choosing: it starts selected.
  const only = book.addresses.length === 1 ? book.addresses[0]!.entryId : null;
  const picked = book.addresses.find((a) => a.entryId === (selected ?? only));
  const errorLine = book.error && (
    <p role="alert" className="text-center text-sm text-destructive">
      {book.error}
    </p>
  );
  const spinner = book.busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />;
  const enterNew = (
    <Button variant="ghost" disabled={book.busy} onClick={book.close} className={PRIMARY}>
      {t('address.book.offer.new')}
    </Button>
  );

  return (
    <AddressBookSheet onClose={book.close}>
      <div key={book.phase} className="animate-slide-up space-y-4 motion-reduce:animate-none">
        {book.phase === 'offer' ? (
          <>
            <SheetHeading
              icon={BookIcon}
              title={t(offerTitleKey(config.userData?.firstName))}
              description={t('address.book.offer.description')}
            />
            <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{t('address.book.offer.email', { email: book.email ?? '' })}</span>
            </p>
            {errorLine}
            <SheetActions>
              <Button disabled={book.busy} onClick={() => void book.sendCode()} className={PRIMARY}>
                {spinner}
                {book.busy ? t('address.book.offer.sending') : t('address.book.offer.use')}
              </Button>
              {enterNew}
            </SheetActions>
          </>
        ) : book.phase === 'code' ? (
          <>
            <SheetHeading
              icon={Mail}
              title={t('address.book.code.title')}
              description={t('address.book.code.description', { email: book.email ?? '' })}
            />
            <ContactCodeEntry
              code={book.code}
              onChange={book.setCode}
              codeLength={6}
              style="segmented"
              disabled={book.busy}
              onComplete={(value) => void book.checkCode(value)}
            />
            {errorLine}
            <SheetActions>
              <Button
                disabled={book.busy || book.code.length !== 6}
                onClick={() => void book.checkCode()}
                className={PRIMARY}
              >
                {spinner}
                {book.busy ? t('address.book.code.checking') : t('address.book.code.check')}
              </Button>
              <Button variant="ghost" disabled={book.busy} onClick={() => void book.sendCode()} className={PRIMARY}>
                {t('address.book.code.resend')}
              </Button>
            </SheetActions>
          </>
        ) : (
          <>
            <SheetHeading
              icon={EnterIcon}
              title={t('address.book.pick.title')}
              description={t('address.book.pick.description')}
            />
            {book.addresses.length > 0 ? (
              <SavedAddressList addresses={book.addresses} selected={selected ?? only} onSelect={setSelected} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">{t('address.book.pick.none')}</p>
            )}
            {book.hidden > 0 && (
              <p className="text-center text-xs text-muted-foreground">{t('address.book.pick.stale')}</p>
            )}
            {errorLine}
            <SheetActions>
              {book.addresses.length > 0 && (
                <Button
                  disabled={!picked}
                  onClick={() => {
                    if (!picked) return;
                    book.choose(picked);
                    book.close();
                    flow.exitForward();
                  }}
                  className={PRIMARY}
                >
                  {t('address.book.pick.use')}
                </Button>
              )}
              {enterNew}
            </SheetActions>
          </>
        )}
      </div>
    </AddressBookSheet>
  );
}
