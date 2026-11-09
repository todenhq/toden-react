import type { TextAvailability } from './types';
import {
  CAMERA,
  CONTACT,
  DOCUMENT,
  EVERYWHERE,
  FULL_IDENTITY,
  LIVENESS,
  BUSINESS,
  all,
} from './customisable-where';

/** The customisable texts from the welcome screen through to the questionnaire. */
export const IDENTITY_TEXTS: Record<string, TextAvailability> = {
  // Welcome. The older consent fields cover every scope's title and description.
  ...all(['welcome.title', 'welcome.description', 'welcome.process.heading', 'welcome.secureNote'], EVERYWHERE),
  ...all(
    [
      'welcome.process.verifyId',
      'welcome.process.captureDocument',
      'welcome.process.uploadDocument',
      'welcome.process.selfie',
      'welcome.process.supportingDocuments',
    ],
    FULL_IDENTITY,
  ),
  // A person's full flow or an address check, a business's address check
  // included (its own wording inherits these, i18n/business-variants.ts).
  ...all(['welcome.process.proofOfAddress'], { scopes: ['full', 'address'], step: 'proofOfAddress' }),
  ...all(['welcome.process.addressMap'], { scopes: ['full'], step: 'address' }),
  ...all(['welcome.process.addressPin', 'welcome.process.addressDetails'], { scopes: ['address'] }),
  ...all(['welcome.process.faceSelfie', 'welcome.process.faceMatch'], { scopes: ['biometric-authentication'] }),
  ...all(['welcome.process.faceEnrol'], { scopes: ['biometric-enrollment'] }),
  ...all(['welcome.process.questions'], { scopes: ['full', 'questionnaire'], step: 'questionnaire' }),
  ...all(['welcome.process.contactScope'], { scopes: ['contact'] }),
  ...all(
    ['welcome.process.contactEmailAndPhone', 'welcome.process.contactEmail', 'welcome.process.contactPhone'],
    { scopes: ['full'], step: 'contact' },
  ),
  ...all(
    [
      'welcome.process.businessDetails',
      'welcome.process.businessRegistry',
      'welcome.process.keyPeople',
      'welcome.process.businessDocuments',
      'welcome.process.applicant',
    ],
    BUSINESS,
  ),

  // Email and phone codes.
  ...all(['contact.email.title', 'contact.email.intro', 'contact.email.label', 'contact.email.footer'], {
    ...CONTACT,
    step: 'email',
  }),
  ...all(['contact.phone.title', 'contact.phone.label', 'contact.phone.footer', 'contact.channel.question'], {
    ...CONTACT,
    step: 'phone',
  }),
  ...all(['contact.sendCode', 'contact.skip', 'contact.code.label', 'contact.code.resend', 'contact.verifyCode'], CONTACT),

  // Choosing the ID.
  ...all(
    [
      'selectDocument.country.title',
      'selectDocument.country.description',
      'selectDocument.idType.title',
      'selectDocument.idType.description',
      'selectDocument.idInput.description',
    ],
    FULL_IDENTITY,
  ),

  // The "before you start" screens and the camera request.
  ...all(
    ['primer.document.title', 'primer.document.body', 'primer.document.checklist1', 'primer.document.checklist2', 'primer.document.checklist3'],
    DOCUMENT,
  ),
  ...all(
    [
      'primer.selfie.title',
      'primer.selfie.body',
      'primer.selfie.bodyPassive',
      'primer.selfie.checklist1',
      'primer.selfie.checklist2',
      'primer.selfie.checklist4',
      'primer.selfie.checklist5',
    ],
    LIVENESS,
  ),
  ...all(['primer.readyButton', 'primer.camera.title', 'primer.camera.body', 'primer.camera.button'], CAMERA),
  ...all(['primer.camera.bodyDocument'], DOCUMENT),

  // Photographing or uploading the document. The titles and descriptions name
  // the document with `{document}`, which the editor asks authors to keep.
  ...all(
    [
      'uploadDocument.title.scanFront',
      'uploadDocument.title.capture',
      'uploadDocument.title.uploadFront',
      'uploadDocument.title.upload',
      'uploadDocument.title.frontCaptured',
      'uploadDocument.title.frontAdded',
      'uploadDocument.title.scanBack',
      'uploadDocument.title.uploadBack',
      'uploadDocument.title.review',
      'uploadDocument.description.scanFront',
      'uploadDocument.description.capture',
      'uploadDocument.description.uploadFront',
      'uploadDocument.description.upload',
      'uploadDocument.description.frontCaptured',
      'uploadDocument.description.frontAdded',
      'uploadDocument.description.scanBack',
      'uploadDocument.description.uploadBack',
      'uploadDocument.description.reviewBoth',
      'uploadDocument.description.reviewBothAdded',
      'uploadDocument.description.review',
    ],
    DOCUMENT,
  ),
  ...all(
    [
      'uploadDocument.upload.addFromGallery',
      'uploadDocument.upload.tapToChoose',
      'uploadDocument.upload.hint',
      'uploadDocument.upload.tip1',
      'uploadDocument.upload.tip2',
      'uploadDocument.upload.tip3',
      'uploadDocument.camera.havingTrouble',
      'uploadDocument.camera.uploadInstead',
      'uploadDocument.flipBanner',
      'uploadDocument.crop.title',
      'uploadDocument.crop.description',
      'uploadDocument.crop.confirm',
      'uploadDocument.crop.rotate',
      'uploadDocument.review.tapToEnlarge',
      'uploadDocument.check.title',
    ],
    DOCUMENT,
  ),

  ...all(['nfc.title', 'nfc.description', 'nfc.waiting', 'nfc.skip'], { ...FULL_IDENTITY, step: 'nfc' }),

  // Selfie and liveness, the instructions included (they are spoken too).
  ...all(
    [
      'presence.title',
      'presence.intro.description',
      'presence.camera.description',
      'presence.position.placeFace',
      'presence.challenge.nod',
      'presence.challenge.turn',
      'presence.challenge.blink',
      'presence.challenge.smile',
      'presence.challenge.hold',
      'presence.review.title',
      'presence.review.description',
    ],
    LIVENESS,
  ),

  ...all(
    [
      'proofOfAddress.title',
      'proofOfAddress.documentType',
      'proofOfAddress.kind.utilityBill',
      'proofOfAddress.kind.bankStatement',
      'proofOfAddress.kind.tenancyAgreement',
      'proofOfAddress.kind.governmentDocument',
      'proofOfAddress.kind.other',
      'proofOfAddress.uploaded',
    ],
    { scopes: ['full', 'address'], step: 'proofOfAddress' },
  ),

  ...all(
    [
      'supportingDocuments.title',
      'supportingDocuments.intro.optional.one',
      'supportingDocuments.intro.optional.many',
      'supportingDocuments.intro.required.one',
      'supportingDocuments.card.required',
      'supportingDocuments.card.optional',
      'supportingDocuments.card.reads',
    ],
    { ...FULL_IDENTITY, step: 'supportingDocuments' },
  ),

  ...all(
    ['questionnaire.title', 'questionnaire.description', 'questionnaire.detailLabel', 'questionnaire.yes', 'questionnaire.no'],
    { scopes: ['full', 'questionnaire'], step: 'questionnaire' },
  ),
};
