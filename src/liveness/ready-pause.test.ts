import { describe, expect, it } from 'vitest';
import { READY_PAUSE_MS, readyPauseShare, readyPauseStep } from './ready-pause';

describe('the pause before the first gesture', () => {
  it('does not ask for a gesture the moment the face is in place', () => {
    expect(readyPauseStep(null, 1000)).toEqual({ readyAt: 1000, go: false });
  });

  it('holds for the whole pause, then asks', () => {
    expect(readyPauseStep(1000, 1000 + READY_PAUSE_MS - 1).go).toBe(false);
    expect(readyPauseStep(1000, 1000 + READY_PAUSE_MS)).toEqual({ readyAt: null, go: true });
  });

  it('is long enough to settle and listen: over a second', () => {
    expect(READY_PAUSE_MS).toBeGreaterThanOrEqual(1000);
  });

  it('fills its part of the line as it runs, and none before it starts', () => {
    expect(readyPauseShare(null, 5000)).toBe(0);
    expect(readyPauseShare(1000, 1000 + READY_PAUSE_MS / 2)).toBeCloseTo(0.5);
    expect(readyPauseShare(1000, 1000 + READY_PAUSE_MS * 3)).toBe(1);
  });
});
