import type { TextEntry } from '../types';

// The document step's header and its camera screen, in the order the applicant
// meets them. `{document}` is the ID type's name, e.g. "Driver's License".

const DOC = ['document'];

export const UPLOAD_DOCUMENT_CAPTURE_ENTRIES: TextEntry[] = [
  { key: 'uploadDocument.documentFallback', label: 'Document name when none is chosen', default: 'ID Document' },

  // Header: title and description per phase.
  { key: 'uploadDocument.title.scanFront', label: 'Title: scan the front', default: 'Scan Front of Your {document}', placeholders: DOC },
  { key: 'uploadDocument.title.capture', label: 'Title: capture a one-sided document', default: 'Capture Your {document}', placeholders: DOC },
  { key: 'uploadDocument.title.uploadFront', label: 'Title: upload the front', default: 'Upload Front of Your {document}', placeholders: DOC },
  { key: 'uploadDocument.title.upload', label: 'Title: upload a one-sided document', default: 'Upload Your {document}', placeholders: DOC },
  { key: 'uploadDocument.title.frontCaptured', label: 'Title: front captured', default: 'Front Side Captured' },
  { key: 'uploadDocument.title.frontAdded', label: 'Title: front added', default: 'Front Side Added' },
  { key: 'uploadDocument.title.scanBack', label: 'Title: scan the back', default: 'Scan Back of Your {document}', placeholders: DOC },
  { key: 'uploadDocument.title.uploadBack', label: 'Title: upload the back', default: 'Upload Back of Your {document}', placeholders: DOC },
  { key: 'uploadDocument.title.review', label: 'Title: review', default: 'Review Your {document}', placeholders: DOC },
  { key: 'uploadDocument.description.scanFront', label: 'Description: scan the front', default: 'Place the FRONT of your {document} within the frame.', placeholders: DOC },
  {
    key: 'uploadDocument.description.capture',
    label: 'Description: capture a one-sided document',
    default: 'Photograph your {document}. Position it within the frame and hold steady.',
    placeholders: DOC,
    multiline: true,
  },
  { key: 'uploadDocument.description.uploadFront', label: 'Description: upload the front', default: 'Choose a clear photo of the FRONT of your {document}.', placeholders: DOC },
  { key: 'uploadDocument.description.upload', label: 'Description: upload a one-sided document', default: 'Choose a clear photo of your {document}.', placeholders: DOC },
  {
    key: 'uploadDocument.description.frontCaptured',
    label: 'Description: front captured',
    default: 'Looks good? Tap Next to flip the card and scan the back side.',
    multiline: true,
  },
  { key: 'uploadDocument.description.frontAdded', label: 'Description: front added', default: 'Looks good? Tap Next to add the back.' },
  { key: 'uploadDocument.description.scanBack', label: 'Description: scan the back', default: 'Now place the BACK of your {document} within the frame.', placeholders: DOC },
  { key: 'uploadDocument.description.uploadBack', label: 'Description: upload the back', default: 'Now choose a clear photo of the BACK of your {document}.', placeholders: DOC },
  { key: 'uploadDocument.description.reviewBoth', label: 'Description: both sides captured', default: 'Both sides captured. Tap Continue to proceed.' },
  { key: 'uploadDocument.description.reviewBothAdded', label: 'Description: both sides added', default: 'Both sides added. Tap Continue to proceed.' },
  { key: 'uploadDocument.description.review', label: 'Description: review', default: 'Looks good? Tap Continue to proceed.' },

  // The band under the header.
  { key: 'uploadDocument.badge.required', label: 'Badge: required', default: 'Required:' },
  { key: 'uploadDocument.badge.frontSide', label: 'Badge: front side', default: 'Front Side' },
  { key: 'uploadDocument.badge.backSide', label: 'Badge: back side', default: 'Back Side' },
  { key: 'uploadDocument.progress', label: 'Progress', default: 'Step {current} of {total}', placeholders: ['current', 'total'] },

  // The camera screen.
  { key: 'uploadDocument.camera.sideFront', label: 'Camera: front side badge', default: 'front' },
  { key: 'uploadDocument.camera.sideBack', label: 'Camera: back side badge', default: 'back' },
  { key: 'uploadDocument.hint.searching', label: 'Hint: looking for the document', default: 'Point the camera at your {document}', placeholders: DOC },
  { key: 'uploadDocument.hint.moreLight', label: 'Hint: too dark', default: 'Too dark. Move somewhere brighter.' },
  { key: 'uploadDocument.hint.wrongDocument', label: 'Hint: wrong document', default: "That doesn't look like your {document}", placeholders: DOC },
  { key: 'uploadDocument.hint.moveCloser', label: 'Hint: move closer', default: 'Move closer' },
  { key: 'uploadDocument.hint.moveBack', label: 'Hint: move back', default: 'Move back, the corners are cut off' },
  { key: 'uploadDocument.hint.centre', label: 'Hint: centre the document', default: 'Centre your document in the frame' },
  { key: 'uploadDocument.hint.showMrz', label: 'Hint: show the bottom strip', default: 'Show the bottom strip of the page' },
  { key: 'uploadDocument.hint.holdStill', label: 'Hint: hold still', default: 'Hold still…' },
  { key: 'uploadDocument.hint.captured', label: 'Hint: captured', default: 'Captured' },
  { key: 'uploadDocument.hint.placeDocument', label: 'Hint: no document found', default: 'Place your ID inside the frame' },
  { key: 'uploadDocument.hint.fitCorners', label: 'Hint: a corner is cut off', default: 'Fit all four corners of your ID inside the frame' },
  { key: 'uploadDocument.hint.spaceAround', label: 'Hint: too close to the edge', default: 'Move back a little so there is space around your ID' },
  { key: 'uploadDocument.hint.faceNotDocument', label: 'Hint: the camera sees a face, not the ID', default: 'Hold your ID up in front of the camera' },
  {
    key: 'uploadDocument.camera.autoCaption',
    label: 'Camera: caption under the camera',
    default: 'Your ID is captured automatically once all four corners are inside the frame',
    multiline: true,
  },
  {
    key: 'uploadDocument.camera.tooBright',
    label: 'Camera: too bright',
    default: 'Too bright. Reduce glare or move away from direct light for a clearer capture.',
    multiline: true,
  },
  {
    key: 'uploadDocument.camera.tooDark',
    label: 'Camera: too dark',
    default: 'It looks dark here. Move to a brighter area for a clearer capture.',
    multiline: true,
  },
  { key: 'uploadDocument.camera.havingTrouble', label: 'Camera: having trouble', default: 'Having trouble?' },
  { key: 'uploadDocument.camera.uploadInstead', label: 'Camera: upload instead link', default: 'Upload a photo instead' },
  { key: 'uploadDocument.camera.denied', label: 'Camera: access denied', default: 'Camera access was denied' },
  {
    key: 'uploadDocument.camera.deniedHint',
    label: 'Camera: access denied hint',
    default: 'Allow camera access in your browser/site settings and tap Try Again.',
    multiline: true,
  },
  {
    key: 'uploadDocument.camera.deniedHintUpload',
    label: 'Camera: access denied hint (upload offered)',
    default: 'Allow camera access in your browser/site settings and tap Try Again, or upload a photo of your document instead.',
    multiline: true,
  },
  { key: 'uploadDocument.tryAgain', label: 'Try again button', default: 'Try Again' },
  { key: 'uploadDocument.camera.openingPicker', label: 'Camera: opening the photo picker', default: 'Opening photo picker…' },
  { key: 'uploadDocument.camera.backToCamera', label: 'Camera: back to camera button', default: 'Back to camera' },
  { key: 'uploadDocument.handover.title', label: 'Checking a scan: title', default: 'Checking your document' },
  { key: 'uploadDocument.handover.description', label: 'Checking a scan: description', default: 'This only takes a moment.' },
  { key: 'uploadDocument.compressing', label: 'Compressing the image', default: 'Compressing image…' },
];
