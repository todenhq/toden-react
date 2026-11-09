import { readFileSync } from 'node:fs';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { describe, expect, it } from 'vitest';

// The boxed code field once took pattern="^\\d*$" as a JSX string. JSX does not
// process escapes, so the pattern held a literal backslash and every digit typed
// was rejected; only paste (which skips the pattern) worked.
const source = readFileSync(new URL('./ContactCodeEntry.tsx', import.meta.url).pathname, 'utf8');

describe('ContactCodeEntry', () => {
  it('lets the boxed field accept typed digits', () => {
    expect(new RegExp(REGEXP_ONLY_DIGITS).test('123456')).toBe(true);
    expect(new RegExp(REGEXP_ONLY_DIGITS).test('12a')).toBe(false);
    expect(source).toContain('pattern={REGEXP_ONLY_DIGITS}');
  });

  it('never passes the pattern as a string literal', () => {
    expect(source).not.toMatch(/pattern="/);
  });
});
