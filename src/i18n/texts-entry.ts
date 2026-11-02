/**
 * `@toden/react/texts`: the text catalogue alone, with no React and
 * no screens, so a settings page can list every customisable text without
 * loading the SDK.
 */
export { TEXT_GROUPS, DEFAULT_TEXTS } from './catalogue';
export { CUSTOMISABLE_AVAILABILITY, CUSTOMISABLE_KEYS, CUSTOMISABLE_TEXTS } from './customisable';
export { BASE_LANGUAGE, fillPlaceholders, resolveText } from './translate';
export type {
  TextAvailability,
  TextEntry,
  TextGroup,
  TextStep,
  TextSubject,
  TextVars,
  WorkflowTexts,
} from './types';
