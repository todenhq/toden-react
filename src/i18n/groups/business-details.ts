import type { TextEntry } from '../types';

/** The business details step: header, register country, company search and the picked company. */
export const BUSINESS_DETAILS_TEXTS: TextEntry[] = [
  { key: 'business.details.title', label: 'Title', default: 'Business Details' },
  {
    key: 'business.details.description',
    label: 'Description',
    default:
      'Provide your business registration details for verification against the official registry.',
    multiline: true,
  },
  { key: 'business.details.countryLabel', label: 'Country of registration label', default: 'Country of registration' },
  {
    key: 'business.details.countryCaption',
    label: 'Country of registration caption',
    default: 'Registered in',
  },
  { key: 'business.details.countryPinnedLocation', label: 'Country list: your location badge', default: 'Your location' },
  { key: 'business.search.regionLabel', label: 'Search: region label', default: 'State or region of registration' },
  { key: 'business.search.regionPlaceholder', label: 'Search: region placeholder', default: 'Select the state or region' },
  { key: 'business.search.placeholder', label: 'Search: box placeholder', default: 'Search by company name' },
  { key: 'business.search.button', label: 'Search button', default: 'Search' },
  { key: 'business.search.searching', label: 'Search button: searching', default: 'Searching…' },
  { key: 'business.search.resultCount', label: 'Search: result count', default: '{count} results', placeholders: ['count'] },
  {
    key: 'business.search.resultCountFiltered',
    label: 'Search: filtered result count',
    default: '{shown} of {count} results',
    placeholders: ['shown', 'count'],
  },
  { key: 'business.search.filterLabel', label: 'Search: filter label', default: 'Filter' },
  { key: 'business.search.filterPlaceholder', label: 'Search: filter placeholder', default: 'Name or number' },
  {
    key: 'business.search.noFilterMatch',
    label: 'Search: nothing matches the filter',
    default: 'Nothing here matches “{filter}”. Clear the filter to see all {count}.',
    multiline: true,
    placeholders: ['filter', 'count'],
  },
  {
    key: 'business.search.truncated',
    label: 'Search: more results than shown',
    default: 'Showing the first {count}. Add more of the name to narrow it down.',
    multiline: true,
    placeholders: ['count'],
  },
  {
    key: 'business.search.noResults',
    label: 'Search: no results',
    default: 'Nothing found under that name. Try a shorter version of it, or enter the details yourself.',
    multiline: true,
  },
  { key: 'business.search.unavailableTitle', label: 'Search unavailable: title', default: 'Search is unavailable' },
  {
    key: 'business.search.unavailableBody',
    label: 'Search unavailable: message',
    default:
      'We could not reach the company register just now. Try again, or enter the details yourself and we will check them when you submit.',
    multiline: true,
  },
  {
    key: 'business.search.refused',
    label: 'Search by name not available',
    default: 'Search by name is not available for this verification. Enter the registration number.',
    multiline: true,
  },
  { key: 'business.search.manualEntry', label: 'Enter details myself link', default: 'Enter the details myself' },
  { key: 'business.details.pickedLabel', label: 'Picked company label', default: 'Business' },
  {
    key: 'business.details.pickedNamePending',
    label: 'Picked company: name not known yet',
    default: 'We will confirm the name with the register',
  },
  { key: 'business.details.change', label: 'Change company button', default: 'Change' },
  { key: 'business.details.registrationNumberLabel', label: 'Registration number label', default: 'Registration number' },
  { key: 'business.details.tinLabel', label: 'TIN label', default: 'TIN' },
  {
    key: 'business.details.invalidRegistrationNumber',
    label: 'Error: invalid registration number',
    default: 'Enter a valid registration number.',
  },
  { key: 'business.details.invalidTin', label: 'Error: invalid TIN', default: 'Enter a valid tin.' },
  { key: 'business.details.nameLabel', label: 'Registered name label', default: 'Registered business name' },
  {
    key: 'business.details.namePlaceholder',
    label: 'Registered name placeholder',
    default: 'Enter the registered business name',
  },
  { key: 'business.optional', label: 'Optional field marker', default: '(optional)' },
];
