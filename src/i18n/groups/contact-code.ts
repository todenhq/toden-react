import type { TextEntry } from '../types';

/** The code-entry half of the contact steps, and its error messages. */
export const CONTACT_CODE_TEXTS: TextEntry[] = [
  {
    key: 'contact.email.codeSent',
    label: 'Email: code sent description',
    default: 'Enter the {codeLength}-digit code we sent to {destination}.',
    placeholders: ['codeLength', 'destination'],
  },
  {
    key: 'contact.phone.codeSent',
    label: 'Phone: code sent description',
    default: 'Enter the {codeLength}-digit code we sent to {destination} by {channel}.',
    multiline: true,
    placeholders: ['codeLength', 'destination', 'channel'],
  },
  { key: 'contact.code.label', label: 'Code: field label', default: 'Verification code' },
  { key: 'contact.code.paste', label: 'Code: paste link', default: 'Paste code' },
  {
    key: 'contact.code.pasteNone',
    label: 'Code: nothing to paste',
    default: 'No code found. Copy it from your message and try again.',
  },
  { key: 'contact.code.expiresSoon', label: 'Code: expiry notice', default: 'The code expires in 5 minutes.' },
  { key: 'contact.code.expired', label: 'Code: expired', default: 'The code has expired. Request a new one.' },
  { key: 'contact.code.resend', label: 'Code: resend link', default: 'Resend code' },
  {
    key: 'contact.code.otherChannel',
    label: 'Code: send by the other channel',
    default: 'Didn’t get it? Send by {channel} instead',
    placeholders: ['channel'],
  },
  { key: 'contact.verifyCode', label: 'Verify code button', default: 'Verify code' },
  {
    key: 'contact.verified',
    label: 'Verified notice',
    default: '{destination} is verified.',
    placeholders: ['destination'],
  },
  {
    key: 'contact.error.invalidCode',
    label: 'Error: wrong code',
    default: 'That code is not correct. Please try again.',
  },
  { key: 'contact.error.codeExpired', label: 'Error: code expired', default: 'This code has expired. Request a new one.' },
  {
    key: 'contact.error.tooManyAttempts',
    label: 'Error: too many attempts',
    default: 'Too many incorrect attempts. Request a new code.',
  },
  {
    key: 'contact.error.codeInvalid',
    label: 'Error: code no longer valid',
    default: 'This code is no longer valid. Request a new one.',
  },
  {
    key: 'contact.error.invalidDestination',
    label: 'Error: email or number not valid',
    default: 'That does not look valid. Please check and try again.',
  },
  {
    key: 'contact.error.rateLimited',
    label: 'Error: too many codes',
    default: 'Too many codes requested. Please wait a while and try again.',
    multiline: true,
  },
  { key: 'contact.error.sendFailed', label: 'Error: could not send', default: 'We could not send the code. Please try again.' },
  {
    key: 'contact.error.network',
    label: 'Error: network',
    default: 'Network error. Check your connection and try again.',
  },
  { key: 'contact.error.generic', label: 'Error: something went wrong', default: 'Something went wrong. Please try again.' },
];
