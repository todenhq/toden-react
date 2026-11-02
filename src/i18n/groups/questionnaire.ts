import type { TextGroup } from '../types';

/**
 * The questionnaire step's own chrome. The questions, their options and help
 * text are written by the organisation in the questionnaire itself.
 */
export const QUESTIONNAIRE_TEXTS: TextGroup = {
  id: 'questionnaire',
  title: 'Questionnaire',
  entries: [
    {
      key: 'questionnaire.title',
      label: 'Title',
      default: 'A few more questions',
      configPath: ['questionnaire', 'title'],
    },
    {
      key: 'questionnaire.description',
      label: 'Description',
      default: 'This information is required for compliance and helps keep your account safe.',
      multiline: true,
      configPath: ['questionnaire', 'description'],
    },
    {
      key: 'questionnaire.title.business',
      label: 'Title (business)',
      default: 'A few questions about your business',
    },
    {
      key: 'questionnaire.description.business',
      label: 'Description (business)',
      default: 'This information is required for compliance and helps keep your business account safe.',
      multiline: true,
    },
    { key: 'questionnaire.amountPlaceholder', label: 'Amount placeholder', default: '0.00' },
    { key: 'questionnaire.selectPlaceholder', label: 'Choice placeholder', default: 'Select an option' },
    { key: 'questionnaire.detailLabel', label: 'Other: label', default: 'Please specify' },
    {
      key: 'questionnaire.detailPlaceholder',
      label: 'Other: placeholder',
      default: 'Tell us more about "{option}"',
      placeholders: ['option'],
    },
    { key: 'questionnaire.yes', label: 'Yes option', default: 'Yes' },
    { key: 'questionnaire.no', label: 'No option', default: 'No' },
    { key: 'questionnaire.error.required', label: 'Error: required', default: 'This field is required.' },
    {
      key: 'questionnaire.error.detailRequired',
      label: 'Error: other needs detail',
      default: 'Tell us more about "{option}".',
      placeholders: ['option'],
    },
    { key: 'questionnaire.error.invalidAmount', label: 'Error: invalid amount', default: 'Enter a valid amount.' },
    { key: 'questionnaire.error.invalidNumber', label: 'Error: invalid number', default: 'Enter a valid number.' },
    { key: 'questionnaire.error.min', label: 'Error: below minimum', default: 'Must be at least {min}.', placeholders: ['min'] },
    { key: 'questionnaire.error.max', label: 'Error: above maximum', default: 'Must be at most {max}.', placeholders: ['max'] },
  ],
};
