// Button presses for the verification timeline ("Pressed Continue on Capturing
// document"). One delegated listener on the document, scoped to the SDK's own
// surfaces (`.verification-root`, which every portal also carries), so no
// component has to opt in and the host page's clicks are never seen.
//
// PRIVACY: a press is recorded by the CATALOGUE KEY of the control's label, and
// only when its text is exactly a piece of the SDK's own copy as this workflow
// shows it. A list of addresses, a company search result, a name: none of
// those is catalogue copy, so none can ever be recorded. A control with no
// matching label is counted as unnamed, never described.
import { DEFAULT_TEXTS } from '../i18n/catalogue';
import type { TextFn } from '../i18n/types';
import { recordClick } from './step-log';

const CLICKABLE = 'button, a[href], [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"]';
export const UNNAMED_CONTROL = 'unnamed';

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();

const lookups = new WeakMap<TextFn, Map<string, string>>();

/**
 * Every catalogue text as this workflow shows it, to its key. A shared text
 * ("Continue") takes the shared `common.*` key, so one button reads the same
 * on every step; otherwise the first key wins.
 */
function lookupFor(t: TextFn): Map<string, string> {
  const cached = lookups.get(t);
  if (cached) return cached;
  const map = new Map<string, string>();
  const keys = Object.keys(DEFAULT_TEXTS);
  const ordered = [...keys.filter((k) => k.startsWith('common.')), ...keys.filter((k) => !k.startsWith('common.'))];
  for (const key of ordered) {
    const shown = normalise(t(key));
    if (shown && !map.has(shown)) map.set(shown, key);
  }
  lookups.set(t, map);
  return map;
}

/** The English default for a key, placeholders removed, for the dashboard to read. */
function englishLabel(key: string): string {
  return normalise((DEFAULT_TEXTS[key] ?? '').replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, ''));
}

/**
 * The control a click landed on, named by its catalogue key, or null when the
 * click is not on an enabled control inside the SDK.
 */
export function controlFor(target: EventTarget | null, t: TextFn): { control: string; label: string } | null {
  // Duck-typed, not `instanceof Element`: a click inside an iframe'd host or a
  // text node's parent still answers `closest`, and it keeps this testable.
  const from = target as Element | null;
  if (typeof from?.closest !== 'function') return null;
  const el = from.closest(CLICKABLE);
  if (!el || !el.closest('.verification-root')) return null;
  if (el.matches(':disabled, [aria-disabled="true"]')) return null;
  const explicit = el.getAttribute('data-toden-action');
  if (explicit && DEFAULT_TEXTS[explicit] !== undefined) return { control: explicit, label: englishLabel(explicit) };
  const lookup = lookupFor(t);
  for (const text of [el.getAttribute('aria-label'), el.textContent]) {
    const key = text ? lookup.get(normalise(text)) : undefined;
    if (key) return { control: key, label: englishLabel(key) };
  }
  return { control: UNNAMED_CONTROL, label: '' };
}

/** Starts recording presses; returns the stop function. */
export function startClickLog(t: TextFn): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const onClick = (event: MouseEvent) => {
    const hit = controlFor(event.target, t);
    if (hit) recordClick(hit.control, hit.label);
  };
  // Capture phase, so a control that stops propagation is still counted.
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
