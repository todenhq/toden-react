import type { TextGroup } from '../types';
import { CONTACT_CODE_TEXTS } from './contact-code';

/** The email and phone one-time-code steps, and the phone number field. */
export const CONTACT_TEXTS: TextGroup = {
  id: 'contact',
  title: 'Email and phone codes',
  entries: [
    { key: 'contact.email.title', label: 'Email: title', default: 'Verify your email' },
    {
      key: 'contact.email.intro',
      label: 'Email: description',
      default: "We'll send a one-time code to confirm this email belongs to you.",
      multiline: true,
    },
    { key: 'contact.phone.title', label: 'Phone: title', default: 'Verify your phone number' },
    {
      key: 'contact.phone.intro',
      label: 'Phone: description',
      default: "We'll send a one-time code by {channel} to confirm this number belongs to you.",
      multiline: true,
      placeholders: ['channel'],
    },
    {
      key: 'contact.email.recovery',
      label: 'Email: confirmation expired notice',
      default:
        'Your earlier confirmation has expired, so please verify your email once more. Everything else is saved, and we will submit again straight after.',
      multiline: true,
    },
    {
      key: 'contact.phone.recovery',
      label: 'Phone: confirmation expired notice',
      default:
        'Your earlier confirmation has expired, so please verify your number once more. Everything else is saved, and we will submit again straight after.',
      multiline: true,
    },
    // A scoped business workflow confirms the COMPANY's contact details
    // (lib/scope.ts isScopedBusiness); i18n/business-variants.ts lets an
    // org's words for the base text apply to these too.
    { key: 'contact.email.title.business', label: 'Email: title (business)', default: 'Verify your business email' },
    {
      key: 'contact.email.intro.business',
      label: 'Email: description (business)',
      default: "We'll send a one-time code to confirm this email address belongs to your business.",
      multiline: true,
    },
    { key: 'contact.phone.title.business', label: 'Phone: title (business)', default: 'Verify your business phone number' },
    {
      key: 'contact.phone.intro.business',
      label: 'Phone: description (business)',
      default: "We'll send a one-time code by {channel} to confirm this number belongs to your business.",
      multiline: true,
      placeholders: ['channel'],
    },
    { key: 'contact.email.label.business', label: 'Email: field label (business)', default: 'Business email address' },
    { key: 'contact.phone.label.business', label: 'Phone: field label (business)', default: 'Business phone number' },
    { key: 'contact.email.label', label: 'Email: field label', default: 'Email address' },
    { key: 'contact.email.placeholder', label: 'Email: field placeholder', default: 'you@example.com' },
    { key: 'contact.phone.label', label: 'Phone: field label', default: 'Phone number' },
    { key: 'contact.phone.placeholder', label: 'Phone: field placeholder', default: '803 123 4567' },
    { key: 'contact.phone.search', label: 'Phone: country search placeholder', default: 'Search country or code' },
    { key: 'contact.phone.noMatches', label: 'Phone: no countries found', default: 'No matches' },
    { key: 'contact.phone.yourLocation', label: 'Phone: your location badge', default: 'Your location' },
    { key: 'contact.channel.question', label: 'Channel picker: label', default: 'How should we send it?' },
    { key: 'contact.channel.sms', label: 'Channel: SMS', default: 'SMS' },
    { key: 'contact.channel.smsHint', label: 'Channel: SMS hint', default: 'Text message' },
    { key: 'contact.channel.whatsapp', label: 'Channel: WhatsApp', default: 'WhatsApp' },
    { key: 'contact.channel.whatsappHint', label: 'Channel: WhatsApp hint', default: 'Needs WhatsApp installed' },
    { key: 'contact.sendCode', label: 'Send code button', default: 'Send code' },
    { key: 'contact.skip', label: 'Skip button', default: 'Skip for now' },
    { key: 'contact.email.footer', label: 'Email: footer note', default: 'We only use this to verify your identity.' },
    {
      key: 'contact.email.footer.business',
      label: 'Email: footer note (business)',
      default: 'We only use this to verify your business.',
    },
    { key: 'contact.phone.footer', label: 'Phone: footer note', default: 'Standard message rates may apply.' },
    ...CONTACT_CODE_TEXTS,
  ],
};
