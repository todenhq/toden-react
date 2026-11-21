import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StepCount } from './surfaces';

describe('the step count under the camera', () => {
  it('is a pill on screen for the classic gestures', () => {
    const html = renderToStaticMarkup(<StepCount step={1} total={3} />);
    expect(html).toContain('Step 1 of 3');
    expect(html).not.toContain('sr-only');
  });

  it('is for screen readers only with head directions, where the line shows the progress', () => {
    const html = renderToStaticMarkup(<StepCount step={2} total={3} visuallyHidden />);
    expect(html).toBe('<p class="sr-only">Step 2 of 3</p>');
  });

  it('is told to hide by the live view whenever the line is four sides', async () => {
    const { readFileSync } = await import('node:fs');
    const live = readFileSync(new URL('./LiveView.tsx', import.meta.url).pathname, 'utf8');
    expect(live).toContain('<StepCount step={p.step} total={p.total} visuallyHidden={!!p.sides} />');
  });
});
