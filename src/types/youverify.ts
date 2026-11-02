// ---------------------------------------------------------------------------
// YouVerify API – envelope shared by every endpoint
// ---------------------------------------------------------------------------

export interface YouVerifyResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Address (returned on BVN Premium, NIN, etc.)
// ---------------------------------------------------------------------------

export interface YouVerifyAddress {
  town?: string;
  lga?: string;
  state?: string;
  addressLine?: string;
}

// ---------------------------------------------------------------------------
// Data-validation sub-objects
// ---------------------------------------------------------------------------

export interface YouVerifyDataValidationField {
  validated: boolean;
  value: string;
}

export interface YouVerifyDataValidation {
  firstName?: YouVerifyDataValidationField;
  lastName?: YouVerifyDataValidationField;
  dateOfBirth?: YouVerifyDataValidationField;
}

export interface YouVerifySelfieVerification {
  confidenceLevel: number;
  threshold: number;
  match: boolean;
  image: string;
}

export interface YouVerifySelfieValidation {
  selfieVerification: YouVerifySelfieVerification;
}

export interface YouVerifyValidations {
  data?: YouVerifyDataValidation;
  selfie?: YouVerifySelfieValidation;
  validationMessages?: string;
}

// ---------------------------------------------------------------------------
// Identity verification – "found" result
// Covers BVN, BVN Premium, NIN, vNIN, Passport, Driver's Licence, PVC,
// Ghana Card, SSNIT, Voter's Card, Kenya National ID, SA National ID, etc.
// ---------------------------------------------------------------------------

export interface YouVerifyIdentityFound {
  id: string;
  status: 'found';
  firstName: string;
  middleName?: string;
  lastName: string;
  image?: string;
  mobile?: string;
  dateOfBirth?: string;
  gender?: string;
  isConsent: boolean;
  idNumber: string;
  type: string;
  allValidationPassed?: boolean;
  dataValidation?: boolean;
  selfieValidation?: boolean;
  address?: YouVerifyAddress;
  validations?: YouVerifyValidations;
  businessId?: string;
  requestedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Identity verification – "not_found" result
// ---------------------------------------------------------------------------

export interface YouVerifyIdentityNotFound {
  status: 'not_found';
  reason: string;
}

/** Discriminated union for the identity-verification data payload. */
export type YouVerifyIdentityData = YouVerifyIdentityFound | YouVerifyIdentityNotFound;

/** Full response from any identity-verification endpoint. */
export type YouVerifyIdentityResponse = YouVerifyResponse<YouVerifyIdentityData>;

// ---------------------------------------------------------------------------
// Request body – Identity verification (eIDV)
// ---------------------------------------------------------------------------

export interface YouVerifyIdentityRequestValidations {
  data?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  };
  selfie?: {
    image: string;
  };
}

export interface YouVerifyIdentityRequestMetadata {
  requestId: string;
  [key: string]: string;
}

export interface YouVerifyIdentityRequest {
  id: string;
  isSubjectConsent: true;
  premiumBVN?: boolean;
  metadata?: YouVerifyIdentityRequestMetadata;
  validations?: YouVerifyIdentityRequestValidations;
}

// ---------------------------------------------------------------------------
// Facial comparison
// ---------------------------------------------------------------------------

export interface YouVerifyImageComparison {
  confidenceLevel: number;
  threshold: number;
  match: boolean;
  image1: string;
  image2: string;
}

export interface YouVerifyFacialCompareData {
  id: string;
  status: 'completed' | 'failed';
  reason?: string;
  selfieValidation: boolean;
  imageComparison: YouVerifyImageComparison;
  isConsent: boolean;
  type: 'facial_compare';
  requestedAt: string;
}

/** Full response from POST /v2/api/identity/compare-image */
export type YouVerifyFacialCompareResponse = YouVerifyResponse<YouVerifyFacialCompareData>;

// ---------------------------------------------------------------------------
// Request body – Facial comparison
// ---------------------------------------------------------------------------

export interface YouVerifyFacialCompareRequest {
  image1: string;
  image2: string;
  isSubjectConsent: true;
}

// ---------------------------------------------------------------------------
// Endpoint path helpers
// ---------------------------------------------------------------------------

export type YouVerifyCountryCode = 'ng' | 'gh' | 'ke' | 'za';

export type YouVerifyNigeriaIdEndpoint =
  | 'bvn'
  | 'bvn-premium'
  | 'nin'
  | 'vnin'
  | 'tax-id'
  | 'phone'
  | 'drivers-license'
  | 'passport'
  | 'pvc';

export type YouVerifyGhanaIdEndpoint =
  | 'ghana-card'
  | 'voters'
  | 'drivers-license'
  | 'ssnit'
  | 'passport';

export type YouVerifyKenyaIdEndpoint = 'national-id' | 'passport';

export type YouVerifySouthAfricaIdEndpoint = 'national-id';

export type YouVerifyIdEndpoint =
  | YouVerifyNigeriaIdEndpoint
  | YouVerifyGhanaIdEndpoint
  | YouVerifyKenyaIdEndpoint
  | YouVerifySouthAfricaIdEndpoint;
