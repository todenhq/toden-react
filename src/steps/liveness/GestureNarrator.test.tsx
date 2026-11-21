import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GestureNarrator, NARRATOR_COLOUR } from './GestureNarrator';

describe('the gesture narrator', () => {
  it('is drawn in white, as the line round the window is, and solid', () => {
    const html = renderToStaticMarkup(<GestureNarrator gesture="turn" respondedAtRef={{ current: 0 }} windowWidth={240} />);
    expect(NARRATOR_COLOUR).toBe('#ffffff');
    expect(html).toContain('stroke="#ffffff"');
    expect(html).not.toContain('var(--primary)');
    // Flat lines: no edge or shadow round them.
    expect(html).not.toContain('drop-shadow');
  });

  it('is a picture: screen readers are given the words instead', () => {
    const html = renderToStaticMarkup(<GestureNarrator gesture="blink" respondedAtRef={{ current: 0 }} windowWidth={240} />);
    expect(html).toContain('aria-hidden="true"');
  });

  it('is not there without a gesture', () => {
    const html = renderToStaticMarkup(<GestureNarrator gesture={null} respondedAtRef={{ current: 0 }} windowWidth={240} />);
    expect(html).toContain('opacity:0');
  });
});
