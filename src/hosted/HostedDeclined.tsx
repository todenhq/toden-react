'use client';

import React, { useEffect } from 'react';
import { VerificationProvider, useVerificationContext } from '../context/VerificationContext';
import { VerificationConfigProvider, type ServerSdkConfig } from '../context/VerificationConfigContext';
import { VerificationModal } from '../components/VerificationModal';
import type { AnyCountry, VerificationAppearance } from '../types/config';
import type { VerificationApi } from '../services/api';
import type { SessionDeclined } from '../lib/session-declined';

// A hosted session the server declined, reopened (the bootstrap answered 409
// session_declined). Drawn in the same modal as the flow, opening straight on
// its declined screen, so a reload looks exactly like the moment it ended
// rather than a bare page. The server sends no workflow for a declined
// session, so the modal runs on the appearance the page already has and an
// empty, ready server config: nothing here may fetch or advance.

/** The reducer's open flag, in step with the modal rendered open below. */
function MarkOpen() {
  const { dispatch } = useVerificationContext();
  useEffect(() => {
    dispatch({ type: 'OPEN_MODAL' });
  }, [dispatch]);
  return null;
}

const SERVER_CONFIG: ServerSdkConfig = { status: 'ready', idTypes: [] };

export function HostedDeclined({
  token,
  api,
  declined,
  appearance,
  embedded = false,
  onClose,
}: {
  token: string;
  api: VerificationApi;
  declined: SessionDeclined;
  appearance?: VerificationAppearance;
  /** Inside a host application: the modal and its Close work through onClose. */
  embedded?: boolean;
  onClose?: () => void;
}) {
  // No onError here: the hosted page already reported the refusal once.
  return (
    <VerificationProvider initialDeclined={declined}>
      <VerificationConfigProvider
        apiKey={`hs_${token}`}
        apiOverride={api}
        serverConfigOverride={SERVER_CONFIG}
        hostedMode={!embedded}
        onClose={onClose}
        appearance={appearance}
        // A declined session sends no workflow, so there is no country, and
        // nothing on the declined screen reads one (as HostedCompleted, whose
        // snapshot may lack it too).
        country={undefined as unknown as AnyCountry}
      >
        <MarkOpen />
        <VerificationModal
          open
          onClose={embedded ? () => onClose?.() : () => undefined}
          disableClose={!embedded}
        />
      </VerificationConfigProvider>
    </VerificationProvider>
  );
}
