// The chip read, stage by stage, as the mobile SDKs narrate it (React Native
// `emrtd/stages.ts`, Flutter `NfcReadStage`). The web SDK never reads a chip;
// these drive the builder preview, so what an org sees is the read its
// applicants watch on their phones. Labels match the mobile SDKs word for word.

export type NfcReadStage =
  | 'waiting'
  | 'authenticating'
  | 'readingData'
  | 'readingSecurity'
  | 'readingPhoto'
  | 'done';

/** The steps listed once the chip is found (`waiting` has its own line). */
export const NFC_READ_STEPS = ['authenticating', 'readingData', 'readingSecurity', 'readingPhoto'] as const;

const ORDER: NfcReadStage[] = ['waiting', ...NFC_READ_STEPS, 'done'];

export const NFC_STEP_LABELS: Record<(typeof NFC_READ_STEPS)[number], string> = {
  authenticating: 'Unlocking the chip',
  readingData: 'Reading document details',
  readingSecurity: 'Reading security data',
  readingPhoto: 'Reading photo',
};

/** Where `step` stands while the read is at `current`. */
export function nfcStepState(step: NfcReadStage, current: NfcReadStage): 'done' | 'active' | 'pending' {
  if (current === 'done' || ORDER.indexOf(current) > ORDER.indexOf(step)) return 'done';
  return current === step ? 'active' : 'pending';
}

/** How long the preview holds the wait for the chip, then each step. */
export const PREVIEW_WAIT_MS = 2000;
export const PREVIEW_STEP_MS = 900;

/** The preview's stage `elapsed` ms in: the wait, each step once, then done. */
export function previewStageAt(elapsed: number): NfcReadStage {
  if (elapsed < PREVIEW_WAIT_MS) return 'waiting';
  const step = Math.floor((elapsed - PREVIEW_WAIT_MS) / PREVIEW_STEP_MS);
  return NFC_READ_STEPS[step] ?? 'done';
}
