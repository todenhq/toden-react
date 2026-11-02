import type { TextEntry } from '../types';

/** Finding the address: search, current location and the errors a fix can end in. */
export const ADDRESS_SEARCH_ENTRIES: TextEntry[] = [
  { key: 'address.search.title', label: 'Search: title', default: 'Find your address' },
  { key: 'address.search.title.business', label: 'Search: title (business)', default: 'Find the business premises' },
  {
    key: 'address.search.description',
    label: 'Search: description',
    default: 'Search it, use your current location, or place a pin on the map.',
    multiline: true,
  },
  {
    key: 'address.search.placeholder',
    label: 'Search: placeholder',
    default: 'Search your address, e.g. 12 Adeola Odeku Street',
  },
  {
    key: 'address.search.noMatches',
    label: 'Search: no matches (suggestions)',
    default: 'No matches. Use your location or place the pin by hand.',
  },
  {
    key: 'address.search.noMatches.basic',
    label: 'Search: no matches (search button)',
    default: 'No matches. Drag the map to place the pin instead.',
  },
  { key: 'address.currentLocation.title', label: 'Current location: title', default: 'Use my current location' },
  { key: 'address.currentLocation.finding', label: 'Current location: finding', default: 'Finding your location…' },
  {
    key: 'address.currentLocation.hint',
    label: 'Current location: hint',
    default: 'Lands the pin right where you are',
  },
  { key: 'address.search.pinInstead', label: 'Search: place a pin link', default: 'Place a pin on the map instead' },
  { key: 'address.skip', label: 'Skip for now link', default: 'Skip for now' },
  {
    key: 'address.location.denied',
    label: 'Error: location blocked',
    default:
      'Location access is blocked for this site. Allow it in your browser (on a Mac, also under System Settings, Privacy & Security, Location Services), then try again, or place the pin yourself.',
    multiline: true,
  },
  {
    key: 'address.location.unavailable',
    label: 'Error: location unavailable',
    default: 'Your device could not work out where it is right now. Try again in a moment, or place the pin yourself.',
    multiline: true,
  },
  {
    key: 'address.location.timeout',
    label: 'Error: location too slow',
    default: 'Finding your location took too long. Try again, or place the pin yourself.',
    multiline: true,
  },
  {
    key: 'address.location.unsupported',
    label: 'Error: location not supported',
    default: 'This browser cannot share your location. Place the pin yourself.',
    multiline: true,
  },
];
