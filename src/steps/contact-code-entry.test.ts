import { readFileSync } from 'node:fs';
import { REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { describe, expect, it } from 'vitest';
import { codeFieldProps } from './ContactCodeEntry';

// The boxed code field once took pattern="^\\d*$" as a JSX string. JSX does not
// process escapes, so the pattern held a literal backslash and every digit typed
// was rejected; only paste (which skips the pattern) worked.
const source = readFileSync(new URL('./ContactCodeEntry.tsx', import.meta.url).pathname, 'utf8');

describe('ContactCodeEntry', () => {
  it('lets the boxed field accept typed digits', () => {
    expect(new RegExp(REGEXP_ONLY_DIGITS).test('123456')).toBe(true);
    expect(new RegExp(REGEXP_ONLY_DIGITS).test('12a')).toBe(false);
    expect(codeFieldProps(false).pattern).toBe(REGEXP_ONLY_DIGITS);
  });

  it('lets the boxed field accept letters only when the workflow asks for them', () => {
    expect(codeFieldProps(true).pattern).toBe(REGEXP_ONLY_DIGITS_AND_CHARS);
    expect(new RegExp(REGEXP_ONLY_DIGITS_AND_CHARS).test('k7mP2q')).toBe(true);
    expect(new RegExp(REGEXP_ONLY_DIGITS_AND_CHARS).test('K7-M')).toBe(false);
    expect(codeFieldProps(false).inputMode).toBe('numeric');
    expect(codeFieldProps(true).inputMode).toBe('text');
  });

  it('never passes the pattern as a string literal', () => {
    expect(source).not.toMatch(/pattern="/);
  });
});
