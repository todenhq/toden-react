import { DEFAULT_TEXTS } from './catalogue';
import { CUSTOMISABLE_KEYS } from './customisable';
import { BUSINESS_VARIANT_BASES } from './business-variants';
import type { TextFn, TextVars, WorkflowTexts } from './types';

/** The language every workflow falls back to, and the one the defaults are in. */
export const BASE_LANGUAGE = 'en';

/** Fills `{name}` placeholders; a missing value becomes '' so no brace leaks to the screen. */
export function fillPlaceholders(template: string, vars: TextVars = {}): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, name: string) => {
    if (!(name in vars)) return match;
    const value = vars[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * The text for a key: the workflow's copy in the language, else its English
 * copy, else the SDK default. Workflow copy counts only for a customisable key. A blank override counts as unset, so clearing a
 * field in the editor restores the default rather than showing nothing.
 */
export function resolveText(
  key: string,
  options: { texts?: WorkflowTexts; language?: string; vars?: TextVars; legacy?: string | null } = {},
): string {
  const { texts, language = BASE_LANGUAGE, vars } = options;
  const usable = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);
  // Only the customisable texts take a workflow's words; the rest (errors,
  // system messages, hints) always read as the SDK wrote them.
  // A scoped business variant takes the org's words for the text it stands in
  // for (i18n/business-variants.ts); otherwise only a customisable key reads them.
  const base = BUSINESS_VARIANT_BASES[key];
  const source = CUSTOMISABLE_KEYS.has(key) ? key : base && CUSTOMISABLE_KEYS.has(base) ? base : null;
  const pick = (lang: string) => (source ? usable(texts?.[lang]?.[source]) : undefined);
  const own = language === BASE_LANGUAGE ? undefined : pick(language);
  const template = own ?? usable(options.legacy) ?? pick(BASE_LANGUAGE) ?? DEFAULT_TEXTS[key] ?? key;
  return fillPlaceholders(template, vars).replace(/[ \t]{2,}/g, ' ').trim();
}

/** A `t()` bound to one workflow's texts, language and fixed variables (tokens). */
export function createTextFn(
  texts?: WorkflowTexts,
  language?: string,
  baseVars: TextVars = {},
): TextFn {
  return (key, vars, legacy) =>
    resolveText(key, { texts, language, legacy, vars: { ...baseVars, ...vars } });
}

/** The defaults only: for pure copy modules called without a workflow. */
export const defaultText: TextFn = createTextFn();
