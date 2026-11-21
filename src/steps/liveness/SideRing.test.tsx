import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { sideSegments } from '../../lib/window-segments';
import { ATTENTION, LIT_STROKE, SIDE_OF, SideRing, WAITING, sideStates } from './SideRing';
import { RING_INSET, RING_TRACK } from './WindowRing';

const WINDOW = { width: 300, height: 400 };
const render = (asked: Parameters<typeof SideRing>[0]['asked'], done: Parameters<typeof SideRing>[0]['done']) =>
  renderToStaticMarkup(<SideRing window={WINDOW} asked={asked} done={done} track={RING_TRACK} />);
const side = (html: string, name: string) => html.match(new RegExp(`<g data-side="${name}"[^>]*>.*?</g>`))![0];

describe('which side of the window each head direction lights', () => {
  it('is the side the head goes to: left and right are the person’s own, which the mirrored picture shows as the screen’s', () => {
    expect(SIDE_OF).toEqual({ turnLeft: 'left', turnRight: 'right', lookUp: 'top', lookDown: 'bottom' });
  });

  it('lights the side asked for and leaves the rest', () => {
    expect(sideStates('turnLeft', [])).toEqual({ top: 'idle', right: 'idle', bottom: 'idle', left: 'asked' });
  });

  it('keeps a side green once it is done, whatever is asked next', () => {
    expect(sideStates('lookUp', ['turnLeft'])).toEqual({ top: 'asked', right: 'idle', bottom: 'idle', left: 'done' });
    expect(sideStates(null, ['turnLeft', 'lookUp'])).toEqual({ top: 'done', right: 'idle', bottom: 'idle', left: 'done' });
    // Done wins over asked: a green side never goes back.
    expect(sideStates('turnLeft', ['turnLeft']).left).toBe('done');
  });
});

describe('the four-sided line round the window', () => {
  it('draws the side to turn to in amber and heavier, and nothing else round it', () => {
    const left = side(render('turnLeft', []), 'left');
    expect(left).toContain('data-state="asked"');
    expect(left).toContain(`stroke="${ATTENTION}" stroke-width="${LIT_STROKE}"`);
    expect(LIT_STROKE).toBe(10);
    // One line per side: no glow, no dark edge, no second path.
    expect(left.match(/<path/g)).toHaveLength(1);
    expect(left).not.toContain('var(--primary)');
  });

  it('draws a waiting side as a quiet white line, not the workflow’s colour', () => {
    const top = side(render('turnLeft', []), 'top');
    expect(top).toContain('data-state="idle"');
    expect(top).toContain(`stroke="${WAITING}" stroke-width="6"`);
  });

  it('turns a side green when its direction is done, with no mark on the line', () => {
    const html = render('lookUp', ['turnLeft']);
    expect(side(html, 'left')).toContain('stroke="var(--verification-success)" stroke-width="6"');
    expect(html).not.toContain('<circle');
  });

  it('stays open until all four are done, then closes into one green ring', () => {
    expect(render('lookDown', ['turnLeft', 'lookUp', 'turnRight'])).toContain('data-side-ring="open"');
    const closed = render(null, ['turnLeft', 'lookUp', 'turnRight', 'lookDown']);
    expect(closed).toContain('data-side-ring="closed"');
    // The whole outline, drawn over the four parts, is what closes the gaps.
    expect(closed).toMatch(/<path d="M150 -10[^"]*" stroke="var\(--verification-success\)" stroke-width="6" opacity="1"/);
  });

  it('closes when the run’s three directions are done, not waiting for the side never asked for', () => {
    const three = ['turnLeft', 'turnRight', 'lookUp'] as const;
    const ring = (done: readonly (typeof three)[number][]) =>
      renderToStaticMarkup(<SideRing window={WINDOW} asked={null} done={done} directions={three} track={RING_TRACK} />);
    expect(ring(['turnLeft', 'turnRight'])).toContain('data-side-ring="open"');
    const closed = ring(['turnLeft', 'turnRight', 'lookUp']);
    expect(closed).toContain('data-side-ring="closed"');
    // The side no one asked for waited as a white line until then.
    expect(side(ring(['turnLeft', 'turnRight']), 'bottom')).toContain(`stroke="${WAITING}"`);
  });

  it('keeps one soft shadow under the whole line, so it reads on a pale wall and a dark room', () => {
    expect(render('turnLeft', [])).toContain('filter:drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25))');
  });

  it('goes red on a warning only where it is not lit or done', () => {
    const html = renderToStaticMarkup(
      <SideRing window={WINDOW} asked="lookUp" done={['turnLeft']} track="var(--destructive)" />,
    );
    expect(side(html, 'right')).toContain('stroke="var(--destructive)"');
    expect(side(html, 'top')).toContain(`stroke="${ATTENTION}" stroke-width="${LIT_STROKE}"`);
    expect(side(html, 'left')).toContain('stroke="var(--verification-success)"');
  });

  it('is a picture: screen readers are given the words instead', () => {
    expect(render('turnRight', [])).toContain('aria-hidden="true"');
  });
});

describe('the window’s outline cut into its four sides', () => {
  const sides = sideSegments(WINDOW, RING_INSET);
  const start = (d: string) => d.match(/^M(-?[\d.]+) (-?[\d.]+)/)!.slice(1).map(Number);
  const end = (d: string) => d.match(/(-?[\d.]+) (-?[\d.]+)$/)!.slice(1).map(Number);
  const cx = WINDOW.width / 2;
  const cy = WINDOW.height / 2;

  it('centres each part on its side, so each is its mirror image about the middle', () => {
    // Top and bottom span the middle left to right; left and right span it top to bottom.
    for (const name of ['top', 'bottom'] as const) {
      const [sx, sy] = start(sides[name]);
      const [ex, ey] = end(sides[name]);
      expect(sx! + ex!).toBeCloseTo(cx * 2, 1);
      expect(sy).toBeCloseTo(ey!, 1);
    }
    for (const name of ['left', 'right'] as const) {
      const [sx, sy] = start(sides[name]);
      const [ex, ey] = end(sides[name]);
      expect(sy! + ey!).toBeCloseTo(cy * 2, 1);
      expect(sx).toBeCloseTo(ex!, 1);
    }
  });

  it('puts each part on the side it is named for', () => {
    expect(start(sides.top)[1]).toBeLessThan(cy);
    expect(start(sides.bottom)[1]).toBeGreaterThan(cy);
    expect(start(sides.left)[0]).toBeLessThan(cx);
    expect(start(sides.right)[0]).toBeGreaterThan(cx);
  });

  it('runs the top part through twelve o’clock, where the outline itself begins, as one unbroken line', () => {
    expect(sides.top.match(/M/g)).toHaveLength(1);
    // It starts left of the middle and ends right of it.
    expect(start(sides.top)[0]).toBeLessThan(cx);
    expect(end(sides.top)[0]).toBeGreaterThan(cx);
  });
});
