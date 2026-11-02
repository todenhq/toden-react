'use client';

import { useCallback, useEffect, useState } from 'react';
import { useVerificationConfig } from '../../context/VerificationConfigContext';
import { useVerificationContext } from '../../context/VerificationContext';
import { VerificationApiError } from '../../services/api';
import { addressBookEmail, addressBookOffer, usableSavedAddresses, type SavedAddress } from '../../lib/address-book';
import { useText } from '../../i18n';

// The saved address offer's state machine: lookup → offer → code → pick, or
// closed. It is a sheet over the first address step, not a step: the email
// comes from the flow (lib/address-book.ts), the server says whether it has an
// address this flow can take, and nothing shows when it does not. Closing is
// kept in the flow's state, so a person who chose to enter an address is not
// asked again on the way back.

export type AddressBookPhase = 'idle' | 'checking' | 'offer' | 'code' | 'pick' | 'closed';

export function useAddressBook() {
  const config = useVerificationConfig();
  const { state, dispatch } = useVerificationContext();
  const t = useText();
  const refused = state.addressBookReuseRefused;
  const [phase, setPhase] = useState<AddressBookPhase>(
    refused ? 'offer' : state.addressBookOfferClosed ? 'closed' : 'idle',
  );
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [grant, setGrant] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  // Saved addresses this flow cannot take (a presence flow needs a recent verdict).
  const [hidden, setHidden] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(refused ? t('address.book.refused') : null);

  const email = addressBookEmail(config.userData?.email, state.contact);
  const reuse = addressBookOffer(config).reuse;
  const presence = config.addressCollection?.presence?.enabled === true;
  const { api } = config;

  const fail = (err: unknown) =>
    setError(err instanceof VerificationApiError && err.statusCode < 500 ? err.message : t('address.book.error'));

  /** Ask once whether the email has an address to offer. Silent either way. */
  useEffect(() => {
    if (!reuse || !email || phase !== 'idle') return;
    let live = true;
    setPhase('checking');
    void api
      .addressBookLookup(email, presence)
      .then((r) => r.recognised)
      .catch(() => false)
      .then((recognised) => {
        if (live) setPhase(recognised ? 'offer' : 'closed');
      });
    return () => {
      live = false;
    };
  }, [api, email, phase, presence, reuse]);

  /** Send the code (the offer's yes, and Send a new code). */
  const sendCode = async () => {
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.addressBookCode(email);
      setChallengeId(res.challengeId);
      setCode('');
      setPhase('code');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (value = code) => {
    if (!challengeId || value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.addressBookAddresses(challengeId, value);
      setGrant(res.grant);
      const listed = usableSavedAddresses(res.addresses, presence);
      setAddresses(listed.usable);
      setHidden(listed.hidden);
      setPhase('pick');
    } catch (err) {
      setCode('');
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  /** Keep the chosen saved address; the capture steps are skipped. */
  const choose = (entry: SavedAddress) => {
    if (!grant) return;
    dispatch({
      type: 'SET_ADDRESS_BOOK_REUSE',
      payload: { grant, entryId: entry.entryId, label: entry.label, area: entry.area },
    });
  };

  /** The person will enter an address: the offer stays closed. */
  const close = useCallback(() => {
    setError(null);
    setPhase('closed');
    dispatch({ type: 'CLOSE_ADDRESS_BOOK_OFFER' });
  }, [dispatch]);

  return {
    phase,
    email,
    code,
    setCode,
    addresses,
    hidden,
    chosen: state.addressBookReuse,
    busy,
    error,
    sendCode,
    checkCode,
    choose,
    close,
  };
}
