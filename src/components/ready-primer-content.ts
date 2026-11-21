import { createElement } from 'react';
import { DIRECTION_GESTURES, GesturePreview } from '../steps/liveness/GesturePreview';
import { DocumentScanPreview } from '../steps/DocumentScanPreview';
import type { DocumentSpecimenSubject } from './viewfinder/DocumentGhost';
import { BellRing, FlashOff, Glasses, IdCard, LocateFixed, MapPin, MapPinned, ScanFace, ScanLine, Sun, Timer } from './icons';
import type { ReadyPrimerProps } from './ReadyPrimer';

/**
 * Copy for the two "here's what happens next" screens, in ONE place.
 *
 * Both the real capture steps and the builder-preview placeholder render these,
 * and the preview's whole job is to show what end users will see — so the two
 * must never drift. Keeping the strings here rather than inline in each step is
 * what makes that guarantee cheap.
 */
export type ReadyContent = Pick<
  ReadyPrimerProps,
  'icon' | 'hero' | 'title' | 'body' | 'ownBodyOnly' | 'ownTitleOnly' | 'heroBoxed' | 'checklist' | 'textKeys'
>;

// `title`, `body` and the checklist hold the English defaults; `textKeys` name
// the catalogue entries (`primer.*`) ReadyPrimer shows instead, so a workflow's
// copy reaches every screen that spreads one of these in.

export const READY_DOCUMENT: ReadyContent = {
  icon: ScanLine,
  // A document in the camera's frame being read. The step puts in the
  // document the person chose (documentReady).
  hero: createElement(DocumentScanPreview, {
    subject: { idType: null, title: 'Document', country: null },
    twoSided: true,
    accent: '#5645F5',
  }),
  title: "You're about to scan your document",
  body: "We'll read the details for you. Nothing is shared until you submit.",
  checklist: [
    { icon: IdCard, label: 'Have your document with you' },
    { icon: Sun, label: 'Find even lighting, avoid glare' },
    { icon: Timer, label: 'Takes a few seconds' },
  ],
  textKeys: {
    title: 'primer.document.title',
    body: 'primer.document.body',
    checklist: ['primer.document.checklist1', 'primer.document.checklist2', 'primer.document.checklist3'],
  },
};

export const READY_LIVENESS: ReadyContent = {
  icon: ScanFace,
  // The camera's own window, with a cartoon person running through the
  // gestures the camera may ask for.
  hero: createElement(GesturePreview),
  title: "Let's confirm you're really here",
  // The picture above the title shows what is about to happen, so the stock
  // sentence under it is left out. A workflow's own sentence is still shown.
  body: '',
  ownBodyOnly: true,
  // No "put your face in the circle": the picture above shows the window, and
  // the camera says it when the face is not in it (user, 2026-11-16).
  checklist: [
    { icon: Glasses, label: 'Take off glasses, hats, caps or anything covering your face' },
    { icon: Sun, label: 'Choose a bright spot, with the light in front of you' },
    { icon: FlashOff, label: 'Keep glare and shiny reflections off your face' },
  ],
  textKeys: {
    title: 'primer.selfie.title',
    body: 'primer.selfie.body',
    checklist: ['primer.selfie.checklist2', 'primer.selfie.checklist4', 'primer.selfie.checklist5'],
  },
};

/** The head directions set: the person in the window turns left and right and
 *  looks up and down, as the camera will ask. */
export const READY_LIVENESS_DIRECTIONS: ReadyContent = {
  ...READY_LIVENESS,
  hero: createElement(GesturePreview, { gestures: DIRECTION_GESTURES }),
};

/** Passive Liveness asks for no gestures, so its picture shows none, and a
 *  workflow's own description for it is kept apart. */
export const READY_LIVENESS_PASSIVE: ReadyContent = {
  ...READY_LIVENESS,
  // Nothing to copy: the person in the window holds still, as they will.
  hero: createElement(GesturePreview, { gestures: [] }),
  textKeys: { ...READY_LIVENESS.textKeys!, body: 'primer.selfie.bodyPassive' },
};

export const READY_ADDRESS: ReadyContent = {
  icon: MapPin,
  title: "Let's confirm your address",
  body: "You'll place a pin exactly where you live. Over the next few days your phone quietly confirms you're really there. No paperwork, nothing else to do.",
  checklist: [
    { icon: MapPinned, label: 'Put the pin right on your building' },
    { icon: LocateFixed, label: 'Keep location enabled on this phone' },
    { icon: BellRing, label: "You'll be notified once it's confirmed" },
  ],
};

/**
 * The document screen for the document the person chose: the camera guide's
 * own sample of it being read (turning over only when it has two sides), and
 * its short name in the words (`{document}` in the texts: "Passport", not
 * "International Passport").
 */
export function documentReady(document: {
  /** Its name as the step shows it (shortDocumentLabel). */
  name: string;
  /** What the camera guide draws: its ID type, title and country. */
  subject: Omit<DocumentSpecimenSubject, 'side'>;
  twoSided: boolean;
  /** The workflow's colour, which the sample is printed in. */
  accent: string;
}): ReadyContent & { textVars: Record<string, string> } {
  return {
    ...READY_DOCUMENT,
    hero: createElement(DocumentScanPreview, {
      subject: document.subject,
      twoSided: document.twoSided,
      accent: document.accent,
    }),
    textVars: { document: document.name },
    // The step's heading above already names the document and says what to
    // do, so the stock title and sentence under the picture are left out
    // (user, 2026-11-16). A workflow's own words for them are still shown.
    ownTitleOnly: true,
    ownBodyOnly: true,
    // The document's picture sits in the screen's tinted box.
    heroBoxed: true,
  };
}
