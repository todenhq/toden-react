import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HostedFlow } from './HostedFlow';
import { createVerificationApi, type HandoffBootstrapResponse } from '../services/api';

// Incident 2026-11-23: @toden/react 4.4.0 made HostedSessionSync read the
// flow's config (which countries a resumed session may restore), but HostedFlow
// still rendered it above VerificationConfigProvider. Every hosted link that
// bootstrapped threw "useVerificationConfig must be used within a
// <VerificationConfigProvider>" and showed "Something went wrong".
//
// A server render runs every component's hooks with no effects and no network,
// so it fails the same way the browser did if anything in the hosted tree reads
// a context it is not inside.

const bootstrap = (progress?: unknown) =>
  ({
    sessionId: 'sess_test',
    environment: 'SANDBOX',
    idTypes: [],
    configSnapshot: { country: 'NG', countries: [{ country: 'NG' }] },
    ...(progress ? { progress } : {}),
  }) as unknown as HandoffBootstrapResponse;

const mount = (b: HandoffBootstrapResponse) =>
  renderToStaticMarkup(
    <HostedFlow token="sTestToken" api={createVerificationApi('', 'hs_sTestToken')} bootstrap={b} />,
  );

describe('HostedFlow', () => {
  it('renders a fresh hosted session without a provider error', () => {
    expect(() => mount(bootstrap())).not.toThrow();
  });

  it('renders a resumed hosted session without a provider error', () => {
    expect(() => mount(bootstrap({ step: 'id-type', country: 'NG' }))).not.toThrow();
  });
});
