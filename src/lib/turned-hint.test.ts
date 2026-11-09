import { describe, expect, it } from 'vitest';
import { NIN_SLIP_GUIDE_ASPECT, documentGuideRect } from './document-guide';
import { immersiveGuideBand } from './document-turn';
import { TURNED_HINT_ROTATION, turnedHintBox } from './turned-hint';

// The hint beside an upright (turned) NIN slip guide turns with the sample and
// fills the space along the guide's left edge. Mirrors the React Native SDK's
// __tests__/turnedHint.test.ts and the Flutter SDK's
// document_viewfinder_turned_hint_test.dart.

const PHONE = { width: 440, height: 956 };

describe('turnedHintBox', () => {
  const guide = documentGuideRect(PHONE, 1 / NIN_SLIP_GUIDE_ASPECT, immersiveGuideBand(PHONE.height, 62, 34));
  const box = turnedHintBox(guide);

  it('turns a quarter clockwise, as the sample is drawn', () => {
    expect(TURNED_HINT_ROTATION).toBe('90deg');
  });

  it('once turned, fills the space left of the guide and no more', () => {
    // A box turned about its centre swaps its width and height.
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const turned = {
      left: cx - box.height / 2,
      right: cx + box.height / 2,
      top: cy - box.width / 2,
      bottom: cy + box.width / 2,
    };
    expect(turned.left).toBeCloseTo(0, 5);
    expect(turned.right).toBeCloseTo(guide.x, 5);
    expect(turned.top).toBeCloseTo(guide.y, 5);
    expect(turned.bottom).toBeCloseTo(guide.y + guide.height, 5);
  });

  it('runs along the guide rather than across it', () => {
    expect(box.width).toBeGreaterThan(box.height);
  });
});
