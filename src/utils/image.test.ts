import { describe, expect, it } from 'vitest';
import { isJpegDataUri } from './image';

// compressDocumentImage keeps a JPEG that is already within the size limit
// untouched (one lossy encode, never two). This is the rule that decides which
// inputs that applies to; the canvas work itself needs a browser.

describe('isJpegDataUri', () => {
  it('recognises a JPEG data URI, however its type is spelt', () => {
    expect(isJpegDataUri('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isJpegDataUri('data:image/jpg;base64,AAAA')).toBe(true);
    expect(isJpegDataUri('DATA:IMAGE/JPEG;base64,AAAA')).toBe(true);
  });

  it('does not take another format, or a bare string, for a JPEG', () => {
    expect(isJpegDataUri('data:image/png;base64,AAAA')).toBe(false);
    expect(isJpegDataUri('data:image/webp;base64,AAAA')).toBe(false);
    expect(isJpegDataUri('data:image/jpeg-xl;base64,AAAA')).toBe(false);
    expect(isJpegDataUri('AAAA')).toBe(false);
  });
});
