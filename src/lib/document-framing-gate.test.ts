import { describe, expect, it } from 'vitest';
import {
  DocumentFramingGate,
  documentBoxFrom,
  type DocumentBox,
} from './document-framing-gate';

// Thresholds are unit-tested rather than tuned by trial on a device — the same
// reason the Flutter gate this ports is tested rather than eyeballed.

const CARD = 85.6 / 53.98; // 1.586

/** A well-framed card: right shape, comfortably sized, centred. */
function goodBox(over: Partial<DocumentBox> = {}): DocumentBox {
  return {
    aspectRatio: CARD,
    area: 0.5,
    edgeMargin: 0.08,
    offCentre: 0.02,
    confidence: 0.9,
    ...over,
  };
}

describe('DocumentFramingGate', () => {
  it('reports searching with nothing in frame, and asks for light when dark', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD });
    expect(gate.update(null)).toEqual({ framing: 'none', hint: 'searching' });
    expect(gate.update(null, { brightness: 0.1 })).toEqual({
      framing: 'none',
      hint: 'moreLight',
    });
  });

  it('rejects a wrong-shaped object as the wrong document, not bad framing', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD });
    // An A4 page / book is far from 1.586.
    const res = gate.update(goodBox({ aspectRatio: 0.7 }));
    expect(res).toEqual({ framing: 'wrongShape', hint: 'wrongDocument' });
  });

  it('says MOVE BACK before centring — an overflowing document is usually also off-centre', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD });
    const res = gate.update(goodBox({ area: 0.95, offCentre: 0.5 }));
    expect(res.hint).toBe('moveBack');
    // Edge margin alone is enough to mean "move back", even at a sane area.
    expect(gate.update(goodBox({ edgeMargin: 0.001 })).hint).toBe('moveBack');
  });

  it('distinguishes too small from off-centre', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD });
    expect(gate.update(goodBox({ area: 0.1 })).hint).toBe('moveCloser');
    expect(gate.update(goodBox({ offCentre: 0.4 })).hint).toBe('centre');
  });

  it('holds through the dwell, then fires exactly once', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD, dwellMs: 900 });
    expect(gate.update(goodBox(), { at: 1000 }).framing).toBe('holding');
    expect(gate.progress(1450)).toBeCloseTo(0.5, 1);
    expect(gate.update(goodBox(), { at: 1899 }).framing).toBe('holding');
    expect(gate.update(goodBox(), { at: 1900 })).toEqual({
      framing: 'ready',
      hint: 'captured',
    });
    expect(gate.hasFired).toBe(true);
    // Latched: a later frame cannot re-fire mid-capture.
    expect(gate.update(null, { at: 5000 }).framing).toBe('ready');
  });

  it('resets the dwell when the document drifts out — a re-entry must not shoot early', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD, dwellMs: 900 });
    gate.update(goodBox(), { at: 1000 });
    gate.update(goodBox({ area: 0.1 }), { at: 1500 }); // drifted
    expect(gate.progress(1500)).toBe(0);
    // Back in frame — the clock starts again, so 1900 is no longer enough.
    expect(gate.update(goodBox(), { at: 1600 }).framing).toBe('holding');
    expect(gate.update(goodBox(), { at: 1900 }).framing).toBe('holding');
  });

  it('asks for light when well framed but dim, rather than firing a dark shot', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD });
    const res = gate.update(goodBox(), { brightness: 0.1 });
    expect(res).toEqual({ framing: 'adjust', hint: 'moreLight' });
  });

  it('reset clears both the dwell and the fired latch', () => {
    const gate = new DocumentFramingGate({ expectedAspect: CARD, dwellMs: 10 });
    gate.update(goodBox(), { at: 0 });
    gate.update(goodBox(), { at: 100 });
    expect(gate.hasFired).toBe(true);
    gate.reset();
    expect(gate.hasFired).toBe(false);
    expect(gate.progress(200)).toBe(0);
  });
});

describe('DocumentFramingGate with an upright guide', () => {
  // A NIN slip turned upright on a tall screen (lib/document-turn.ts).
  const UPRIGHT = 1 / 2.07;

  it('accepts the slip turned upright', () => {
    const gate = new DocumentFramingGate({ expectedAspect: UPRIGHT });
    expect(gate.matchesShape(goodBox({ aspectRatio: UPRIGHT }))).toBe(true);
  });

  it('accepts exactly the shapes the landscape guide would, turned', () => {
    const landscape = new DocumentFramingGate({ expectedAspect: 2.07 });
    const upright = new DocumentFramingGate({ expectedAspect: UPRIGHT });
    for (const ratio of [1.3, 1.5, 1.6, 2.07, 2.5, 2.7, 3]) {
      expect(upright.matchesShape(goodBox({ aspectRatio: 1 / ratio }))).toBe(
        landscape.matchesShape(goodBox({ aspectRatio: ratio })),
      );
    }
  });

  it('refuses a landscape card while expecting an upright slip', () => {
    const gate = new DocumentFramingGate({ expectedAspect: UPRIGHT });
    expect(gate.update(goodBox()).framing).toBe('wrongShape');
  });
});

describe('documentBoxFrom', () => {
  it('normalises pixel bounds into the shares the gate judges', () => {
    const box = documentBoxFrom(
      { x: 10, y: 20, width: 80, height: 50 },
      { width: 100, height: 100 },
    );
    expect(box).not.toBeNull();
    expect(box!.aspectRatio).toBeCloseTo(1.6, 2);
    expect(box!.area).toBeCloseTo(0.4, 3);
    // Smallest of: left .10, top .20, right .10, bottom .30
    expect(box!.edgeMargin).toBeCloseTo(0.1, 3);
    // Centre (0.50, 0.45) vs frame centre (0.5, 0.5)
    expect(box!.offCentre).toBeCloseTo(0.05, 2);
  });

  it('returns null for a degenerate frame or box rather than NaN geometry', () => {
    expect(
      documentBoxFrom({ x: 0, y: 0, width: 10, height: 10 }, { width: 0, height: 0 }),
    ).toBeNull();
    expect(
      documentBoxFrom({ x: 0, y: 0, width: 0, height: 0 }, { width: 100, height: 100 }),
    ).toBeNull();
  });
});
