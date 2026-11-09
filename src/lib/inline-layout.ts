// ─── The inline (desktop) document camera's layout, as numbers ──────────────
//
// The 16:10 camera box inside the modal on a desktop. Its overlay
// (components/viewfinder/InlineOverlay.tsx) positions every control from
// these, and inlineGuideBand reserves the space they take, so the guide the
// overlay paints, the sample drawn on it and the fallback crop are one
// rectangle that never touches a control. Change a control's size here, never
// only in the component.
//
// The same arrangement as the full-screen camera (immersive-layout.ts), inside
// the box rather than a phone screen:
//
//   edge             top row: document pill (centred), side badge (right)
//        + hintGap   the instruction, up to 2 lines
//        + 12        the guide
//          ...
//        + 16        the shutter (centred), torch beside it when there is one
//   edge
//
// A small box (a narrow modal) uses the compact sizes, so the guide keeps as
// much of the box as it can; if it still does not fit, the guide shrinks,
// keeping its aspect (document-guide.ts).

import type { GuideBand } from './document-guide';

export interface InlineLayout {
  /** From the box's edges to the top row and to the bottom row. */
  edge: number;
  /** Height of the top row's pills. */
  topRowHeight: number;
  /** Between the top row's items. */
  topRowGap: number;
  /** Document pill label and side badge label, in px. */
  pillFontSize: number;
  badgeFontSize: number;
  /** The country flag in the document pill, as Tailwind size classes. */
  flagClassName: string;
  /** From the top row to the instruction. */
  hintGap: number;
  /** The instruction's text, its line and its vertical padding. */
  hintFontSize: number;
  hintLineHeight: number;
  hintPaddingV: number;
  hintMaxLines: number;
  shutterSize: number;
  /** The torch button beside the shutter. */
  sideButtonSize: number;
  /** Whether the torch button carries its caption (only where it fits). */
  sideCaptions: boolean;
}

/** Clear space between the instruction (so the top row too) and the guide. */
export const INLINE_GUIDE_GAP_BELOW_HINT = 12;
/** Clear space between the guide and the shutter. */
export const INLINE_GUIDE_GAP_ABOVE_SHUTTER = 16;

/** The full-size controls: the full-screen camera's own sizes. */
export const INLINE_REGULAR: InlineLayout = {
  edge: 16,
  topRowHeight: 44,
  topRowGap: 8,
  pillFontSize: 15,
  badgeFontSize: 14,
  flagClassName: 'h-5 w-5',
  hintGap: 12,
  hintFontSize: 15,
  hintLineHeight: 20,
  hintPaddingV: 10,
  hintMaxLines: 2,
  shutterSize: 80,
  sideButtonSize: 52,
  sideCaptions: true,
};

/** Scaled down for a small box, so the guide is not squeezed out. */
export const INLINE_COMPACT: InlineLayout = {
  edge: 8,
  topRowHeight: 30,
  topRowGap: 6,
  pillFontSize: 13,
  badgeFontSize: 12,
  flagClassName: 'h-4 w-4',
  hintGap: 6,
  hintFontSize: 13,
  hintLineHeight: 16,
  hintPaddingV: 6,
  hintMaxLines: 2,
  shutterSize: 56,
  sideButtonSize: 40,
  sideCaptions: false,
};

/** A box shorter than this (narrower than 960 at 16:10) uses the compact sizes. */
export const INLINE_COMPACT_BELOW_HEIGHT = 600;

/** The sizes for a box `height` tall. */
export function inlineLayout(height: number): InlineLayout {
  return height < INLINE_COMPACT_BELOW_HEIGHT ? INLINE_COMPACT : INLINE_REGULAR;
}

/** The top row's bottom edge. */
export function inlineTopRowBottom(l: InlineLayout): number {
  return l.edge + l.topRowHeight;
}

/** The instruction's top edge, under the top row. */
export function inlineHintTop(l: InlineLayout): number {
  return inlineTopRowBottom(l) + l.hintGap;
}

/** The glass's hairline edge (immersive-glass.ts), which the instruction's height adds. */
export const INLINE_GLASS_BORDER = 1;

/** The instruction at its tallest, its glass edge included. */
export function inlineHintMaxHeight(l: InlineLayout): number {
  return l.hintMaxLines * l.hintLineHeight + 2 * l.hintPaddingV + 2 * INLINE_GLASS_BORDER;
}

/** The lowest the instruction reaches, at its most lines. */
export function inlineHintBottom(l: InlineLayout): number {
  return inlineHintTop(l) + inlineHintMaxHeight(l);
}

/** The shutter's top edge in a box `height` tall. */
export function inlineShutterTop(height: number, l: InlineLayout): number {
  return height - l.edge - l.shutterSize;
}

/**
 * The free stretch of the box the guide is fitted into: below the instruction
 * and above the shutter, with their clear space. This is the band the overlay,
 * the sample and the fallback crop all pass to documentGuideRect.
 */
export function inlineGuideBand(size: { width: number; height: number }): GuideBand {
  const l = inlineLayout(size.height);
  return {
    top: inlineHintBottom(l) + INLINE_GUIDE_GAP_BELOW_HINT,
    bottom: inlineShutterTop(size.height, l) - INLINE_GUIDE_GAP_ABOVE_SHUTTER,
    fitLandscape: true,
  };
}
