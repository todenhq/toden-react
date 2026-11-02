// ---------------------------------------------------------------------------
// Business (KYB) workflow types
//
// LIVE business verification is WORKFLOW-REQUIRED: the server only accepts a
// business submission with a published KYB workflow (workflowId or hosted
// link). `subjectType`/`business` also exist as public props for the dashboard
// builder's live preview (`previewMode`, where all writes are mocked).
// ---------------------------------------------------------------------------

/** What a workflow verifies. Absent = 'individual' (classic KYC). */
export type SubjectType = 'individual' | 'business';

/** Associated-party roles discovered from the registry lookup. */
export type KeyPersonRole = 'director' | 'beneficial_owner' | 'signatory' | 'shareholder';

/** Roles the APPLICANT (the person submitting) may declare — key-person roles
 *  plus 'authorized_representative' (someone filing on the company's behalf). */
export type ApplicantRole = KeyPersonRole | 'authorized_representative';

/** Supporting-document kinds a KYB workflow can request from the applicant. */
export const COMPANY_INFO_FIELDS = ['address', 'email', 'phone', 'website'] as const;
export type CompanyInfoField =
  | 'address'
  | 'email'
  | 'phone'
  | 'website'
  | 'dateOfIncorporation'
  | 'taxId'
  | 'vatNumber'
  | 'companyType'
  | 'natureOfBusiness';
export type CompanyInfoMode = 'off' | 'optional' | 'required';

export type BusinessDocumentKey =
  | 'incorporation_certificate'
  | 'memart'
  | 'proof_of_address'
  | 'tax_document'
  | 'regulatory_license'
  | 'board_resolution'
  | 'other'
  | 'business_registration'
  | 'good_standing_certificate'
  | 'registry_extract'
  | 'annual_return'
  | 'register_of_directors'
  | 'shareholder_register'
  | 'share_certificate'
  | 'ubo_declaration'
  | 'power_of_attorney'
  | 'authorization_letter'
  | 'financial_statements';

/** Verification depth for discovered key people. */
export type KeyPeopleLevel = 'screening_only' | 'data' | 'full_kyc';

/**
 * Key-people (associated-party) verification block on a KYB workflow —
 * template config that arrives via workflow resolution. Mirrors the server's
 * `KeyPeopleConfigSchema`; the SDK only reads the email-invite gate.
 */
export interface WorkflowKeyPeopleConfig {
  /** People the applicant lists must carry an email address. */
  requireEmail?: boolean;
  /**
   * WHICH roles must supply one. Absent = the roles that are actually invited,
   * because an address exists to deliver a verification link and nothing else
   * asks for one. A company is always exempt.
   */
  requireEmailRoles?: KeyPersonRole[];
  enabled?: boolean;
  /** SDK collects the directors/owners from the applicant (adds the
   *  business-key-people step to the flow). */
  collect?: boolean;
  /** Minimum people the applicant must list when collect is on (0 = skippable). */
  minEntries?: number;
  /** In-scope roles. Absent/empty = all four roles. */
  roles?: KeyPersonRole[];
  /** Shareholders at/above this % escalate to beneficial owner (default 25). */
  ownershipThreshold?: number;
  /** Shareholders and beneficial owners must give a percentage (absent = yes). */
  requireOwnership?: boolean;
  /** Default verification depth when a role has no `perRole` override. */
  level?: KeyPeopleLevel;
  requirement?: 'all_in_scope' | 'ubos_only' | 'advisory';
  /** Per-role verification depth overrides (win over `level`). */
  perRole?: Partial<Record<KeyPersonRole, KeyPeopleLevel>>;
  /** Invite distribution for full-KYC people. */
  invite?: {
    channel?: string;
    /** The KYC workflow the per-person invite links run through. */
    workflowId?: string;
  };
  /** Nested KYB: a corporate shareholder is invited into its OWN business
   *  application (the server mints the link; the SDK only tells the applicant
   *  the truth about what happens to a company they list). */
  corporateKyb?: { enabled?: boolean; workflowId?: string };
}

/**
 * A KYB workflow's business configuration block. Business verification is a
 * registry lookup — no ID types, no capture — and the block carries its own
 * registry countries (any provider-supported ISO-2 codes, NOT limited to the
 * individual-KYC catalogue).
 */
export interface WorkflowBusinessConfig {
  /** ISO-2 PRIMARY registry country — the picker's default/pre-selected value. */
  country: string;
  /**
   * Multi-registry: every country the visitor may pick from. Published
   * workflows always carry an explicit list (the server materializes the
   * "all supported countries" mode at publish); absent = just the primary.
   */
  countries?: string[];
  /** Builder marker for "all supported countries" (materialized at publish). */
  allCountries?: boolean;
  /**
   * Offered verification products (keys from the server's business-products
   * catalog, e.g. 'business', 'business-tax'). Absent = just 'business'.
   * The effective offering narrows per picked country (TIN is NG-only).
   */
  products?: string[];
  /** Require the visitor to also type the registered business name. */
  requireRegistrationName?: boolean;
  /**
   * Freeze the register once a lookup has answered. Off by default: an
   * applicant picking from ~48 registers mis-clicks, and locking turns that
   * into a dead end. Client-side only - the server re-checks and re-charges a
   * changed company whatever the form allowed.
   */
  lockCountryAfterCheck?: boolean;
  /**
   * Offer search by company name on the details step. Absent = on; false opens
   * the step on registration-number entry and never searches.
   */
  nameSearch?: boolean;
  /** The company the ORG asserted at session creation, skipping the search. */
  assertedCompany?: {
    country: string;
    registrationNumber: string;
    registrationName?: string;
    /** Let the applicant correct an assertion that is wrong. Default true. */
    editable?: boolean;
  };
  /** Collect the company profile (address / email / phone / website) on the
   *  business-details step. Default ON; false hides the whole section. */
  collectCompanyInfo?: boolean;
  /** Per-field mode: absent = 'optional'; 'required' blocks Continue without
   *  it; 'off' hides the field. */
  companyInfo?: Partial<Record<CompanyInfoField, CompanyInfoMode>>;
  /** Key-people (director/owner) verification configuration. */
  keyPeople?: WorkflowKeyPeopleConfig;
  /** Supporting-document collection (business-documents step). */
  documents?: WorkflowBusinessDocumentsConfig;
  /** Applicant (submitter) identity verification (in-flow individual KYC). */
  applicant?: WorkflowBusinessApplicantConfig;
}

/** One requested document slot on a KYB workflow's `documents` block. */
export interface WorkflowBusinessDocumentTypeConfig {
  key: BusinessDocumentKey;
  /** Display label override (defaults per key, e.g. "Certificate of incorporation"). */
  label?: string;
  /** Submission is blocked (422 missing_documents) until this slot is uploaded. */
  required?: boolean;
  /** How recent it must be, in months. Absent = any date. Checked after submission. */
  maxAgeMonths?: number;
}

/**
 * Supporting-document collection block on a KYB workflow. `enabled` with
 * absent/empty `types` defaults to just a required incorporation certificate.
 */
export interface WorkflowBusinessDocumentsConfig {
  enabled?: boolean;
  types?: WorkflowBusinessDocumentTypeConfig[];
}

/**
 * Applicant-verification block on a KYB workflow: when `verification` is true
 * the applicant verifies their OWN identity in-flow (role declaration + the
 * ordinary individual capture steps), linked back to the application via
 * `metadata.userId = applicantKeyPersonId` on the second submission.
 */
export interface WorkflowBusinessApplicantConfig {
  verification?: boolean;
  /**
   * A published INDIVIDUAL workflow the applicant's own KYC runs through —
   * its capture template overlays the leg and its id is stamped on the
   * applicant's submission (server-side gates, pricing and decisioning).
   */
  workflowId?: string;
}
