import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DocumentGhost } from './DocumentGhost';
import { InlineOverlay } from './InlineOverlay';

const subject = { idType: 'pvc', title: "Permanent Voter's Card", country: 'Nigeria', side: 'back' as const };
const FLIP = 'Good. Now flip your card over to scan the back.';
const overlay = (turning: boolean) =>
  renderToStaticMarkup(
    <InlineOverlay
      side="back"
      documentLabel="Voter's card"
      specimen={subject}
      showSpecimen
      turning={turning}
      guideAspect={85.6 / 53.98}
      framing="none"
      progress={0}
      hint={FLIP}
      hintTone="neutral"
      busy={false}
      onCapture={() => {}}
      shutterBlockedReason={FLIP}
      primaryColor="#5645F5"
    />,
  );

describe('the sample in the frame between the two sides', () => {
  it('renders as the turn-over and as the plain sample', () => {
    // The guide is measured in the browser, so the faces themselves are drawn there.
    expect(() =>
      renderToStaticMarkup(<DocumentGhost aspect={1.586} accent="#5645F5" subject={subject} turnFrom="front" holding />),
    ).not.toThrow();
    expect(() => renderToStaticMarkup(<DocumentGhost aspect={1.586} accent="#5645F5" subject={subject} />)).not.toThrow();
  });

  it('keeps the frame, the side and the instruction up while it turns, with the shutter saying why it waits', () => {
    const html = overlay(true);
    expect(html).toContain(FLIP);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('animate-spin');
  });

  it('draws the same frame during the turn as for the scan that follows', () => {
    expect(overlay(true)).toBe(overlay(false));
  });
});
