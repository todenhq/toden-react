import { describe, it, expect } from 'vitest';
import { CORNER_HINTS, documentHintText, withCornerGuidance } from './document-hints';
import type { DocumentGuidance } from './document-framing-gate';

const holding: DocumentGuidance = { framing: 'holding', hint: 'holdStill' };

describe('withCornerGuidance', () => {
  it('keeps the framing guidance when the corners pass', () => {
    expect(withCornerGuidance(holding, null, true)).toBe(holding);
  });

  it('shows the corner problem while it objects', () => {
    expect(withCornerGuidance(holding, 'corner_cut_off', true)).toEqual({ framing: 'adjust', hint: 'fitCorners' });
    expect(withCornerGuidance(holding, 'too_close', true)).toEqual({ framing: 'adjust', hint: 'spaceAround' });
    expect(withCornerGuidance({ framing: 'none', hint: 'searching' }, 'no_document', true)).toEqual({
      framing: 'none',
      hint: 'placeDocument',
    });
  });

  it('lets "too dark" and "captured" through', () => {
    const dark: DocumentGuidance = { framing: 'none', hint: 'moreLight' };
    const done: DocumentGuidance = { framing: 'ready', hint: 'captured' };
    expect(withCornerGuidance(dark, 'no_document', true)).toBe(dark);
    expect(withCornerGuidance(done, 'too_close', true)).toBe(done);
  });

  it('stands aside when the detector cannot run', () => {
    expect(withCornerGuidance(holding, 'no_document', false)).toBe(holding);
  });
});

describe('corner hint wording', () => {
  it('reads as an instruction for each problem', () => {
    expect(documentHintText(CORNER_HINTS.no_document, 'Passport')).toBe('Place your ID inside the frame');
    expect(documentHintText(CORNER_HINTS.corner_cut_off, 'Passport')).toBe(
      'Fit all four corners of your ID inside the frame',
    );
    expect(documentHintText(CORNER_HINTS.too_close, 'Passport')).toBe(
      'Move back a little so there is space around your ID',
    );
  });
});
