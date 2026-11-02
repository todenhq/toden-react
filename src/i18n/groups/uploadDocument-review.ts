import type { TextEntry } from '../types';

// The document step after the camera: picking a photo, cropping it, reviewing
// both sides and the check that asks for a retake when a photo can't be read.

export const UPLOAD_DOCUMENT_REVIEW_ENTRIES: TextEntry[] = [
  // Upload-only screen (and the photo picked from the camera screen).
  { key: 'uploadDocument.upload.dragHere', label: 'Upload: drag a photo (computer)', default: 'Drag a photo here' },
  { key: 'uploadDocument.upload.addFromGallery', label: 'Upload: add a photo (phone)', default: 'Add a photo from your gallery or files' },
  { key: 'uploadDocument.upload.dropToAdd', label: 'Upload: while dragging', default: 'Drop to add this photo' },
  { key: 'uploadDocument.upload.preparing', label: 'Upload: preparing the photo', default: 'Preparing your photo…' },
  {
    key: 'uploadDocument.upload.hint',
    label: 'Upload: hint',
    default: "Use a clear, well-lit photo. You'll be able to crop it next.",
    multiline: true,
  },
  { key: 'uploadDocument.upload.browseComputer', label: 'Upload: browse link (computer)', default: 'Or browse your computer' },
  { key: 'uploadDocument.upload.tapToChoose', label: 'Upload: tap link (phone)', default: 'Tap to choose a photo' },
  { key: 'uploadDocument.upload.tip1', label: 'Upload: tip 1', default: 'Lay the document flat on a plain surface' },
  { key: 'uploadDocument.upload.tip2', label: 'Upload: tip 2', default: 'Keep all four corners inside the photo' },
  { key: 'uploadDocument.upload.tip3', label: 'Upload: tip 3', default: 'Avoid glare, shadows and blur' },

  // Cropping an uploaded photo.
  { key: 'uploadDocument.crop.title', label: 'Crop: title', default: 'Crop Your Document' },
  { key: 'uploadDocument.crop.titleBack', label: 'Crop: title (back)', default: 'Crop Back of Document' },
  {
    key: 'uploadDocument.crop.description',
    label: 'Crop: description',
    default: 'Position the frame so your ID card fills it edge-to-edge.',
    multiline: true,
  },
  { key: 'uploadDocument.crop.heading', label: 'Crop: heading', default: 'Crop to ID Card' },
  { key: 'uploadDocument.crop.hint', label: 'Crop: hint', default: 'Drag to reposition · corner handles to resize' },
  { key: 'uploadDocument.crop.confirm', label: 'Crop: confirm button', default: 'Crop & Use' },

  // Front preview of a two-sided document.
  { key: 'uploadDocument.replace', label: 'Replace button', default: 'Replace' },
  { key: 'uploadDocument.frontPreview.nextScanBack', label: 'Front preview: next (scan)', default: 'Next: Scan Back' },
  { key: 'uploadDocument.frontPreview.nextUploadBack', label: 'Front preview: next (upload)', default: 'Next: Upload Back' },
  { key: 'uploadDocument.frontPreview.continueToReview', label: 'Front preview: continue to review', default: 'Continue to Review' },
  { key: 'uploadDocument.flipBanner', label: 'Flip the card banner', default: 'Great! Now flip your card over to scan the back.' },
  { key: 'uploadDocument.flipDone', label: 'Flip the card: done', default: "I've turned it over" },

  // Review.
  { key: 'uploadDocument.review.photoCaptured', label: 'Review: photo captured', default: 'Photo captured' },
  { key: 'uploadDocument.review.photoAdded', label: 'Review: photo added', default: 'Photo added' },
  { key: 'uploadDocument.review.bothCaptured', label: 'Review: both sides captured', default: 'Both sides captured' },
  { key: 'uploadDocument.review.bothAdded', label: 'Review: both sides added', default: 'Both sides added' },
  { key: 'uploadDocument.review.front', label: 'Review: front label', default: 'Front' },
  { key: 'uploadDocument.review.back', label: 'Review: back label', default: 'Back' },
  { key: 'uploadDocument.review.tapToEnlarge', label: 'Review: tap to enlarge', default: 'Tap a photo to see it larger.' },
  {
    key: 'uploadDocument.review.retrying',
    label: 'Review: retrying the upload',
    default: 'Upload failed. Retrying ({attempt}/{total})…',
    placeholders: ['attempt', 'total'],
  },
  { key: 'uploadDocument.review.uploadFailed', label: 'Review: upload failed', default: 'Upload Failed' },

  // The capture check: a photo the verification could not read.
  { key: 'uploadDocument.check.title', label: 'Check: title', default: 'Check your photos' },
  {
    key: 'uploadDocument.check.noFace',
    label: 'Check: no face on the front',
    default:
      "We couldn't see the face in the photo on the front of your ID. Retake it in good light, with the ID out of any plastic cover and no glare over the photo.",
    multiline: true,
  },
  {
    key: 'uploadDocument.check.noBarcode',
    label: 'Check: barcode not readable',
    default:
      "We couldn't read the barcode on the back of your ID. Retake it with the ID out of any plastic cover, flat, filling the frame and with no glare over the barcode.",
    multiline: true,
  },
  { key: 'uploadDocument.retakeFront', label: 'Retake front button', default: 'Retake front' },
  { key: 'uploadDocument.retakeBack', label: 'Retake back button', default: 'Retake back' },
  { key: 'uploadDocument.replaceFront', label: 'Replace front button', default: 'Replace front' },
  { key: 'uploadDocument.replaceBack', label: 'Replace back button', default: 'Replace back' },
];
