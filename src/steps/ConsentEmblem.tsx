'use client';

import React, { useState } from 'react';
import { ShieldCheck } from '../components/icons';
import { TodenMark } from '../components/TodenWordmark';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useBranding } from '../hooks/useBranding';
import { useTodenMarkColours } from '../lib/use-toden-mark-colours';
import { effectiveTrustAttribution, needsProcessorDisclosure } from '../lib/trust-attribution';

/**
 * The mark over the consent title: Toden's split shield on a plain muted
 * square, in the colours the footer draws it in (lib/use-toden-mark-colours.ts):
 * the ink chosen for the sheet's background, the right half Toden's purple. No
 * border, gradient, glow, motion or shadow: the words below carry the screen.
 *
 * Where the organisation's own logo replaces Toden's in the footer (a paid
 * custom attribution), its logo sits on the square instead, never Toden's mark,
 * and a shield when it has none.
 */
export function ConsentEmblem() {
  const config = useVerificationConfig();
  const { logo } = useBranding();
  const [logoFailed, setLogoFailed] = useState(false);
  const attribution = effectiveTrustAttribution(
    config.serverConfig?.branding?.trustAttribution,
    config.previewTrustAttribution,
    config.previewMode,
  );
  const whiteLabel = needsProcessorDisclosure(attribution);
  const mark = useTodenMarkColours();

  return (
    <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-muted text-primary" style={whiteLabel ? undefined : { color: mark.ink }}>
      {!whiteLabel ? (
        <TodenMark className="h-9 w-9" accent={mark.accent} />
      ) : logo && !logoFailed ? (
        <img src={logo} alt="" className="h-9 w-9 object-contain" onError={() => setLogoFailed(true)} />
      ) : (
        <ShieldCheck className="h-8 w-8" />
      )}
    </span>
  );
}
