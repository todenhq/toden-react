import type { AddressCollectionConfig } from '../types/config';
import type { VerificationState } from '../context/types';
import type { VerifyRequest } from '../services/api';
import { requiredPrefillSubmission } from './address/address-field-modes';
import { addressBookSaveBlock, type AddressBookReuse } from '../lib/address-book';

// The smart-address block of a submission (Address Intelligence): the pin,
// what the applicant typed or confirmed and, when attestPresence took one,
// the device fix. Shared by the person submission and the business one, where
// the pin is the business premises: until 2026-10-18 the business submission
// never sent it, so a KYB address step collected a pin nothing ever checked.
//
// Typed values ride only when filled. Workflow-REQUIRED fields the applicant
// left on their map prefill ride that prefill: they saw it filled and
// confirmed by continuing, and the server refuses a required field that never
// arrives.

const trimmed = (key: string, value: string | null | undefined): Record<string, string> =>
  value?.trim() ? { [key]: value.trim() } : {};

/**
 * The widest radius every deployed server accepts. A desktop browser places
 * itself by Wi-Fi or IP and can report one over 100 km, which servers released
 * before 2026-11-02 refused, failing the whole submission. A fix that coarse
 * cannot place anyone at the pin anyway, so it is left out rather than sent.
 */
export const WIRE_MAX_ACCURACY_M = 100_000;
const sendable = (accuracy: number | null | undefined) => accuracy == null || accuracy <= WIRE_MAX_ACCURACY_M;

/** `{ address }` for the submission, or nothing when no pin was confirmed. */
export function addressSubmission(
  config: AddressCollectionConfig | undefined,
  address: VerificationState['address'],
  extras: { reuse?: AddressBookReuse | null; hasPhoto?: boolean } = {},
): Pick<VerifyRequest, 'address' | 'addressBookReuse'> {
  // A saved address picked from the Toden address book replaces the capture.
  if (extras.reuse) return { addressBookReuse: { grant: extras.reuse.grant, entryId: extras.reuse.entryId } };
  if (!address) return {};
  return {
    address: {
      lat: address.lat,
      lng: address.lng,
      // The line the applicant CONFIRMED (search pick or reverse geocode): the
      // server prefers it for the composed address over its own derivation.
      ...trimmed('label', address.label),
      ...(address.accuracy != null && sendable(address.accuracy) ? { accuracy: address.accuracy } : {}),
      ...trimmed('directions', address.directions),
      ...trimmed('propertyName', address.propertyName),
      ...trimmed('propertyNumber', address.propertyNumber),
      ...trimmed('street', address.street),
      ...trimmed('unit', address.unit),
      ...trimmed('neighbourhood', address.neighbourhood),
      ...trimmed('city', address.city),
      ...trimmed('state', address.state),
      ...trimmed('postcode', address.postcode),
      ...requiredPrefillSubmission(config, address),
      ...(address.streetView ? { streetView: address.streetView } : {}),
      // The whole fix or none of it: coordinates without their radius would
      // read as a precise fix.
      ...(address.deviceLat != null && address.deviceLng != null && sendable(address.deviceAccuracy)
        ? {
            deviceLat: address.deviceLat,
            deviceLng: address.deviceLng,
            ...(address.deviceAccuracy != null ? { deviceAccuracy: address.deviceAccuracy } : {}),
            ...(address.capturedAt ? { capturedAt: address.capturedAt } : {}),
          }
        : {}),
      // "Save this address to my Toden address book" (unticked by default).
      ...addressBookSaveBlock(address.book, {
        hasPhoto: extras.hasPhoto === true,
        hasDirections: Boolean(address.directions?.trim()),
      }),
    },
  };
}
