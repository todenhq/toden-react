import { describe, expect, it } from 'vitest';
import { addressBookEmail, addressBookOffer, addressBookSaveBlock, offerTitleKey, reusedAddressStep, savedAddressLine, usableSavedAddresses, PRESENCE_REUSE_WINDOW_DAYS } from './address-book';
import { addressFlowOptions, addressFlowSteps } from '../steps/address/flow-steps';
import { buildStepOrder } from './step-order';

const on = { serverConfig: { addressBook: { save: true, reuse: true } } };

describe('addressBookEmail', () => {
  it('prefers the email passed in, tidied', () => {
    expect(addressBookEmail(' ada@example.com ', { emailAddress: 'b@example.com', emailToken: 't' })).toBe('ada@example.com');
  });

  it('falls back to an email proved in this flow, never one merely typed', () => {
    expect(addressBookEmail(null, { emailAddress: 'b@example.com', emailToken: 't' })).toBe('b@example.com');
    expect(addressBookEmail(undefined, { emailAddress: 'b@example.com', emailToken: null })).toBeNull();
  });

  it('offers nothing without a usable email', () => {
    expect(addressBookEmail('not-an-email', null)).toBeNull();
    expect(addressBookEmail('', undefined)).toBeNull();
  });
});

describe('addressBookOffer', () => {
  it('follows the server', () => {
    expect(addressBookOffer(on)).toEqual({ save: true, reuse: true });
    expect(addressBookOffer({ serverConfig: { addressBook: { save: false, reuse: true } } })).toEqual({ save: false, reuse: true });
    expect(addressBookOffer({})).toEqual({ save: false, reuse: false });
  });

  it('is never offered in the builder preview or for a business', () => {
    expect(addressBookOffer({ ...on, previewMode: true })).toEqual({ save: false, reuse: false });
    expect(addressBookOffer({ ...on, subjectType: 'business' })).toEqual({ save: false, reuse: false });
    expect(addressBookOffer({ ...on, subjectType: 'business', scope: 'address' })).toEqual({ save: false, reuse: false });
  });
});

describe('the address book step', () => {
  const facts = { serverSearch: true, previewMode: false, hasGoogleKey: false, hasStreetViewFrame: false };

  it('is never part of the capture steps', () => {
    expect(addressFlowSteps(addressFlowOptions(facts))).not.toContain('address-book');
  });

  it('sends the capture steps to the address book once a saved address is picked', () => {
    for (const step of ['address-search', 'address-collection', 'address-entrance', 'address-review'] as const) {
      expect(reusedAddressStep(step, true)).toBe('address-book');
      expect(reusedAddressStep(step, false)).toBe(step);
    }
    expect(reusedAddressStep('questionnaire', true)).toBe('questionnaire');
  });

  it('drops the capture steps from the progress once picked', () => {
    const base = {
      scope: 'address' as const, hasDocCapture: false, hasLiveness: false, hasCountrySelect: false,
      hasEmailVerification: false, hasPhoneVerification: false, hasPoa: false, hasSupportingDocuments: false,
      hasAddressCollection: true, hasQuestionnaire: false,
    };
    const flow = { search: true, entrance: true };
    expect(buildStepOrder({ ...base, addressFlow: flow } as never)).toEqual(
      expect.arrayContaining(['address-search', 'address-collection', 'address-review']),
    );
    expect(buildStepOrder({ ...base, addressFlow: flow } as never)).not.toContain('address-book');
    const reused = buildStepOrder({ ...base, addressFlow: { ...flow, reused: true } } as never);
    expect(reused).toContain('address-book');
    expect(reused).not.toContain('address-collection');
  });
});

describe('saving', () => {
  it('sends nothing unless the box is ticked', () => {
    expect(addressBookSaveBlock(null, { hasPhoto: true, hasDirections: true })).toEqual({});
    expect(addressBookSaveBlock({ save: false, photo: true, directions: true }, { hasPhoto: true, hasDirections: true })).toEqual({});
  });

  it('only shares a photo or directions the person gave', () => {
    expect(addressBookSaveBlock({ save: true, photo: true, directions: true }, { hasPhoto: false, hasDirections: true }))
      .toEqual({ book: { save: true, photo: false, directions: true } });
  });

  it('reads a saved address by street and area', () => {
    expect(savedAddressLine({ label: 'Bassey Street', area: 'Calabar South' })).toBe('Bassey Street, Calabar South');
    expect(savedAddressLine({ label: null, area: 'Ikeja' })).toBe('Ikeja');
  });
});

describe('usableSavedAddresses', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  const entry = (status: string | null, daysAgo: number | null): import('./address-book').SavedAddress => ({
    entryId: `adb_${status}_${daysAgo}`, label: 'Bassey Street', area: 'Calabar', countryCode: 'NG', tier: 'attested',
    presenceStatus: status,
    presenceDecidedAt: daysAgo == null ? null : new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  });

  it('keeps every saved address on a flow without a presence check', () => {
    const list = [entry(null, null), entry('verified', 400)];
    expect(usableSavedAddresses(list, false, now)).toEqual({ usable: list, hidden: 0 });
  });

  it('keeps only recent confirmed addresses on a presence flow, and counts the rest', () => {
    const recent = entry('verified', 30);
    const result = usableSavedAddresses([recent, entry('verified', 200), entry('monitoring', null), entry(null, null)], true, now);
    expect(result.usable).toEqual([recent]);
    expect(result.hidden).toBe(3);
  });

  it('treats the window edge as recent', () => {
    expect(usableSavedAddresses([entry('verified', PRESENCE_REUSE_WINDOW_DAYS)], true, now).usable).toHaveLength(1);
  });
});

describe('offerTitleKey', () => {
  it('greets the person when the host app named them', () => {
    expect(offerTitleKey('Richard')).toBe('address.book.offer.titleNamed');
  });

  it('keeps the plain title without a usable name, so no comma is left behind', () => {
    expect(offerTitleKey(undefined)).toBe('address.book.offer.title');
    expect(offerTitleKey(null)).toBe('address.book.offer.title');
    expect(offerTitleKey('   ')).toBe('address.book.offer.title');
  });
});
