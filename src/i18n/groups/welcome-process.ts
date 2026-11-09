import type { TextEntry } from '../types';

/** The welcome screen's "During this process we will" list, one line per step. */
export const WELCOME_PROCESS_TEXTS: TextEntry[] = [
  { key: 'welcome.process.heading', label: 'Steps list: heading', default: 'During this process we will' },
  { key: 'welcome.time.minute', label: 'Time to complete: about a minute', default: 'It takes about a minute.' },
  { key: 'welcome.time.minutes', label: 'Time to complete: minutes', default: 'It takes about {minutes} minutes.', placeholders: ['minutes'] },
  { key: 'welcome.process.verifyId', label: 'Step: verify ID', default: 'Check that your ID is genuine' },
  {
    key: 'welcome.process.businessDetails',
    label: 'Step: business details',
    default: 'Collect your business registration details',
  },
  {
    key: 'welcome.process.businessRegistry',
    label: 'Step: business registry check',
    default: 'Verify your business against the official registry',
  },
  { key: 'welcome.process.addressPin', label: 'Step: verify home address', default: 'Verify your home address' },
  {
    key: 'welcome.process.addressDetails',
    label: 'Step: address details',
    default: 'Confirm the details only you can know',
  },
  {
    key: 'welcome.process.addressPin.business',
    label: 'Step: verify business premises',
    default: 'Verify your business premises',
  },
  {
    key: 'welcome.process.addressDetails.business',
    label: 'Step: premises details',
    default: 'Add the details that help us find the premises',
  },
  {
    key: 'welcome.process.faceSelfie',
    label: 'Step: face check selfie',
    default: 'Take a quick selfie with liveness checks',
  },
  { key: 'welcome.process.faceMatch', label: 'Step: face match', default: 'We match it against your enrolled face' },
  {
    key: 'welcome.process.faceEnrol',
    label: 'Step: face enrolment',
    default: 'It becomes your face check for next time',
  },
  {
    key: 'welcome.process.contactScope',
    label: 'Step: confirm contact details',
    default: 'Confirm your contact details with a one-time code',
  },
  {
    key: 'welcome.process.contactScope.business',
    label: 'Step: confirm business contact details',
    default: "Confirm your business's contact details with a one-time code",
  },
  {
    key: 'welcome.process.contactEmailAndPhone',
    label: 'Step: confirm email and phone',
    default: 'Confirm your email and phone number with a one-time code',
  },
  {
    key: 'welcome.process.contactEmail',
    label: 'Step: confirm email',
    default: 'Confirm your email with a one-time code',
  },
  {
    key: 'welcome.process.contactPhone',
    label: 'Step: confirm phone',
    default: 'Confirm your phone number with a one-time code',
  },
  { key: 'welcome.process.captureDocument', label: 'Step: scan ID', default: 'Scan your ID document' },
  { key: 'welcome.process.uploadDocument', label: 'Step: upload ID', default: 'Upload a photo of your ID document' },
  { key: 'welcome.process.selfie', label: 'Step: selfie', default: 'Take a selfie for facial verification' },
  {
    key: 'welcome.process.supportingDocuments',
    label: 'Step: supporting documents',
    default: 'Share any extra documents we need',
  },
  {
    key: 'welcome.process.proofOfAddress',
    label: 'Step: proof of address',
    default: 'Upload a proof of address document',
  },
  {
    key: 'welcome.process.proofOfAddress.business',
    label: 'Step: proof of business address',
    default: "Upload a document showing your business's address",
  },
  { key: 'welcome.process.addressMap', label: 'Step: verify address', default: 'Verify your home address' },
  { key: 'welcome.process.questions', label: 'Step: questions', default: 'Answer a few short questions' },
  {
    key: 'welcome.process.questions.business',
    label: 'Step: questions about the business',
    default: 'Answer a few short questions about your business',
  },
  {
    key: 'welcome.process.keyPeople',
    label: 'Step: directors and owners',
    default: "List the company's directors and owners",
  },
  {
    key: 'welcome.process.businessDocuments',
    label: 'Step: business documents',
    default: 'Upload supporting business documents',
  },
  { key: 'welcome.process.applicant', label: 'Step: applicant identity', default: 'Verify your own identity' },
];
