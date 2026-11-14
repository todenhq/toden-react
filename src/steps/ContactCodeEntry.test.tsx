import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContactCodeEntry } from './ContactCodeEntry';

// The workflow's `alphanumericCode` swaps the numeric keyboard for a text one
// that capitalises and never corrects. Off (or absent), the field is exactly
// what it was: digits on a numeric keyboard.
const render = (props: Partial<React.ComponentProps<typeof ContactCodeEntry>>) =>
  renderToStaticMarkup(
    <ContactCodeEntry code="" onChange={() => undefined} codeLength={6} style="segmented" {...props} />,
  );

describe('ContactCodeEntry keyboard', () => {
  it('keeps the numeric keyboard when letters are off', () => {
    for (const style of ['segmented', 'text'] as const) {
      const html = render({ style });
      expect(html).toContain('inputMode="numeric"');
      expect(html).not.toContain('autoCapitalize');
      expect(html).not.toContain('autoCorrect');
      expect(html).toContain('autoComplete="one-time-code"');
    }
  });

  it('switches to a capitalising text keyboard without autocorrect when letters are on', () => {
    for (const style of ['segmented', 'text'] as const) {
      const html = render({ style, alphanumeric: true });
      expect(html).toContain('inputMode="text"');
      expect(html).toContain('autoCapitalize="characters"');
      expect(html).toContain('autoCorrect="off"');
      expect(html).toContain('spellCheck="false"');
      expect(html).toContain('autoComplete="one-time-code"');
    }
  });

  it('does not suggest digits in the plain field when letters are on', () => {
    expect(render({ style: 'text' })).toContain('placeholder="000000"');
    expect(render({ style: 'text', alphanumeric: true })).toContain('placeholder="A2B3C4"');
  });
});
