import { describe, expect, it } from 'vitest';
import {
  afterDocumentCapture,
  documentCaptureMethods,
  documentCaptureNeedsCamera,
  recordsDocumentAudio,
  skipsDocumentReview,
} from './document-capture-methods';

describe('skipsDocumentReview', () => {
  it('skips the review unless the workflow asked for it', () => {
    expect(skipsDocumentReview({}, ['camera'])).toBe(true);
    expect(skipsDocumentReview(null, ['camera'])).toBe(true);
    expect(skipsDocumentReview({ documentReview: false }, ['camera'])).toBe(true);
    expect(skipsDocumentReview({ documentReview: true }, ['camera'])).toBe(false);
  });

  it('skips only when every side was scanned just now', () => {
    const off = {};
    expect(skipsDocumentReview(off, ['camera'])).toBe(true);
    expect(skipsDocumentReview(off, ['camera', 'camera'])).toBe(true);
    expect(skipsDocumentReview(off, ['camera', 'upload'])).toBe(false);
    // A restored photo: the person came back to the step, so show them it.
    expect(skipsDocumentReview(off, ['camera', null])).toBe(false);
  });
});

describe('afterDocumentCapture', () => {
  const on = { documentReview: true };
  const off = {};
  const capture = (over: Partial<Parameters<typeof afterDocumentCapture>[1]>) => ({
    side: 'front' as const,
    twoSided: false,
    front: 'camera' as const,
    back: null,
    hasBack: false,
    ...over,
  });

  it('keeps every screen while the review is on', () => {
    expect(afterDocumentCapture(on, capture({}))).toBe('review');
    expect(afterDocumentCapture(on, capture({ twoSided: true }))).toBe('preview-front');
    expect(afterDocumentCapture(on, capture({ side: 'back', twoSided: true, back: 'camera', hasBack: true }))).toBe('review');
  });

  it('hands a scanned one-sided document straight over', () => {
    expect(afterDocumentCapture(off, capture({}))).toBe('hand-over');
  });

  it('goes from a scanned front straight to the back, then hands over', () => {
    expect(afterDocumentCapture(off, capture({ twoSided: true }))).toBe('scan-back');
    expect(afterDocumentCapture(off, capture({ side: 'back', twoSided: true, back: 'camera', hasBack: true }))).toBe('hand-over');
  });

  it('hands over after retaking the front when the back was scanned', () => {
    expect(afterDocumentCapture(off, capture({ twoSided: true, back: 'camera', hasBack: true }))).toBe('hand-over');
  });

  it('always shows an uploaded photo', () => {
    expect(afterDocumentCapture(off, capture({ front: 'upload' }))).toBe('review');
    expect(afterDocumentCapture(off, capture({ twoSided: true, front: 'upload' }))).toBe('preview-front');
    expect(afterDocumentCapture(off, capture({ side: 'back', twoSided: true, back: 'upload', hasBack: true }))).toBe('review');
    expect(afterDocumentCapture(off, capture({ side: 'back', twoSided: true, front: 'upload', back: 'camera', hasBack: true }))).toBe('review');
  });

  it('stops on the front when the back was uploaded, so the person sees both', () => {
    expect(afterDocumentCapture(off, capture({ twoSided: true, back: 'upload', hasBack: true }))).toBe('preview-front');
  });

  it('shows a front whose back is a restored photo', () => {
    expect(afterDocumentCapture(off, capture({ twoSided: true, hasBack: true }))).toBe('preview-front');
  });
});

describe('recordsDocumentAudio', () => {
  it('is off unless asked for', () => {
    expect(recordsDocumentAudio({})).toBe(false);
    expect(recordsDocumentAudio({ documentAudio: true })).toBe(true);
  });

  it('has nothing to record on an upload-only flow', () => {
    expect(recordsDocumentAudio({ documentAudio: true, allowDocumentScan: false })).toBe(false);
  });
});

describe('documentCaptureMethods', () => {
  it('offers both methods when the config says nothing', () => {
    expect(documentCaptureMethods({})).toEqual({ scan: true, upload: true });
    expect(documentCaptureMethods(undefined)).toEqual({ scan: true, upload: true });
    expect(documentCaptureMethods(null)).toEqual({ scan: true, upload: true });
  });

  it('reads only an explicit false as off', () => {
    expect(documentCaptureMethods({ allowDocumentScan: true, allowDocumentUpload: true })).toEqual({
      scan: true,
      upload: true,
    });
  });

  it('is camera only when upload is switched off', () => {
    expect(documentCaptureMethods({ allowDocumentUpload: false })).toEqual({ scan: true, upload: false });
  });

  it('is upload only when the scan is switched off', () => {
    expect(documentCaptureMethods({ allowDocumentScan: false })).toEqual({ scan: false, upload: true });
  });

  it('keeps the camera on when both are switched off, never a step with no way to capture', () => {
    expect(documentCaptureMethods({ allowDocumentScan: false, allowDocumentUpload: false })).toEqual({
      scan: true,
      upload: false,
    });
  });
});

describe('documentCaptureNeedsCamera', () => {
  it('needs the camera by default', () => {
    expect(documentCaptureNeedsCamera({})).toBe(true);
    expect(documentCaptureNeedsCamera(undefined)).toBe(true);
  });

  it('needs no camera when document capture is off', () => {
    expect(documentCaptureNeedsCamera({ enableDocumentCapture: false })).toBe(false);
  });

  it('needs no camera when documents are upload only', () => {
    expect(documentCaptureNeedsCamera({ allowDocumentScan: false })).toBe(false);
  });

  it('needs the camera again when both methods are off, because the camera is the fallback', () => {
    expect(documentCaptureNeedsCamera({ allowDocumentScan: false, allowDocumentUpload: false })).toBe(true);
  });

  it('needs the camera for scan only and for both on', () => {
    expect(documentCaptureNeedsCamera({ allowDocumentUpload: false })).toBe(true);
    expect(documentCaptureNeedsCamera({ allowDocumentScan: true, allowDocumentUpload: true })).toBe(true);
  });
});
