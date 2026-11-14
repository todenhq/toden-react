import { describe, expect, it } from 'vitest';
import { defaultText } from '../i18n/translate';
import {
  attemptsLeftLine,
  isCountedLivenessFailure,
  livenessAttemptsLimit,
  livenessFailedResult,
} from './liveness-attempts';

// A workflow's maxLivenessAttempts: each failed check is reported to
// POST /liveness/failed and the answer says how many tries are left.

describe('reading the answer', () => {
  it('keeps a limited answer with its count', () => {
    expect(livenessFailedResult({ limited: true, attemptsLeft: 2 })).toEqual({ limited: true, attemptsLeft: 2 });
    expect(livenessFailedResult({ limited: true, attemptsLeft: 1 })).toEqual({ limited: true, attemptsLeft: 1 });
    // The rare race: the session ended some other way meanwhile.
    expect(livenessFailedResult({ limited: true, attemptsLeft: 0 })).toEqual({ limited: true, attemptsLeft: 0 });
  });

  it('reads no limit as no limit', () => {
    expect(livenessFailedResult({ limited: false })).toEqual({ limited: false });
  });

  it('reads anything unusable as no limit, which changes nothing', () => {
    for (const raw of [null, undefined, '', 'ok', {}, { limited: 'yes' }, { limited: true }, { limited: true, attemptsLeft: '2' }, { limited: true, attemptsLeft: Number.NaN }]) {
      expect(livenessFailedResult(raw)).toEqual({ limited: false });
    }
    expect(livenessFailedResult({ limited: true, attemptsLeft: -1 })).toEqual({ limited: true, attemptsLeft: 0 });
    expect(livenessFailedResult({ limited: true, attemptsLeft: 1.7 })).toEqual({ limited: true, attemptsLeft: 1 });
  });
});

describe("the workflow's limit", () => {
  it('is set by a whole number from 1 to 3', () => {
    expect(livenessAttemptsLimit({ maxLivenessAttempts: 1 })).toBe(1);
    expect(livenessAttemptsLimit({ maxLivenessAttempts: 3 })).toBe(3);
    expect(livenessAttemptsLimit({ maxLivenessAttempts: 5 })).toBe(3);
  });

  it('is off only when the workflow says false', () => {
    expect(livenessAttemptsLimit({ maxLivenessAttempts: false })).toBeNull();
  });

  it('is the default of 3 otherwise', () => {
    expect(livenessAttemptsLimit({})).toBe(3);
    expect(livenessAttemptsLimit({ maxLivenessAttempts: undefined })).toBe(3);
    expect(livenessAttemptsLimit({ maxLivenessAttempts: 0 })).toBe(3);
    expect(livenessAttemptsLimit({ maxLivenessAttempts: 2.5 })).toBe(3);
    expect(livenessAttemptsLimit({ maxLivenessAttempts: '2' })).toBe(3);
  });
});

describe('which failures are reported', () => {
  it('counts a failed check', () => {
    for (const reason of ['timeout', 'face_lost', 'flash_failed', 'face_swap']) {
      expect(isCountedLivenessFailure(reason)).toBe(true);
    }
  });

  it("never counts the device's own trouble", () => {
    for (const reason of ['no_camera', 'load_error', 'something_else', '', null, undefined]) {
      expect(isCountedLivenessFailure(reason)).toBe(false);
    }
  });
});

describe('the attempts left line', () => {
  it('says how many tries are left', () => {
    expect(attemptsLeftLine({ limited: true, attemptsLeft: 1 }, defaultText)).toBe('1 attempt left.');
    expect(attemptsLeftLine({ limited: true, attemptsLeft: 2 }, defaultText)).toBe('2 attempts left.');
  });

  it('says nothing without a limit, with none left, or before the answer', () => {
    expect(attemptsLeftLine({ limited: true, attemptsLeft: 0 }, defaultText)).toBeNull();
    expect(attemptsLeftLine({ limited: false }, defaultText)).toBeNull();
    expect(attemptsLeftLine(null, defaultText)).toBeNull();
  });
});
