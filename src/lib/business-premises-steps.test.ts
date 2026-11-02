import { describe, expect, it } from 'vitest';
import { buildStepOrder, type StepOrderOptions } from './step-order';
import { prevBusinessStep } from './business-application';
import { addressSubmission } from '../steps/address-submission';

// A KYB premises runs the same address steps as a person's address since
// 2026-10-18 (search, pin, entrance, review), and the business submission
// sends the pin it collects.

const business = (over: Partial<StepOrderOptions> = {}): StepOrderOptions => ({
  isBusiness: true,
  business: { country: 'NG', documents: { enabled: true, types: [{ key: 'proof_of_address', required: true }] } } as never,
  hasDocCapture: false,
  hasLiveness: false,
  hasCountrySelect: false,
  hasEmailVerification: false,
  hasPhoneVerification: false,
  hasPoa: false,
  hasSupportingDocuments: false,
  hasAddressCollection: true,
  hasQuestionnaire: false,
  addressFlow: { search: true, entrance: true },
  ...over,
});

describe('business premises address steps', () => {
  it('runs search, pin, entrance and review right after the business details', () => {
    const order = buildStepOrder(business());
    const details = order.indexOf('business-details');
    expect(order.slice(details + 1, details + 5)).toEqual([
      'address-search',
      'address-collection',
      'address-entrance',
      'address-review',
    ]);
  });

  it('backs from the next section into the address review', () => {
    const config = {
      business: { country: 'NG', documents: { enabled: true, types: [{ key: 'proof_of_address', required: true }] } } as never,
      addressCollection: { enabled: true },
    };
    expect(prevBusinessStep('business-documents', config)).toBe('address-review');
  });
});

describe('addressSubmission', () => {
  const pin = {
    lat: 6.4281,
    lng: 3.4219,
    directions: '  blue gate  ',
    propertyName: '',
    propertyNumber: '12',
    label: 'Adeola Odeku Street',
    streetView: { panoId: 'p1', heading: 90, pitch: 0, fov: 80 },
  } as never;

  it('sends the pin with only the fields that were filled', () => {
    expect(addressSubmission({ enabled: true }, pin)).toEqual({
      address: {
        lat: 6.4281,
        lng: 3.4219,
        label: 'Adeola Odeku Street',
        directions: 'blue gate',
        propertyNumber: '12',
        streetView: { panoId: 'p1', heading: 90, pitch: 0, fov: 80 },
      },
    });
  });

  it('sends nothing without a pin', () => {
    expect(addressSubmission({ enabled: true }, null as never)).toEqual({});
  });
});
