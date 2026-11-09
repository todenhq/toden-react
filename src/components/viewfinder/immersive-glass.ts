import type { DocumentFraming, DocumentHint } from '../../lib/document-framing-gate';

// ─── The one surface every control over the full-screen camera sits on ─────
//
// A dark glass with a hairline edge. Flat rather than frosted so the back
// button, the pills and the bottom buttons read as one set over any scene.
// Mirrors the React Native SDK's components/viewfinder/immersiveGlass.ts.

export const IMMERSIVE_GLASS = {
  fill: 'rgba(12,14,22,0.62)',
  /** The fill while pressed: a background change only, never a layout shift. */
  pressed: 'rgba(12,14,22,0.82)',
  border: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  caption: 'rgba(255,255,255,0.85)',
} as const;

/**
 * The glass as Tailwind classes, with its pressed fill. The values are
 * IMMERSIVE_GLASS's, spelled out because Tailwind reads class names from the
 * source text.
 */
export const GLASS_CLASSES =
  'border border-[rgba(255,255,255,0.14)] bg-[rgba(12,14,22,0.62)] text-white active:bg-[rgba(12,14,22,0.82)]';

/** The theme's success and warning colours (globals.css), with the SDK defaults. */
export const SUCCESS_COLOUR = 'var(--verification-success, #0DA211)';
export const WARNING_COLOUR = 'var(--verification-warning, #FFC107)';
/** The shutter's inner disc while it cannot take a photo (RN theme gray400). */
export const SHUTTER_IDLE_COLOUR = '#B8BDC8';

/** The colour of the instruction's status icon. */
export type HintTone = 'neutral' | 'action' | 'ready' | 'warning';

/**
 * True when the hint is asking the person to change something. Mirrors the
 * React Native SDK's documentHintIsAction, with this SDK's names for the corner
 * gate's hints.
 */
export function documentHintIsAction(hint: DocumentHint): boolean {
  return (
    hint === 'moreLight' ||
    hint === 'wrongDocument' ||
    hint === 'showMrz' ||
    hint === 'moveCloser' ||
    hint === 'moveBack' ||
    hint === 'centre' ||
    hint === 'placeDocument' ||
    hint === 'fitCorners' ||
    hint === 'spaceAround' ||
    hint === 'faceNotDocument'
  );
}

/**
 * Sorts the capture gate's current hint into a tone, from states the gate
 * already reports; it decides nothing new.
 */
export function immersiveHintTone(p: {
  hint: DocumentHint;
  framing: DocumentFraming;
  hintIsAction: boolean;
  /** The corner gate is holding the shutter. */
  blocked: boolean;
}): HintTone {
  if (p.blocked) return 'action';
  if (p.hint === 'moreLight' || p.hint === 'wrongDocument' || p.framing === 'wrongShape') return 'warning';
  if (p.framing === 'holding' || p.framing === 'ready' || p.hint === 'holdStill' || p.hint === 'captured') return 'ready';
  return p.hintIsAction ? 'action' : 'neutral';
}

/** Mixes two `#rrggbb` colours, `t` of the way from `a` to `b`. */
function mixHex(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const out = [1, 3, 5].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** The brand colour lifted towards white so it reads on the dark glass. */
export function primaryOnDark(primary: string): string {
  return /^#[0-9a-f]{6}$/i.test(primary) ? mixHex(primary, '#FFFFFF', 0.35) : primary;
}
