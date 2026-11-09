import { describe, expect, it } from 'vitest';
import {
  CARD_GUIDE_ASPECT,
  NIN_SLIP_GUIDE_ASPECT,
  PASSPORT_GUIDE_ASPECT,
  documentCropRect,
  documentGuideRect,
} from './document-guide';
import { immersiveBand, immersiveGuideBand } from './document-turn';
import {
  BOTTOM_ROW_HEIGHT,
  GUIDE_GAP_ABOVE_CONTROLS,
  GUIDE_GAP_BELOW_HINT,
  GUIDE_GAP_BELOW_TOP_BAR,
  HINT_LINE_HEIGHT,
  HINT_MAX_HEIGHT,
  HINT_PADDING_V,
  TOP_BAR_HEIGHT,
  bottomRowReserve,
  hintBottom,
  hintTop,
  safeBottom,
  safeTop,
  topBarTop,
} from './immersive-layout';
import { turnedHintBox } from './turned-hint';
import { immersiveHintTone, primaryOnDark } from '../components/viewfinder/immersive-glass';

// The full-screen document camera: top bar, instruction, guide, bottom row.
// The guide must keep clear of both, with the stated gaps, on every phone.
// Mirrors the React Native SDK's __tests__/immersiveLayout.test.ts.

const PHONES = [
  { name: 'iPhone 15', width: 393, height: 852, top: 56, bottom: 34 },
  { name: 'iPhone 16 Pro Max', width: 440, height: 956, top: 56, bottom: 34 },
  { name: 'iPhone SE', width: 375, height: 667, top: 56, bottom: 0 },
  { name: 'small Android', width: 360, height: 740, top: 32, bottom: 16 },
];

const UPRIGHT_SLIP = 1 / NIN_SLIP_GUIDE_ASPECT;

describe('the layout rhythm', () => {
  it('puts the top bar 8 under the safe inset and the instruction 12 under the bar', () => {
    expect(topBarTop(56)).toBe(64);
    expect(hintTop(56)).toBe(64 + TOP_BAR_HEIGHT + 12);
    expect(HINT_MAX_HEIGHT).toBe(2 * HINT_LINE_HEIGHT + 2 * HINT_PADDING_V);
  });

  it('sits the bottom row 16 above the safe inset, captions included', () => {
    // Shutter 80; the 52 side buttons centred on it with a 6 gap and a 16 caption below.
    expect(BOTTOM_ROW_HEIGHT).toBe(88);
    expect(bottomRowReserve(34)).toBe(34 + 16 + 88);
  });

  it('positions the controls against env(safe-area-inset-*)', () => {
    expect(safeTop(hintTop(0))).toBe('calc(env(safe-area-inset-top) + 64px)');
    expect(safeBottom(16)).toBe('calc(env(safe-area-inset-bottom) + 16px)');
  });

  it('reserves the top bar + 16 and the bottom row + 24 for an upright guide', () => {
    expect(immersiveBand(56, 34)).toEqual({ topReserve: 56 + 68, bottomReserve: 34 + 128 });
    expect(immersiveGuideBand(852, 56, 34)).toEqual({ top: 124, bottom: 852 - 162 });
  });
});

describe.each(PHONES)('the guide on $name', (phone) => {
  const view = { width: phone.width, height: phone.height };
  const band = immersiveGuideBand(phone.height, phone.top, phone.bottom);

  it('stands a turned NIN slip 16 below the top bar and 24 above the bottom row, centred between', () => {
    const g = documentGuideRect(view, UPRIGHT_SLIP, band);
    const above = g.y - (topBarTop(phone.top) + TOP_BAR_HEIGHT);
    const below = phone.height - bottomRowReserve(phone.bottom) - (g.y + g.height);
    expect(above).toBeGreaterThanOrEqual(GUIDE_GAP_BELOW_TOP_BAR - 0.001);
    expect(below).toBeGreaterThanOrEqual(GUIDE_GAP_ABOVE_CONTROLS - 0.001);
    expect(above - GUIDE_GAP_BELOW_TOP_BAR).toBeCloseTo(below - GUIDE_GAP_ABOVE_CONTROLS, 5);
    expect(g.height / g.width).toBeCloseTo(NIN_SLIP_GUIDE_ASPECT, 5);
  });

  it('leaves room beside a turned slip for its one-line hint', () => {
    const g = documentGuideRect(view, UPRIGHT_SLIP, band);
    expect(turnedHintBox(g).height).toBeGreaterThanOrEqual(HINT_LINE_HEIGHT + 2 * HINT_PADDING_V);
  });

  it.each([
    ['card', CARD_GUIDE_ASPECT],
    ['passport', PASSPORT_GUIDE_ASPECT],
  ])('keeps a %s guide 16 below a two-line instruction and 24 above the bottom row', (_, aspect) => {
    // The band the overlay passes: a landscape guide is centred, as React Native draws it.
    const g = documentGuideRect(view, aspect, band);
    expect(g.y - hintBottom(phone.top)).toBeGreaterThanOrEqual(GUIDE_GAP_BELOW_HINT);
    expect(phone.height - bottomRowReserve(phone.bottom) - (g.y + g.height)).toBeGreaterThanOrEqual(
      GUIDE_GAP_ABOVE_CONTROLS,
    );
  });
});

describe('a landscape guide on a 393 x 852 phone', () => {
  // React Native's guideRect: centred in the view with no upward nudge and no
  // height cap, inside the free band between the top bar and the bottom row.
  const view = { width: 393, height: 852 };
  const band = immersiveGuideBand(852, 59, 34);

  it.each([
    ['card', CARD_GUIDE_ASPECT],
    ['passport', PASSPORT_GUIDE_ASPECT],
  ])('centres a %s guide exactly, inside the band', (_, aspect) => {
    const g = documentGuideRect(view, aspect, band);
    expect(g.y + g.height / 2).toBeCloseTo(view.height / 2, 9);
    expect(g.x + g.width / 2).toBeCloseTo(view.width / 2, 9);
    expect(g.width).toBeCloseTo(view.width * 0.88, 9);
    expect(g.height).toBeCloseTo(g.width / aspect, 9);
    expect(g.y).toBeGreaterThanOrEqual(band.top);
    expect(g.y + g.height).toBeLessThanOrEqual(band.bottom);
  });

  it('crops the rectangle the immersive overlay draws', () => {
    const frame = { width: 1080, height: 1920 };
    const g = documentGuideRect(view, CARD_GUIDE_ASPECT, band);
    const crop = documentCropRect({ frame, view, aspect: CARD_GUIDE_ASPECT, band })!;
    const f = Math.max(view.width / frame.width, view.height / frame.height);
    expect(crop.y).toBeCloseTo((g.y + (frame.height * f - view.height) / 2) / f, 0);
    expect(crop.height).toBeCloseTo(g.height / f, 0);
  });
});

describe('immersiveHintTone', () => {
  const base = { hint: 'searching' as const, framing: 'none' as const, hintIsAction: false, blocked: false };

  it('is neutral while searching', () => {
    expect(immersiveHintTone(base)).toBe('neutral');
  });

  it('is an action when the gate asks for one or holds the shutter', () => {
    expect(immersiveHintTone({ ...base, hint: 'moveCloser', framing: 'adjust', hintIsAction: true })).toBe('action');
    expect(immersiveHintTone({ ...base, blocked: true, framing: 'ready' })).toBe('action');
  });

  it('warns for too dark and the wrong document', () => {
    expect(immersiveHintTone({ ...base, hint: 'moreLight', hintIsAction: true })).toBe('warning');
    expect(immersiveHintTone({ ...base, hint: 'wrongDocument', hintIsAction: true })).toBe('warning');
    expect(immersiveHintTone({ ...base, framing: 'wrongShape' })).toBe('warning');
  });

  it('is ready while holding', () => {
    expect(immersiveHintTone({ ...base, hint: 'holdStill', framing: 'holding' })).toBe('ready');
    expect(immersiveHintTone({ ...base, hint: 'captured', framing: 'ready' })).toBe('ready');
  });
});

describe('primaryOnDark', () => {
  it('lifts the brand colour towards white and leaves other formats alone', () => {
    expect(primaryOnDark('#5645F5')).not.toBe('#5645F5');
    expect(primaryOnDark('#000000')).toBe('#595959');
    expect(primaryOnDark('rgb(1,2,3)')).toBe('rgb(1,2,3)');
  });
});
