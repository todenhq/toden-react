import { describe, expect, it } from 'vitest';
import { PREVIEW_STEP_MS, PREVIEW_WAIT_MS, nfcStepState, previewStageAt } from './nfc-read-stages';

describe('the builder preview of the chip read', () => {
  it('waits for the chip, takes each step once, then holds on read', () => {
    expect(previewStageAt(0)).toBe('waiting');
    expect(previewStageAt(PREVIEW_WAIT_MS)).toBe('authenticating');
    expect(previewStageAt(PREVIEW_WAIT_MS + PREVIEW_STEP_MS)).toBe('readingData');
    expect(previewStageAt(PREVIEW_WAIT_MS + 3 * PREVIEW_STEP_MS)).toBe('readingPhoto');
    expect(previewStageAt(PREVIEW_WAIT_MS + 4 * PREVIEW_STEP_MS)).toBe('done');
    expect(previewStageAt(60_000)).toBe('done');
  });

  it('ticks off the steps behind the current one and every step once read', () => {
    expect(nfcStepState('authenticating', 'readingData')).toBe('done');
    expect(nfcStepState('readingData', 'readingData')).toBe('active');
    expect(nfcStepState('readingPhoto', 'readingData')).toBe('pending');
    expect(nfcStepState('readingPhoto', 'done')).toBe('done');
  });
});
