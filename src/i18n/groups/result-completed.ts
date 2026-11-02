import type { TextEntry } from '../types';

/** What a returning applicant reads once their session has been decided. */
export const RESULT_COMPLETED_TEXTS: TextEntry[] = [
  { key: 'result.completed.approved.title', label: 'Returning, verified: title', default: 'Verification complete' },
  {
    key: 'result.completed.approved.title.faceEnrolment',
    label: 'Returning, verified: title (face enrolment)',
    default: 'Enrolment complete',
  },
  {
    key: 'result.completed.approved.description.individual',
    label: 'Returning, verified: description',
    default: 'Your identity has been verified. There is nothing left to do here.',
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.business',
    label: 'Returning, verified: description (business)',
    default: 'This business has been verified. There is nothing left to do here.',
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.address',
    label: 'Returning, verified: description (address check)',
    default: 'Your address has been verified. There is nothing left to do here.',
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.faceEnrolment',
    label: 'Returning, verified: description (face enrolment)',
    default: 'Your face has been saved as the reference for your future face checks. There is nothing left to do here.',
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.questionnaire',
    label: 'Returning, verified: description (questionnaire)',
    default: 'Your answers have been received. There is nothing left to do here.',
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.contact',
    label: 'Returning, verified: description (contact check)',
    default: 'Your contact details have been verified. There is nothing left to do here.',
    multiline: true,
  },
  // A scoped business workflow, worded for the company. An org's own words
  // for the base text still apply (i18n/business-variants.ts).
  {
    key: 'result.completed.approved.description.address.business',
    label: 'Returning, verified: description (business address check)',
    default: "Your business's address has been verified. There is nothing left to do here.",
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.questionnaire.business',
    label: 'Returning, verified: description (business questionnaire)',
    default: 'Your answers about your business have been received. There is nothing left to do here.',
    multiline: true,
  },
  {
    key: 'result.completed.approved.description.contact.business',
    label: 'Returning, verified: description (business contact check)',
    default: "Your business's contact details have been verified. There is nothing left to do here.",
    multiline: true,
  },
  { key: 'result.completed.declined.title', label: 'Returning, not verified: title', default: 'Verification unsuccessful' },
  {
    key: 'result.completed.declined.description.individual',
    label: 'Returning, not verified: description',
    default:
      'Your identity could not be verified. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.business',
    label: 'Returning, not verified: description (business)',
    default:
      'This business could not be verified. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.address',
    label: 'Returning, not verified: description (address check)',
    default:
      'Your address could not be verified. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.faceEnrolment',
    label: 'Returning, not verified: description (face enrolment)',
    default:
      'Your face enrolment could not be completed. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.questionnaire',
    label: 'Returning, not verified: description (questionnaire)',
    default:
      'Your answers could not be accepted. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.contact',
    label: 'Returning, not verified: description (contact check)',
    default:
      'Your contact details could not be verified. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.address.business',
    label: 'Returning, not verified: description (business address check)',
    default:
      "Your business's address could not be verified. Contact the organisation that sent you this link to find out what happens next.",
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.questionnaire.business',
    label: 'Returning, not verified: description (business questionnaire)',
    default:
      'Your answers about your business could not be accepted. Contact the organisation that sent you this link to find out what happens next.',
    multiline: true,
  },
  {
    key: 'result.completed.declined.description.contact.business',
    label: 'Returning, not verified: description (business contact check)',
    default:
      "Your business's contact details could not be verified. Contact the organisation that sent you this link to find out what happens next.",
    multiline: true,
  },
  { key: 'result.completed.actionNeeded.title', label: 'Returning, more needed: title', default: 'More information needed' },
  {
    key: 'result.completed.actionNeeded.description',
    label: 'Returning, more needed: description',
    default:
      'Some details need to be provided again. The organisation that sent you this link will have shared a new link to continue.',
    multiline: true,
  },
  {
    key: 'result.completed.error.title',
    label: 'Returning, our error: title',
    default: 'Something went wrong on our side',
  },
  {
    key: 'result.completed.error.description',
    label: 'Returning, our error: description',
    default:
      'This verification could not be completed because of a problem at our end. Nothing was charged. Contact the organisation that sent you this link.',
    multiline: true,
  },
];
