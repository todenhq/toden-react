import { TEXT_GROUPS } from './catalogue';
import { FLOW_TEXTS } from './customisable-flow';
import { IDENTITY_TEXTS } from './customisable-identity';
import { OUTCOME_TEXTS } from './customisable-outcomes';
import type { TextAvailability, TextGroup } from './types';

/**
 * The texts an org may change: the wording an applicant reads on each screen.
 * Everything else in the catalogue (errors, system messages, loading and status
 * lines, input placeholders, the legal line, and any text with a `{value}`
 * filled in) keeps the SDK's own wording, and the SDK ignores a custom text for
 * it.
 *
 * Each entry says where it appears, so the editor only lists what a workflow
 * can actually show: identity texts on an identity workflow, business texts on
 * a business one, and a step's texts only while that step is on.
 */

/**
 * Key to where it appears. Chosen for what an org has a reason to reword: each
 * screen's title and description, the explanations and checklists, field
 * labels, helper lines and buttons. Always kept as the SDK wrote them: errors
 * and system messages, loading and status lines, input placeholders, the legal
 * line, and any text with a `{value}` filled in. The lists live in
 * customisable-identity.ts, customisable-flow.ts and customisable-outcomes.ts
 * (200-line rule).
 */
export const CUSTOMISABLE_AVAILABILITY: Record<string, TextAvailability> = {
  ...IDENTITY_TEXTS,
  ...FLOW_TEXTS,
  ...OUTCOME_TEXTS,
};

/**
 * Editor labels that differ from the catalogue's. The list is already narrowed
 * to one kind of workflow, so a "(business)" suffix only adds noise.
 */
const LABELS: Record<string, string> = {
  'address.search.title.business': 'Search: title',
  'address.background.title.business': 'Background checks: title',
  'address.background.description.business': 'Background checks: description',
  'address.pin.title.business': 'Pin: title',
  'address.entrance.description.photo.business': 'Entrance: description (photo)',
  'address.review.title.business': 'Review: title',
  'address.review.badge.business': 'Review: badge',
  'result.success.description.business': 'Success: description',
  'result.completed.approved.description.business': 'Returning applicant, verified: description',
  'result.completed.declined.description.business': 'Returning applicant, not verified: description',
  'result.completed.approved.title': 'Returning applicant, verified: title',
  'result.completed.declined.title': 'Returning applicant, not verified: title',
};

/** The keys a workflow may change; the SDK reads custom copy for these only. */
export const CUSTOMISABLE_KEYS: ReadonlySet<string> = new Set(Object.keys(CUSTOMISABLE_AVAILABILITY));

/**
 * The editor's list: the catalogue's groups narrowed to the customisable
 * texts, each carrying where it appears. Groups left empty are dropped.
 */
export const CUSTOMISABLE_TEXTS: TextGroup[] = TEXT_GROUPS.map((group) => ({
  ...group,
  entries: group.entries
    .filter((entry) => CUSTOMISABLE_KEYS.has(entry.key))
    .map((entry) => ({
      ...entry,
      label: LABELS[entry.key] ?? entry.label,
      availability: CUSTOMISABLE_AVAILABILITY[entry.key],
    })),
})).filter((group) => group.entries.length > 0);
