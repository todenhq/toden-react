'use client';

import React, { useEffect, useState } from 'react';
import { StepHeader } from '../components/StepHeader';
import { NfcScanIllustration } from '../components/NfcScanIllustration';
import { NfcReadProgress } from '../components/NfcReadProgress';
import { NfcIntro } from '../components/NfcIntro';
import { isPassportId } from '../lib/nfc-intro';
import { previewStageAt, type NfcReadStage } from '../lib/nfc-read-stages';
import { Button } from '../components/ui/button';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { stepAfterCapture } from '../lib/post-capture';
import { verifiedIdsFromState } from '../lib/supporting-documents';
import { useText } from '../i18n';

/**
 * NFC Chip Verification screen — the eMRTD chip read (e-passports & chip
 * eIDs). The WEB SDK never puts this step in the flow order: browsers can't
 * speak ISO-DEP, so chip reading is the native (mobile) SDKs' job. It exists
 * here as the visual reference the dashboard's builder preview drives to
 * (`previewStep="nfc"`) — the mobile SDK renders the visually-identical
 * screen, so what the builder shows is what end users get.
 */
export function NfcStep() {
  const { state, dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();

  const hasLiveness =
    config.enableSelfie !== false &&
    (state.selectedIdType
      ? config.getIdTypeFeatures(config.country, state.selectedIdType)?.livenessCheck ?? config.enableLiveness !== false
      : config.enableLiveness !== false);

  const advance = () => {
    if (hasLiveness) {
      dispatch({ type: 'SET_STEP', payload: 'liveness' });
      return;
    }
    const next = stepAfterCapture(config, verifiedIdsFromState(state, config));
    if (next === 'submitted') {
      dispatch({ type: 'SUBMIT_VERIFICATION' });
    } else {
      dispatch({ type: 'SET_STEP', payload: next });
    }
  };

  const allowSkip = config.nfc?.allowSkip === true;
  // The explanation first, as on a phone: the read waits for Continue.
  const [introDone, setIntroDone] = useState(false);
  const stage = usePreviewRead(config.previewMode === true && introDone);
  const header = (
    <StepHeader
      title={t('nfc.title')}
      description={t('nfc.description')}
      onBack={() => dispatch({ type: 'SET_STEP', payload: 'document-capture' })}
    />
  );

  if (!introDone) {
    return (
      <div className="space-y-6 animate-slide-up">
        {header}
        {/* The preview has no photo-page code to read, so it shows the common
            case: capture already read it. */}
        <NfcIntro
          passport={isPassportId(state.selectedIdType)}
          needsCode={false}
          onContinue={() => setIntroDone(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {header}

      <NfcScanIllustration />

      {/* The read as the phone narrates it: waiting for the chip, then each
          step ticking off. The note that computers and phones without NFC
          skip this step is the org's to know, so it lives in the builder's
          chip panel, not on the applicant's screen. */}
      <NfcReadProgress stage={stage} />

      {/* The builder's way to the next step. On a phone, Continue only comes
          once the chip has been read, on the screen with its photo. */}
      {config.previewMode && (
        <Button onClick={advance} className="w-full h-12 rounded-xl text-base font-medium">
          {t('common.continue')}
        </Button>
      )}
      {/* Skip affordance — shown when the workflow allows it, so a user whose
          phone can't read the chip can still proceed. The native SDKs also
          auto-skip on devices with no NFC radio; this is the manual escape
          hatch on NFC-capable phones. */}
      {allowSkip && (
        <Button
          variant="ghost"
          onClick={advance}
          className="w-full h-11 rounded-xl text-sm font-medium text-muted-foreground"
        >
          {t('nfc.skip')}
        </Button>
      )}
    </div>
  );
}

/**
 * The builder preview plays the read once, as it unfolds on a phone: the wait
 * for the chip, then each step, ending read. Outside the preview there is no
 * read to show, so the screen holds on the wait.
 */
function usePreviewRead(preview: boolean): NfcReadStage {
  const [stage, setStage] = useState<NfcReadStage>('waiting');
  useEffect(() => {
    if (!preview) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const next = previewStageAt(Date.now() - started);
      setStage(next);
      if (next === 'done') clearInterval(timer);
    }, 150);
    return () => clearInterval(timer);
  }, [preview]);
  return stage;
}
