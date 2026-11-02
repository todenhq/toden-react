import type { TextEntry } from '../types';

/**
 * The Toden address book in the address flow: the sheet that offers a saved
 * address when the flow's email is recognised (a code, then a pick), and the
 * sheet after the review step that saves the confirmed address to their book.
 * None of these are customisable: they describe the person's own Toden account,
 * not the organisation's flow.
 */
export const ADDRESS_BOOK_ENTRIES: TextEntry[] = [
  {
    key: 'address.book.offer.title',
    label: 'Address book: offer title',
    default: 'You have a saved address',
  },
  {
    key: 'address.book.offer.titleNamed',
    label: 'Address book: offer title with the person\'s name',
    default: '{firstName}, you have a saved address',
  },
  {
    key: 'address.book.offer.description',
    label: 'Address book: offer description',
    default: "Use the address you saved with Toden so you don't have to enter it again.",
    multiline: true,
  },
  {
    key: 'address.book.offer.email',
    label: 'Address book: offer email',
    default: "We'll send a code to {email} to confirm it's you.",
    placeholders: ['email'],
  },
  {
    key: 'address.book.offer.use',
    label: 'Address book: offer use',
    default: 'Use saved address',
  },
  {
    key: 'address.book.offer.sending',
    label: 'Address book: offer sending',
    default: 'Sending code…',
  },
  {
    key: 'address.book.offer.new',
    label: 'Address book: offer new',
    default: 'Enter a new address',
  },
  {
    key: 'address.book.code.title',
    label: 'Address book: code title',
    default: 'Enter the code',
  },
  {
    key: 'address.book.code.description',
    label: 'Address book: code description',
    default: 'We sent a 6-digit code to {email}.',
    placeholders: ['email'],
  },
  {
    key: 'address.book.code.check',
    label: 'Address book: code check',
    default: 'Continue',
  },
  {
    key: 'address.book.code.checking',
    label: 'Address book: code checking',
    default: 'Checking…',
  },
  {
    key: 'address.book.code.resend',
    label: 'Address book: code resend',
    default: 'Send a new code',
  },
  {
    key: 'address.book.pick.title',
    label: 'Address book: pick title',
    default: 'Choose your address',
  },
  {
    key: 'address.book.pick.description',
    label: 'Address book: pick description',
    default: 'Only the street and area are shown here. The full address is shared once your verification is complete.',
    multiline: true,
  },
  {
    key: 'address.book.pick.use',
    label: 'Address book: pick use',
    default: 'Use this address',
  },
  {
    key: 'address.book.pick.none',
    label: 'Address book: pick none',
    default: 'There are no saved addresses you can use here. Enter a new address instead.',
    multiline: true,
  },
  {
    key: 'address.book.pick.stale',
    label: 'Address book: pick stale',
    default: 'Addresses whose presence has not been confirmed in the last six months cannot be used for this check.',
    multiline: true,
  },
  {
    key: 'address.book.presence.verified',
    label: 'Address book: presence verified',
    default: 'Presence confirmed',
  },
  {
    key: 'address.book.chosen.title',
    label: 'Address book: chosen title',
    default: 'Your saved address',
  },
  {
    key: 'address.book.chosen.badge',
    label: 'Address book: chosen badge',
    default: 'Saved address',
  },
  {
    key: 'address.book.chosen.change',
    label: 'Address book: chosen change',
    default: 'Use a different address',
  },
  {
    key: 'address.book.continue',
    label: 'Address book: continue',
    default: 'Continue',
  },
  {
    key: 'address.book.refused',
    label: 'Address book: refused',
    default: 'That saved address can no longer be used. Try again, or enter a new address.',
    multiline: true,
  },
  {
    key: 'address.book.error',
    label: 'Address book: error',
    default: 'Something went wrong. Try again.',
  },
  {
    key: 'address.book.save.title',
    label: 'Address book: save title',
    default: 'Save this address for next time?',
  },
  {
    key: 'address.book.save.description',
    label: 'Address book: save description',
    default: 'Next time a company asks for your address, you can share it in a tap. Manage it any time at me.toden.co.',
    multiline: true,
  },
  {
    key: 'address.book.save.photo',
    label: 'Address book: save photo',
    default: 'Your entrance photo is saved with it.',
  },
  {
    key: 'address.book.save.directions',
    label: 'Address book: save directions',
    default: 'Include my directions',
  },
  {
    key: 'address.book.save.confirm',
    label: 'Address book: save confirm',
    default: 'Save address',
  },
  {
    key: 'address.book.save.skip',
    label: 'Address book: save skip',
    default: 'Not now',
  },
];
