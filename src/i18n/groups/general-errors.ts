import type { TextEntry } from '../types';

/** The general error messages a submission or upload can end on (lib/errors.ts). */
export const GENERAL_ERROR_TEXTS: TextEntry[] = [
  {
    key: 'general.error.workflowNotFound',
    label: 'Error: workflow unavailable',
    default: 'This verification workflow is unavailable. It may have been unpublished. Please reload and try again.',
    multiline: true,
  },
  {
    key: 'general.error.workflowSubjectMismatch',
    label: 'Error: workflow is not for businesses',
    default: 'This workflow cannot accept a business submission. Contact the organization that sent you here.',
    multiline: true,
  },
  {
    key: 'general.error.entityTypeMismatch',
    label: 'Error: reference belongs to another kind of record',
    default: 'This verification is set up for a different kind of record. Contact the organisation that sent it.',
    multiline: true,
  },
  {
    key: 'general.error.businessVerificationsDisabled',
    label: 'Error: business verification not enabled',
    default: 'Business verification is not enabled for this organization. Contact your administrator to request access.',
    multiline: true,
  },
  {
    key: 'general.error.countryMismatch',
    label: 'Error: country does not match the workflow',
    default: "The submitted country doesn't match this workflow's configuration. Please reload and try again.",
    multiline: true,
  },
  {
    key: 'general.error.productUnsupported',
    label: 'Error: verification product not offered',
    default: 'The selected verification product is not offered by this workflow. Please reload and try again.',
    multiline: true,
  },
  {
    key: 'general.error.registrationNameRequired',
    label: 'Error: registered business name needed',
    default: 'Please enter the registered business name to continue.',
  },
  {
    key: 'general.error.onlyTestIdsAllowed',
    label: 'Error: sandbox accepts only test numbers',
    default: 'Sandbox mode accepts only published test registration numbers (e.g. RC0000001 or RC0000002).',
    multiline: true,
  },
  {
    key: 'general.error.pricingNotConfigured',
    label: 'Error: pricing not configured',
    default: 'Verification pricing has not been configured for this organization. Please contact support.',
    multiline: true,
  },
  {
    key: 'general.error.missingDocumentsNamed',
    label: 'Error: named business documents missing',
    default: 'Required business documents are missing: {documents}. Please go back and upload them.',
    multiline: true,
    placeholders: ['documents'],
  },
  {
    key: 'general.error.missingDocuments',
    label: 'Error: business documents missing',
    default: 'Some required business documents are missing. Please go back and upload them.',
    multiline: true,
  },
  { key: 'general.error.invalidApiKey', label: 'Error: invalid API key', default: 'Invalid API key. Please contact support.' },
  {
    key: 'general.error.insufficientCreditsAmounts',
    label: 'Error: not enough credits (with amounts)',
    default: 'Insufficient credits. Required: ${required}, Available: ${balance}',
    multiline: true,
    placeholders: ['required', 'balance'],
  },
  {
    key: 'general.error.insufficientCredits',
    label: 'Error: not enough credits',
    default: 'Insufficient credits to process this verification.',
  },
  {
    key: 'general.error.idTypeNotAllowed',
    label: 'Error: ID type not enabled',
    default: "This ID type isn't enabled for your organization. Contact your administrator to request access.",
    multiline: true,
  },
  {
    key: 'general.error.documentVerificationDisabled',
    label: 'Error: document verification disabled',
    default: 'Document verification is currently disabled for your organization.',
    multiline: true,
  },
  {
    key: 'general.error.govDbCheckDisabled',
    label: 'Error: government database check disabled',
    default: 'Government database verification is currently disabled for your organization.',
    multiline: true,
  },
  {
    key: 'general.error.featureDisabled',
    label: 'Error: feature disabled',
    default: 'This verification feature is currently disabled for your organization.',
    multiline: true,
  },
  {
    key: 'general.error.server',
    label: 'Error: server error',
    default: 'A server error occurred. Please try again in a moment.',
  },
  {
    key: 'general.error.network',
    label: 'Error: network error',
    default: 'Network error. Please check your connection and try again.',
  },
  { key: 'general.error.unknown', label: 'Error: something went wrong', default: 'Something went wrong. Please try again.' },
];
