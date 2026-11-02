import type { TextAvailability } from './types';

/** Where the customisable texts appear, shared by the two list files. */

export const EVERYWHERE: TextAvailability = {};
export const IDENTITY: TextAvailability = { subject: 'individual' };
export const FULL_IDENTITY: TextAvailability = { subject: 'individual', scopes: ['full'] };
/** The KYB application's screens. A SCOPED business workflow runs its scope's
 *  own screens instead, so these never show there. */
export const BUSINESS: TextAvailability = { subject: 'business', scopes: ['full'] };
export const FACE_SCOPES = ['full', 'biometric-authentication', 'biometric-enrollment'];
export const LIVENESS: TextAvailability = { subject: 'individual', scopes: FACE_SCOPES, step: 'liveness' };
export const CAMERA: TextAvailability = { subject: 'individual', scopes: FACE_SCOPES };
export const DOCUMENT: TextAvailability = { ...FULL_IDENTITY, step: 'documentCapture' };
export const ADDRESS: TextAvailability = { scopes: ['full', 'address'], step: 'address' };
export const CONTACT: TextAvailability = { scopes: ['full', 'contact'], step: 'contact' };
export const FACE_CHECK: TextAvailability = { subject: 'individual', scopes: ['biometric-authentication'] };
export const FACE_ENROLMENT: TextAvailability = { subject: 'individual', scopes: ['biometric-enrollment'] };

/** Several keys that share one place. */
export function all(keys: string[], where: TextAvailability): Record<string, TextAvailability> {
  return Object.fromEntries(keys.map((key) => [key, where]));
}
