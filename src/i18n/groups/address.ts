import type { TextGroup } from '../types';
import { ADDRESS_INTRO_ENTRIES } from './address-intro';
import { ADDRESS_SEARCH_ENTRIES } from './address-search';
import { ADDRESS_PIN_ENTRIES } from './address-pin';
import { ADDRESS_DETAILS_ENTRIES } from './address-details';
import { ADDRESS_FINISH_ENTRIES } from './address-finish';
import { ADDRESS_BACKGROUND_ENTRIES } from './address-background';
import { ADDRESS_BOOK_ENTRIES } from './address-book';

/** The address flow, in the order the applicant meets it. */
export const ADDRESS_TEXTS: TextGroup = {
  id: 'address',
  title: 'Address',
  entries: [
    ...ADDRESS_INTRO_ENTRIES,
    ...ADDRESS_BOOK_ENTRIES,
    ...ADDRESS_SEARCH_ENTRIES,
    ...ADDRESS_PIN_ENTRIES,
    ...ADDRESS_DETAILS_ENTRIES,
    ...ADDRESS_FINISH_ENTRIES,
    ...ADDRESS_BACKGROUND_ENTRIES,
  ],
};
