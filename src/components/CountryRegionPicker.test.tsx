import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CountryRegionPicker } from './CountryRegionPicker';

// A country row is a primary control on a phone: it has to be big enough for a
// thumb to land on the row it aimed at. A 40px flag inside 16px of padding makes
// a 72px row, the same on React Native and Flutter.

function rows(html: string): string[] {
  return html.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
}

describe('a country row', () => {
  const html = renderToStaticMarkup(
    <CountryRegionPicker countries={['NG', 'GH', 'FR']} selected={null} geoCountry="GH" onPick={() => undefined} />,
  );

  it('draws every country, the pinned one included, as the same big row', () => {
    const drawn = rows(html);
    expect(drawn).toHaveLength(3);
    for (const row of drawn) {
      expect(row).toMatch(/class="[^"]*\bp-4\b/);
      expect(row).toMatch(/class="[^"]*\bgap-4\b/);
    }
  });

  it('gives each row a 40px flag', () => {
    for (const row of rows(html)) {
      expect(row).toMatch(/class="[^"]*\bh-10\b[^"]*\bw-10\b/);
      expect(row).not.toMatch(/\bh-8\b/);
    }
  });
});
