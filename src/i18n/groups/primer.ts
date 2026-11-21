import type { TextGroup } from '../types';

/**
 * The "before you start" screens shown before a camera opens: what the next
 * capture is about to do, then why the browser is about to ask for the camera.
 */
export const PRIMER_TEXTS: TextGroup = {
  id: 'primer',
  title: 'Before you start',
  entries: [
    // Document capture: shown once before the document camera opens.
    // {document} is the name of the document the person chose: "International
    // Passport", "National ID Card" and so on.
    {
      key: 'primer.document.title',
      label: 'Document: title',
      default: "You're about to scan your {document}",
      placeholders: ['document'],
    },
    {
      key: 'primer.document.body',
      label: 'Document: description',
      default: "We'll read the details for you. Nothing is shared until you submit.",
      placeholders: ['document'],
      multiline: true,
    },
    {
      key: 'primer.document.checklist1',
      label: 'Document: checklist 1',
      default: 'Have your {document} with you',
      placeholders: ['document'],
    },
    { key: 'primer.document.checklist2', label: 'Document: checklist 2', default: 'Find even lighting, avoid glare' },
    { key: 'primer.document.checklist3', label: 'Document: checklist 3', default: 'Takes a few seconds' },

    // Selfie capture: shown once before the liveness camera opens.
    { key: 'primer.selfie.title', label: 'Selfie: title', default: "Let's confirm you're really here" },
    // The web SDK shows these two only where a workflow has written its own:
    // the picture above the title already shows what is about to happen
    // (components/ready-primer-content.ts). The mobile SDKs, which have no
    // such picture, still show the default.
    {
      key: 'primer.selfie.body',
      label: 'Selfie: description',
      default: "You'll follow a few short prompts on screen. This proves a real person is present, not a photo or a recording.",
      multiline: true,
    },
    {
      key: 'primer.selfie.bodyPassive',
      label: 'Selfie: description (Passive Liveness)',
      default: "You'll hold still and look at the camera for a moment. This proves a real person is present, not a photo or a recording.",
      multiline: true,
    },
    { key: 'primer.selfie.checklist1', label: 'Selfie: checklist 1', default: 'Put your face in the circle' },
    { key: 'primer.selfie.checklist2', label: 'Selfie: checklist 2', default: 'Take off glasses, hats, caps or anything covering your face' },
    // checklist3 was the time line and is retired (the screen no longer shows
    // a duration). The light line took a new key rather than reusing it, since
    // a published key keeps its meaning; the label follows the screen's order.
    { key: 'primer.selfie.checklist4', label: 'Selfie: checklist 3', default: 'Choose a bright spot, with the light in front of you' },
    { key: 'primer.selfie.checklist5', label: 'Selfie: checklist 4', default: 'Keep glare and shiny reflections off your face' },

    { key: 'primer.readyButton', label: 'Ready button', default: "I'm ready" },

    // Camera permission: shown just before the browser's own camera prompt.
    { key: 'primer.camera.title', label: 'Camera access: title', default: 'Allow camera access' },
    {
      key: 'primer.camera.body',
      label: 'Camera access: description',
      default: 'When prompted, allow camera access to continue your verification.',
      multiline: true,
    },
    {
      key: 'primer.camera.bodyDocument',
      label: 'Camera access: description (document)',
      default: 'When prompted, allow camera access to photograph your document.',
      multiline: true,
    },
    { key: 'primer.camera.button', label: 'Camera access: button', default: 'Grant access' },
  ],
};
