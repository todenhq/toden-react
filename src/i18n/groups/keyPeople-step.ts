import type { TextEntry } from '../types';

/** The key people step: header, hints, sections, cards and totals. */
export const KEY_PEOPLE_STEP_TEXTS: TextEntry[] = [
  { key: 'keyPeople.title', label: 'Title', default: 'Key people' },
  {
    key: 'keyPeople.description',
    label: 'Description',
    default: "Add the company's directors, shareholders and beneficial owners.",
  },
  {
    key: 'keyPeople.hints.skippable',
    label: 'Hint: you can skip this',
    default:
      'You can skip this if you’re unsure. We’ll identify directors and owners from the official registry. Adding them here speeds up the review.',
    multiline: true,
  },
  {
    key: 'keyPeople.hints.ownershipPending',
    label: 'Hint: shareholders still arriving from the register',
    default:
      'We are still getting the shareholders from the register. You can add them now, or they will be added when they arrive.',
    multiline: true,
  },
  { key: 'keyPeople.reading.title', label: 'Reading screen: title', default: 'Reading your company documents' },
  {
    key: 'keyPeople.reading.description',
    label: 'Reading screen: description',
    default:
      "We're finding the people your documents name, so you only need to check them and add their emails.",
    multiline: true,
  },
  { key: 'keyPeople.reading.stage1', label: 'Reading screen: looking for directors', default: 'Looking for the directors' },
  {
    key: 'keyPeople.reading.stage2',
    label: 'Reading screen: looking for shareholders',
    default: 'Looking for the shareholders and their stakes',
  },
  { key: 'keyPeople.reading.stage3', label: 'Reading screen: matching the company', default: 'Checking the names belong to your company' },
  {
    key: 'keyPeople.reading.slow',
    label: 'Reading screen: taking longer than usual',
    default: 'Long documents take a little longer. If it runs on, the list opens in a moment and the people are added when we finish.',
    multiline: true,
  },
  { key: 'keyPeople.reading.foundOne', label: 'Reading screen: one person found', default: 'Found 1 person' },
  {
    key: 'keyPeople.reading.foundMany',
    label: 'Reading screen: several people found',
    default: 'Found {count} people',
    placeholders: ['count'],
  },
  {
    key: 'keyPeople.hints.readingDocuments',
    label: 'Hint: reading the company documents for their people',
    default:
      'We are reading your company documents for the people they name. You can add people now, or they will be filled in when we finish.',
    multiline: true,
  },
  {
    key: 'keyPeople.hints.fromDocumentsOne',
    label: 'Hint: one person filled in from the company documents',
    default:
      'We filled in {count} person from your company documents. Check the details and add their email so we can send their verification link.',
    placeholders: ['count'],
    multiline: true,
  },
  {
    key: 'keyPeople.hints.fromDocumentsMany',
    label: 'Hint: several people filled in from the company documents',
    default:
      "We filled in {count} people from your company documents. Check the details and add each person's email so we can send their verification link.",
    placeholders: ['count'],
    multiline: true,
  },
  {
    key: 'keyPeople.hints.keptFromRemovedOne',
    label: 'Hint: one person kept from a removed company document',
    default:
      '{count} person came from a document you removed. We kept them because you had changed their details. Check they still belong.',
    placeholders: ['count'],
    multiline: true,
  },
  {
    key: 'keyPeople.hints.keptFromRemovedMany',
    label: 'Hint: several people kept from a removed company document',
    default:
      '{count} people came from a document you removed. We kept them because you had changed their details. Check they still belong.',
    placeholders: ['count'],
    multiline: true,
  },
  {
    key: 'keyPeople.hints.minimumOne',
    label: 'Hint: minimum of one person',
    default: 'List at least {count} person to continue.',
    placeholders: ['count'],
  },
  {
    key: 'keyPeople.hints.minimumMany',
    label: 'Hint: minimum of several people',
    default: 'List at least {count} people to continue.',
    placeholders: ['count'],
  },
  {
    key: 'keyPeople.hints.minimumOneProgress',
    label: 'Hint: minimum of one person, with progress',
    default: 'List at least {count} person to continue ({added} of {count} added).',
    placeholders: ['count', 'added'],
  },
  {
    key: 'keyPeople.hints.minimumManyProgress',
    label: 'Hint: minimum of several people, with progress',
    default: 'List at least {count} people to continue ({added} of {count} added).',
    placeholders: ['count', 'added'],
  },
  { key: 'keyPeople.section.ubos.title', label: 'Beneficial owners: heading', default: 'Beneficial owners' },
  {
    key: 'keyPeople.section.ubos.description',
    label: 'Beneficial owners: description',
    default: 'Individuals who own {threshold}% or more of the company.',
    placeholders: ['threshold'],
  },
  { key: 'keyPeople.section.ubos.add', label: 'Beneficial owners: add button', default: 'Add a beneficial owner' },
  {
    key: 'keyPeople.exemption.label',
    label: 'No beneficial owner: checkbox',
    default:
      'UBOs cannot be identified due to public share structures, complex trusts or nominee arrangements.',
    multiline: true,
  },
  {
    key: 'keyPeople.exemption.note',
    label: 'No beneficial owner: note when ticked',
    default:
      "We will record this with the application; a senior person is still identified through the applicant's own verification.",
    multiline: true,
  },
  { key: 'keyPeople.section.shareholders.title', label: 'Shareholders: heading', default: 'Shareholders' },
  {
    key: 'keyPeople.section.shareholders.description',
    label: 'Shareholders: description',
    default: 'People or companies holding under {threshold}%.',
    placeholders: ['threshold'],
  },
  { key: 'keyPeople.section.shareholders.add', label: 'Shareholders: add button', default: 'Add a shareholder' },
  {
    key: 'keyPeople.section.representatives.title',
    label: 'Representatives: heading',
    default: 'Directors & representatives',
  },
  {
    key: 'keyPeople.section.representatives.description',
    label: 'Representatives: description',
    default: 'People who act on behalf of the company.',
  },
  { key: 'keyPeople.section.representatives.add', label: 'Representatives: add button', default: 'Add a representative' },
  {
    key: 'keyPeople.section.quickAdd',
    label: 'Quick add heading',
    default: 'Quick add from people you already entered',
  },
  { key: 'keyPeople.role.director', label: 'Role: director', default: 'Director' },
  { key: 'keyPeople.role.beneficialOwner', label: 'Role: beneficial owner', default: 'Beneficial owner (UBO)' },
  { key: 'keyPeople.role.signatory', label: 'Role: signatory', default: 'Signatory' },
  { key: 'keyPeople.role.shareholder', label: 'Role: shareholder', default: 'Shareholder' },
  { key: 'keyPeople.card.unnamedCompany', label: 'Card: unnamed company', default: 'Unnamed company' },
  { key: 'keyPeople.card.unnamedPerson', label: 'Card: unnamed person', default: 'Unnamed person' },
  { key: 'keyPeople.card.documentRemoved', label: 'Card: from a removed document', default: 'From a document you removed. Check they belong.' },
  { key: 'keyPeople.card.company', label: 'Card: company tag', default: 'Company' },
  { key: 'keyPeople.card.ownership', label: 'Card: ownership', default: '{pct}% ownership', placeholders: ['pct'] },
  { key: 'keyPeople.card.emailRequired', label: 'Card: email missing', default: 'Email required, tap to add' },
  { key: 'keyPeople.card.ownershipRequired', label: 'Card: ownership missing', default: 'Ownership % required, tap to add' },
  { key: 'keyPeople.card.incomplete', label: 'Card: incomplete', default: 'Incomplete, tap to finish' },
  {
    key: 'keyPeople.limit',
    label: 'Maximum people reached',
    default: 'You can list up to {count} people here.',
    placeholders: ['count'],
  },
  { key: 'keyPeople.totals.label', label: 'Total ownership label', default: 'Total ownership listed' },
  {
    key: 'keyPeople.totals.overError',
    label: 'Error: total over 100%',
    default: 'Together the percentages can’t exceed 100%, so reduce them by {over}%.',
    multiline: true,
    placeholders: ['over'],
  },
];
