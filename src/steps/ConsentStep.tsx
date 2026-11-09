'use client';

import { configScope, isFaceScope, isScopedBusiness } from '../lib/scope';
import React from 'react';
import { Lock, RotateCcw } from '../components/icons';
import { Button } from '../components/ui/button';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { useText } from '../i18n';
import { isBusinessFlow } from '../lib/business';
import { firstStepAfterConsent } from '../lib/contact-steps';
import { resubmitNote } from '../lib/resubmit';
import { documentCaptureNeedsCamera } from '../lib/document-capture-methods';
import { hasApplicantVerification } from '../lib/business-application';
import { MobileHandoffSheet } from '../components/MobileHandoffSheet';
import { consentDescription, consentMinutes, consentProcessSteps, consentTitle } from './consent-copy';
import { ConsentLegalNotice } from './ConsentLegalNotice';
import { ConsentJourney } from './ConsentJourney';
import { ConsentEmblem } from './ConsentEmblem';

export function ConsentStep() {
  const { dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  // The KYB application flow; a SCOPED business workflow is not one (it runs
  // its scope's own steps), so the scope is read first, whoever it is about.
  const isBusiness = isBusinessFlow(config);
  const scope = configScope(config);
  const scopedBusiness = isScopedBusiness(config);
  const faceScope = isFaceScope(scope);
  const t = useText();
  // Tokens fill from userData. Business details aren't collected until after
  // consent, so {businessName} resolves here only when the integrator passes it.
  const copyCase = { isBusiness, scope, scopedBusiness };
  const title = consentTitle(
    { ...copyCase, firstName: config.userData?.firstName, legacy: config.consent?.title },
    t,
  );

  const handleContinue = () => {
    // Contact-verification steps (when enabled) come first — a cheap
    // pre-filter before capture/registry spend. Then business flows go to the
    // details form; multi-region individual flows pick the country; single-
    // region goes straight to the ID-type list.
    dispatch({
      type: 'SET_STEP',
      payload: firstStepAfterConsent({ ...config, subjectTypeIsBusiness: isBusiness }),
    });
  };

  // The consent notice must describe THIS flow, not the product. Claiming
  // facial recognition on a flow with no selfie step would be a false statement
  // in a legal notice — and the reverse (recording video without saying so) is
  // the failure that actually matters. Both are derived, never assumed.
  const capturesFace = isBusiness
    ? hasApplicantVerification(config.business)
    : faceScope || (!scope && config.enableSelfie !== false);
  const recordsVideo =
    // Only the camera scan records the document: a photo picked from the device
    // (upload-only document capture) carries no video.
    capturesFace || (!isBusiness && !scope && documentCaptureNeedsCamera(config));

  const steps = consentProcessSteps(config, copyCase, t);
  const description = consentDescription(
    { ...copyCase, legacy: config.consent?.description, minutes: consentMinutes(steps) },
    t,
  );

  // A reviewer sent this applicant back. Say so, and say why — the note is the
  // only thing on screen that explains a flow which has silently lost most of
  // its steps. Rendered ABOVE the title so it is read before the instructions.
  const redoNote = resubmitNote(config.resubmit);

  return (
    <div className="space-y-6 animate-slide-up">
      {redoNote && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {t('welcome.redo.title')}
            </p>
            <p className="text-sm leading-relaxed text-foreground/80">{redoNote}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center space-y-4 text-center">
        <ConsentEmblem />
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-semibold leading-tight tracking-tight">{title}</h2>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <ConsentJourney steps={steps} heading={t('welcome.process.heading')} />

      <div className="space-y-3">
        {/* The notice sits IMMEDIATELY above the button it describes: consent is
            given by acting, so the disclosure has to be adjacent to the act for
            that consent to be informed. The notice names this button
            ("By tapping Continue"), so its label stays Continue. */}
        <div className="rounded-xl bg-muted/50 px-3.5 pt-3">
          <ConsentLegalNotice isBusiness={isBusiness || scopedBusiness} capturesFace={capturesFace} recordsVideo={recordsVideo} />
        </div>

        <Button onClick={handleContinue} className="w-full">
          {t('common.continue')}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
          {t('welcome.secureNote')}
        </p>
        {/* No camera in the business flow — nothing to hand off to a phone for. */}
        {!isBusiness && (
          <div className="flex justify-center pt-1">
            <MobileHandoffSheet />
          </div>
        )}
      </div>
    </div>
  );
}
