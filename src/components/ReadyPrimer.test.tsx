import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { createTextFn } from '../i18n/translate';
import type { WorkflowTexts } from '../i18n/types';
import { ReadyPrimer } from './ReadyPrimer';
import { documentReady, READY_LIVENESS, READY_LIVENESS_PASSIVE } from './ready-primer-content';

// The workflow's own copy, which a real flow hands down through its config.
let workflowTexts: WorkflowTexts | undefined;
vi.mock('../i18n', async (original) => ({
  ...(await original<typeof import('../i18n')>()),
  useText: () => createTextFn(workflowTexts),
}));

const STOCK = 'This proves a real person is present';

function shown(content: typeof READY_LIVENESS, texts?: WorkflowTexts): string {
  workflowTexts = texts;
  return renderToStaticMarkup(<ReadyPrimer {...content} onReady={() => undefined} />);
}

describe('the screen before a capture', () => {
  it.each([
    ['liveness', READY_LIVENESS],
    ['passive liveness', READY_LIVENESS_PASSIVE],
  ])('before %s the title stands alone: the picture above it shows what is coming', (_, content) => {
    const html = shown(content);
    expect(html).toContain('Let&#x27;s confirm you&#x27;re really here');
    expect(html).not.toContain(STOCK);
    // The camera's window, with the cartoon person in it, in place of the glyph's ring.
    expect(html).toContain('viewBox="0 0 768 768"');
    expect(html).not.toContain('animate-pulse-ring');
    // The picture stands on the page: no tinted box round its own window.
    expect(html).not.toContain('bg-primary/5');
    // The picture shows the window, and the camera says it when the face is
    // not in it: no checklist line for it.
    expect(html).not.toContain('Put your face in the circle');
    expect(html).toContain('Take off glasses');
  });

  it('a workflow’s own sentence for the liveness screen is still shown', () => {
    const html = shown(READY_LIVENESS, {
      en: { 'primer.selfie.body': 'Hold your phone at eye level.' },
    });
    expect(html).toContain('Hold your phone at eye level.');
    expect(html).not.toContain(STOCK);
  });

  it('a sentence written for the gesture check is not shown before a passive one', () => {
    const texts = { en: { 'primer.selfie.body': 'Copy the face.' } };
    expect(shown(READY_LIVENESS_PASSIVE, texts)).not.toContain('Copy the face.');
  });

  const passport = () =>
    documentReady({
      name: 'Passport',
      subject: { idType: 'passport', title: 'Passport', country: 'Nigeria' },
      twoSided: false,
      accent: '#5645F5',
    });

  it('a passport is called a passport, and pictured with the camera guide’s own sample', () => {
    const html = shown(passport());
    // No stock title or sentence under the picture: the step's heading above
    // already names the document and says what to do.
    expect(html).not.toContain('about to scan');
    expect(html).not.toContain('read the details for you');
    expect(html).toContain('Takes a few seconds');
    expect(html).toContain('Have your Passport with you');
    expect(html).not.toMatch(/International|scan your ID|your document/);
    expect(html).toContain('data-document-scan-preview="passport"');
    // The SDK's specimen drawing (lib/document-specimen.ts), one side only,
    // and not the cartoon person from the liveness screens.
    expect(html.match(/src="data:image\/svg\+xml/g)).toHaveLength(1);
    expect(html).toContain(encodeURIComponent('PASSPORT'));
    expect(html).not.toContain('toon-');
    // The document's picture sits in the screen's tinted box.
    expect(html).toContain('bg-primary/5');
    expect(html).not.toContain('animate-pulse-ring');
  });

  it('a two-sided card is called by its own name, and both its sides are drawn', () => {
    const html = shown(
      documentReady({
        name: 'Ghana Card',
        subject: { idType: 'ghana-card', title: 'Ghana Card', country: 'Ghana' },
        twoSided: true,
        accent: '#5645F5',
      }),
    );
    expect(html).toContain('Have your Ghana Card with you');
    expect(html.match(/src="data:image\/svg\+xml/g)).toHaveLength(2);
  });

  it('a workflow’s own words for the document screen are kept, with the name filled in', () => {
    const html = shown(passport(), {
      en: { 'primer.document.title': 'Get your {document} ready', 'primer.document.body': 'Open it at the photo page.' },
    });
    expect(html).toContain('Get your Passport ready');
    expect(html).toContain('Open it at the photo page.');
  });
});
