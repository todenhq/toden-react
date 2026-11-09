import type { TextEntry } from '../types';

/**
 * The "allow all the time" screen the mobile SDKs show right after a flow with
 * presence monitoring is submitted, and the success card's title when the
 * person said no. Only the texts an org may reword are here; the screen's
 * reasons, the lines carrying a number and the what-to-tap hints keep the
 * SDK's wording. The web SDK has no background location, so it shows none.
 */
export const ADDRESS_BACKGROUND_ENTRIES: TextEntry[] = [
  {
    key: 'address.background.title',
    label: 'Background checks: title',
    default: 'Confirm your address automatically',
  },
  {
    key: 'address.background.title.business',
    label: 'Background checks: title (business)',
    default: 'Confirm the premises automatically',
  },
  {
    key: 'address.background.description',
    label: 'Background checks: description',
    default: "Allow location all the time and your phone checks in on its own while you're at home.",
    multiline: true,
  },
  {
    key: 'address.background.description.business',
    label: 'Background checks: description (business)',
    default: "Allow location all the time and your phone checks in on its own while you're at the premises.",
    multiline: true,
  },
  { key: 'address.background.allow', label: 'Background checks: allow button', default: 'Continue with automatic checks' },
  { key: 'address.background.later', label: 'Background checks: later button', default: 'Not now' },
  {
    key: 'address.presence.off.title',
    label: 'Presence card, checks off: title',
    default: 'One more step to finish',
  },
];
