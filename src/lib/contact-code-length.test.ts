import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sentCodeLength } from './contact-code-length';

describe('sentCodeLength', () => {
  it('takes the length the server says it sent', () => {
    expect(sentCodeLength(8, 6)).toBe(8);
    expect(sentCodeLength(4, 6)).toBe(4);
  });

  it('keeps the configured length when an older server says nothing', () => {
    expect(sentCodeLength(undefined, 5)).toBe(5);
    expect(sentCodeLength(null, 5)).toBe(5);
  });

  it('ignores a length no code could have', () => {
    expect(sentCodeLength(3, 6)).toBe(6);
    expect(sentCodeLength(9, 6)).toBe(6);
    expect(sentCodeLength(5.5, 6)).toBe(6);
    expect(sentCodeLength('6', 5)).toBe(5);
  });
});

describe('the contact step', () => {
  const step = readFileSync(new URL('../steps/ContactVerificationStep.tsx', import.meta.url).pathname, 'utf8');

  it('names the session on the send and sizes the field from the response', () => {
    expect(step).toContain('...(state.sessionId ? { sessionId: state.sessionId } : {})');
    expect(step).toContain('setSentLength(sentCodeLength(res.codeLength, configuredLength))');
  });
});
