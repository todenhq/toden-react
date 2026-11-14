'use client';

import React from 'react';
import { CircleCheck, Loader2 } from './icons';
import { NFC_READ_STEPS, NFC_STEP_LABELS, nfcStepState, type NfcReadStage } from '../lib/nfc-read-stages';
import { useText } from '../i18n';

/**
 * The chip read's narration, drawn as the mobile SDKs draw it
 * (NfcReadProgress in both). Waiting for the chip is one line with a spinner;
 * once the chip is found, the steps tick off one by one, so nobody lifts the
 * document thinking nothing is happening.
 */
export function NfcReadProgress({ stage }: { stage: NfcReadStage }) {
  const t = useText();

  if (stage === 'waiting') {
    return (
      <p role="status" className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
        {t('nfc.waiting')}
      </p>
    );
  }

  return (
    <div role="status" className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">
        {stage === 'done' ? 'Chip read complete.' : 'Chip found. Keep still until this finishes.'}
      </p>
      <ul className="mx-auto w-fit space-y-2">
        {NFC_READ_STEPS.map((step) => {
          const state = nfcStepState(step, stage);
          return (
            <li key={step} className="flex items-center gap-2.5 text-sm">
              <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
                {state === 'done' ? (
                  <CircleCheck className="h-4 w-4 text-[var(--verification-success,#0DA211)]" />
                ) : state === 'active' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                )}
              </span>
              <span
                className={
                  state === 'active'
                    ? 'font-semibold text-foreground'
                    : state === 'done'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }
              >
                {NFC_STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
