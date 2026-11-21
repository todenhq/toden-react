import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TurnOverPrompt } from './TurnOverPrompt';

describe('the turn-over prompt', () => {
  it('turns the sample over and says so, with no button: it moves on by itself', () => {
    const html = renderToStaticMarkup(
      <TurnOverPrompt
        message="Good. Now flip your card over to scan the back."
        aspect={85.6 / 53.98}
        accent="#5645F5"
        subject={{ idType: 'ghana-card', title: 'Ghana Card', country: 'Ghana', side: 'front' }}
      />,
    );
    expect(html).toContain('Now flip your card over');
    expect(html.match(/<img/g)).toHaveLength(2);
    expect(html).not.toContain('<button');
  });
});
