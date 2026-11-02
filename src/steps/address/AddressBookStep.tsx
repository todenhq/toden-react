'use client';

import React from 'react';
import { StepHeader } from '../../components/StepHeader';
import { Button } from '../../components/ui/button';
import { useVerificationContext } from '../../context/VerificationContext';
import { useAddressFlow } from './use-address-flow';
import { ChosenAddress } from './AddressBookParts';
import { useText } from '../../i18n';

/**
 * The picked saved address, in place of the capture steps. The person lands
 * here going back from the step after the address: they can carry on, or use a
 * different address, which brings the offer back over the first address step.
 */
export function AddressBookStep() {
  const t = useText();
  const { state, dispatch } = useVerificationContext();
  const flow = useAddressFlow();
  const chosen = state.addressBookReuse;
  if (!chosen) return null;

  const change = () => {
    dispatch({ type: 'REOPEN_ADDRESS_BOOK_OFFER' });
    dispatch({ type: 'SET_STEP', payload: flow.firstCaptureStep });
  };
  return (
    <div className="space-y-5 animate-slide-up">
      <StepHeader
        title={t('address.book.chosen.title')}
        description={t('address.book.pick.description')}
        onBack={() => flow.goBack('address-book')}
      />
      <div className="space-y-3">
        <ChosenAddress label={chosen.label} area={chosen.area} />
        <Button onClick={flow.exitForward} className="h-12 w-full rounded-xl text-base font-medium">
          {t('address.book.continue')}
        </Button>
        <Button variant="ghost" onClick={change} className="h-12 w-full rounded-xl text-base font-medium">
          {t('address.book.chosen.change')}
        </Button>
      </div>
    </div>
  );
}
