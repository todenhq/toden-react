import { describe, expect, it } from 'vitest';
import {
  keepReadingSummary,
  ownershipNoteSection,
  selectOwnershipPending,
  summaryOwnershipPending,
} from './ownership-pending';
import { stillWaiting } from '../hosted/completed-polling';
import type { CompletedSessionSummary } from '../services/api';

describe('shareholders still on their way', () => {
  it('reads ownershipPending off the register check, missing as false', () => {
    expect(selectOwnershipPending({ ownershipPending: true })).toBe(true);
    expect(selectOwnershipPending({ ownershipPending: false })).toBe(false);
    expect(selectOwnershipPending({})).toBe(false);
    expect(selectOwnershipPending(null)).toBe(false);
    expect(selectOwnershipPending(undefined)).toBe(false);
    // Anything that is not literally true is an older or confused server.
    expect(selectOwnershipPending({ ownershipPending: 'true' })).toBe(false);
  });

  it('reads keyPeopleOwnershipPending off the summary, missing as false', () => {
    expect(summaryOwnershipPending({ keyPeopleOwnershipPending: true })).toBe(true);
    expect(summaryOwnershipPending({ keyPeopleOwnershipPending: false })).toBe(false);
    expect(summaryOwnershipPending({})).toBe(false);
    expect(summaryOwnershipPending(null)).toBe(false);
  });

  it('keeps re-reading while anybody owes a check or owners are still coming', () => {
    const done = [{ status: 'verified' }, { status: 'not_needed' }];
    expect(keepReadingSummary(done, false)).toBe(false);
    expect(keepReadingSummary(done, true)).toBe(true);
    expect(keepReadingSummary([], true)).toBe(true);
    expect(keepReadingSummary([{ status: 'pending' }], false)).toBe(true);
    expect(keepReadingSummary([{ status: 'submitted' }], false)).toBe(true);
    expect(keepReadingSummary([{ status: 'failed' }], false)).toBe(true);
  });

  it('puts the step note in Shareholders, else Beneficial owners, else nowhere', () => {
    expect(ownershipNoteSection(['ubos', 'shareholders', 'representatives'])).toBe('shareholders');
    expect(ownershipNoteSection(['ubos', 'representatives'])).toBe('ubos');
    expect(ownershipNoteSection(['representatives'])).toBe(null);
  });
});

describe('the returning applicant screen', () => {
  const base = {
    status: 'completed',
    environment: 'SANDBOX',
    configSnapshot: {},
    subjectType: 'business',
    businessName: 'Acme',
    keyPeople: [],
  } as unknown as CompletedSessionSummary;

  it('keeps re-reading while owners are still coming, even with nobody owing a check', () => {
    expect(stillWaiting(base)).toBe(false);
    expect(stillWaiting({ ...base, keyPeopleOwnershipPending: true })).toBe(true);
  });

  it('stops once the application is decided, whatever the register is doing', () => {
    expect(stillWaiting({ ...base, keyPeopleOwnershipPending: true, outcome: 'declined' })).toBe(false);
    expect(stillWaiting({ ...base, keyPeopleOwnershipPending: true, cancelled: true })).toBe(false);
  });
});
