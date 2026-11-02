import type { TextEntry } from '../types';

const SUCCESS_DESCRIPTION = ['success', 'description'];

/** The submitting screen, a failed submission, and the "submitted" success screen. */
export const RESULT_SUBMIT_TEXTS: TextEntry[] = [
  { key: 'result.submitting.title', label: 'Submitting: title', default: 'Submitting your verification' },
  { key: 'result.submitting.description', label: 'Submitting: description', default: 'Please wait a moment.' },
  {
    key: 'result.submitting.retrying',
    label: 'Submitting: retrying after a connection issue',
    default: 'Connection issue, retrying ({attempt}/{total}).',
    placeholders: ['attempt', 'total'],
  },
  { key: 'result.error.title', label: 'Submission failed: title', default: 'Submission Failed' },
  { key: 'result.error.tryAgainButton', label: 'Submission failed: try again button', default: 'Try Again' },
  {
    key: 'result.error.goBackButton',
    label: 'Submission failed: go back to fix it button',
    default: 'Go back',
  },
  {
    key: 'result.error.missingRegistrationNumber',
    label: 'Error: registration number missing',
    default: 'Missing registration number.',
  },
  { key: 'result.error.missingIdType', label: 'Error: ID type missing', default: 'Missing ID type.' },
  { key: 'result.error.missingIdNumber', label: 'Error: ID number missing', default: 'Missing ID number.' },
  {
    key: 'result.success.title',
    label: 'Success: title',
    default: 'Verification Submitted!',
    configPath: ['success', 'title'],
  },
  {
    key: 'result.success.description.individual',
    label: 'Success: description',
    default: "Your identity verification has been submitted for review. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.business',
    label: 'Success: description (business)',
    default: "Your business verification has been submitted for review. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.address',
    label: 'Success: description (address check)',
    default: "Your address verification has been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.faceCheck',
    label: 'Success: description (face check)',
    default: "Your face check has been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.faceEnrolment',
    label: 'Success: description (face enrolment)',
    default: "Your face enrolment has been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.questionnaire',
    label: 'Success: description (questionnaire)',
    default: "Your answers have been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.contact',
    label: 'Success: description (contact check)',
    default: "Your contact verification has been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  // A scoped business workflow's success line names the business. They take
  // the same older success.description field as every other variant.
  {
    key: 'result.success.description.address.business',
    label: 'Success: description (business address check)',
    default: "Your business address verification has been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.questionnaire.business',
    label: 'Success: description (business questionnaire)',
    default: "Your answers about your business have been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.description.contact.business',
    label: 'Success: description (business contact check)',
    default: "Your business contact verification has been submitted. You'll be notified of the result.",
    multiline: true,
    configPath: SUCCESS_DESCRIPTION,
  },
  {
    key: 'result.success.redirectLabel',
    label: 'Success: redirect button',
    default: 'Continue',
    configPath: ['success', 'redirectLabel'],
  },
  {
    key: 'result.success.closeTabNote',
    label: 'Success: close this tab note',
    default: "You're all set, you can close this tab.",
  },
];
