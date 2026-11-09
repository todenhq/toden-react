import type { TextGroup } from '../types';

/** Choosing where the ID was issued, which ID, and typing its number. */
export const SELECT_DOCUMENT_TEXTS: TextGroup = {
  id: 'selectDocument',
  title: 'Select Document',
  entries: [
    { key: 'selectDocument.country.title', label: 'Country: title', default: 'Where was your ID issued?' },
    {
      key: 'selectDocument.country.description',
      label: 'Country: description',
      default: 'Choose the country that issued your identity document.',
    },
    { key: 'selectDocument.country.label', label: 'Country: field label', default: 'Your ID was issued in' },
    { key: 'selectDocument.country.placeholder', label: 'Country: placeholder', default: 'Select a country' },
    { key: 'selectDocument.country.change', label: 'Country: change', default: 'Change' },
    { key: 'selectDocument.country.choose', label: 'Country: choose', default: 'Choose' },
    { key: 'selectDocument.country.selected', label: 'Country: selected tag', default: 'Selected' },
    { key: 'selectDocument.combined.title', label: 'Country and ID: title', default: 'Choose your ID' },
    {
      key: 'selectDocument.combined.description',
      label: 'Country and ID: description',
      default: 'Pick the country that issued it, then the ID you will use.',
    },
    { key: 'selectDocument.country.search', label: 'Country: search placeholder', default: 'Search countries…' },
    { key: 'selectDocument.country.yourLocation', label: 'Country: your location badge', default: 'Your location' },
    { key: 'selectDocument.country.noResults', label: 'Country: no results', default: 'No countries found.' },
    { key: 'selectDocument.region.africa', label: 'Region: Africa', default: 'Africa' },
    { key: 'selectDocument.region.europe', label: 'Region: Europe', default: 'Europe' },
    { key: 'selectDocument.region.americas', label: 'Region: Americas', default: 'Americas' },
    { key: 'selectDocument.region.middleEast', label: 'Region: Middle East', default: 'Middle East' },
    { key: 'selectDocument.region.asiaPacific', label: 'Region: Asia and Pacific', default: 'Asia & Pacific' },
    { key: 'selectDocument.region.other', label: 'Region: other', default: 'Other' },
    { key: 'selectDocument.multiId.slot', label: 'Multiple IDs: ID number', default: 'ID {number}', placeholders: ['number'] },
    { key: 'selectDocument.idType.title', label: 'ID type: title', default: 'Select ID Type' },
    {
      key: 'selectDocument.idType.description',
      label: 'ID type: description',
      default: "Choose the type of identification document you'd like to use.",
    },
    { key: 'selectDocument.idType.loading', label: 'ID type: loading', default: 'Loading available ID types…' },
    {
      key: 'selectDocument.idType.empty',
      label: 'ID type: none available',
      default: 'No ID types are enabled for your organization. Contact your administrator to request access.',
      multiline: true,
    },
    { key: 'selectDocument.idInput.defaultLabel', label: 'ID number: default name', default: 'ID Number' },
    {
      key: 'selectDocument.idInput.title',
      label: 'ID number: title',
      default: 'Enter your {idLabel}',
      placeholders: ['idLabel'],
    },
    {
      key: 'selectDocument.idInput.description',
      label: 'ID number: description',
      default: 'We’ll check this against the official record.',
    },
    {
      key: 'selectDocument.idInput.placeholder',
      label: 'ID number: placeholder',
      default: 'Enter your {idLabel}',
      placeholders: ['idLabel'],
    },
    {
      key: 'selectDocument.idInput.placeholderDigits',
      label: 'ID number: placeholder with length',
      default: 'Enter {digits}-digit {idLabel}',
      placeholders: ['digits', 'idLabel'],
    },
  ],
};
