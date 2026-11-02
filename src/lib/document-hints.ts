// ─── Document capture hints ─────────────────────────────────────────────────
//
// What the capture screen tells the applicant, from two sources: the framing
// gate (document-framing-gate.ts: shape, size, light, stability) and the corner
// gate (document-corners.ts: are all four corners in the frame, with room past
// them). The corner gate decides whether a photo may be taken at all, so while
// it objects its reason is the one shown.

import { defaultText } from '../i18n/translate';
import type { TextFn } from '../i18n/types';
import type { CornersProblem } from './document-corners';
import type { DocumentGuidance, DocumentHint } from './document-framing-gate';

const HINT_KEYS: Record<DocumentHint, string> = {
  searching: 'uploadDocument.hint.searching',
  moreLight: 'uploadDocument.hint.moreLight',
  wrongDocument: 'uploadDocument.hint.wrongDocument',
  moveCloser: 'uploadDocument.hint.moveCloser',
  moveBack: 'uploadDocument.hint.moveBack',
  centre: 'uploadDocument.hint.centre',
  showMrz: 'uploadDocument.hint.showMrz',
  holdStill: 'uploadDocument.hint.holdStill',
  captured: 'uploadDocument.hint.captured',
  placeDocument: 'uploadDocument.hint.placeDocument',
  fitCorners: 'uploadDocument.hint.fitCorners',
  spaceAround: 'uploadDocument.hint.spaceAround',
  faceNotDocument: 'uploadDocument.hint.faceNotDocument',
};

/** User-facing instruction for each hint, from the text catalogue. */
export function documentHintText(
  hint: DocumentHint,
  documentLabel: string,
  t: TextFn = defaultText,
): string {
  return t(HINT_KEYS[hint] ?? HINT_KEYS.searching, { document: documentLabel });
}

/** The hint for each reason the corner gate refuses a photo. */
export const CORNER_HINTS: Record<CornersProblem, DocumentHint> = {
  no_document: 'placeDocument',
  corner_cut_off: 'fitCorners',
  too_close: 'spaceAround',
  face_not_document: 'faceNotDocument',
};

/**
 * The guidance to show, given the framing gate's and the corner gate's.
 *
 * The corner gate wins while it objects: no photo can be taken until it is
 * satisfied, so telling someone to hold still while a corner is off screen
 * would ask them to wait for something that will never happen. Two framing
 * hints still outrank it: "too dark" (the likely reason nothing was found, and
 * the thing to fix first) and "captured" (the photo has been taken).
 *
 * With the detector unavailable the corner gate is not running, so the framing
 * gate's guidance stands unchanged.
 */
export function withCornerGuidance(
  guidance: DocumentGuidance,
  problem: CornersProblem | null,
  detectorAvailable: boolean,
): DocumentGuidance {
  if (!detectorAvailable || problem === null) return guidance;
  if (guidance.hint === 'moreLight' || guidance.hint === 'captured') return guidance;
  return {
    framing: problem === 'no_document' ? 'none' : 'adjust',
    hint: CORNER_HINTS[problem],
  };
}
