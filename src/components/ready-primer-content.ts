import { BellRing, FlashOff, Glasses, IdCard, LocateFixed, MapPin, MapPinned, ScanFace, ScanLine, Sun, Timer, UserRound } from './icons';
import type { ReadyPrimerProps } from './ReadyPrimer';

/**
 * Copy for the two "here's what happens next" screens, in ONE place.
 *
 * Both the real capture steps and the builder-preview placeholder render these,
 * and the preview's whole job is to show what end users will see — so the two
 * must never drift. Keeping the strings here rather than inline in each step is
 * what makes that guarantee cheap.
 */
export type ReadyContent = Pick<ReadyPrimerProps, 'icon' | 'title' | 'body' | 'checklist' | 'textKeys'>;

// `title`, `body` and the checklist hold the English defaults; `textKeys` name
// the catalogue entries (`primer.*`) ReadyPrimer shows instead, so a workflow's
// copy reaches every screen that spreads one of these in.

export const READY_DOCUMENT: ReadyContent = {
  icon: ScanLine,
  title: "You're about to scan your ID",
  body: "We'll photograph your document and read it automatically. Nothing is shared until you submit.",
  checklist: [
    { icon: IdCard, label: 'Have your physical document with you' },
    { icon: Sun, label: 'Find even lighting, avoid glare' },
    { icon: Timer, label: 'Takes about a minute' },
  ],
  textKeys: {
    title: 'primer.document.title',
    body: 'primer.document.body',
    checklist: ['primer.document.checklist1', 'primer.document.checklist2', 'primer.document.checklist3'],
  },
};

export const READY_LIVENESS: ReadyContent = {
  icon: ScanFace,
  title: "Let's confirm you're really here",
  body: "You'll follow a few short prompts on screen. This proves a real person is present, not a photo or a recording.",
  checklist: [
    { icon: UserRound, label: 'Put your face in the circle' },
    { icon: Glasses, label: 'Take off glasses or anything covering your face' },
    { icon: Sun, label: 'Choose a bright spot, with the light in front of you' },
    { icon: FlashOff, label: 'Keep glare and shiny reflections off your face' },
  ],
  textKeys: {
    title: 'primer.selfie.title',
    body: 'primer.selfie.body',
    checklist: ['primer.selfie.checklist1', 'primer.selfie.checklist2', 'primer.selfie.checklist4', 'primer.selfie.checklist5'],
  },
};

/** Passive Liveness asks for no prompts, so its description says so. */
export const READY_LIVENESS_PASSIVE: ReadyContent = {
  ...READY_LIVENESS,
  body: "You'll hold still and look at the camera for a moment. This proves a real person is present, not a photo or a recording.",
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
