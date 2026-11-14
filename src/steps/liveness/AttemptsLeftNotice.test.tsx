import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AttemptsLeftNotice } from './AttemptsLeftNotice';

// The attempts left under a failed liveness check: a small warning, not a
// second line of the red reason (React Native drew it in the reason's red).

describe('the attempts-left notice', () => {
  const html = renderToStaticMarkup(<AttemptsLeftNotice text="2 attempts left." />);

  it('is real text, read by a screen reader', () => {
    expect(html).toContain('>2 attempts left.</span>');
  });

  it('is a warning pill in the body colour, not red or muted', () => {
    expect(html).toContain('rounded-full');
    expect(html).toContain('bg-[#FFF1D6]');
    expect(html).toContain('dark:bg-[#2B1B00]');
    expect(html).toContain('text-foreground');
    expect(html).not.toContain('text-destructive');
    expect(html).not.toContain('text-muted-foreground');
  });

  it('carries a decorative warning glyph', () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-icon="TriangleAlert"|<svg[^>]*data-icon="TriangleAlert"[^>]*aria-hidden="true"/);
  });
});
