import { describe, expect, it } from 'vitest';
import {
  documentSpecimen,
  specimenImageSource,
  specimenKind,
  specimenTitle,
  type SpecimenInput,
} from './document-specimen';

/** Every tag closes, in order, as the browser's XML parser insists. */
function expectWellFormed(xml: string): void {
  const open: string[] = [];
  for (const match of xml.matchAll(/<(\/?)([a-zA-Z]+)[^>]*>/g)) {
    const [tag, slash, name] = match;
    if (!tag || !name || tag.endsWith('/>')) continue;
    if (slash) expect(open.pop()).toBe(name);
    else open.push(name);
  }
  expect(open).toEqual([]);
  // A bare ampersand, or one not opening an entity, stops the whole image.
  expect(xml).not.toMatch(/&(?!(amp|lt|gt);)/);
}

const base: SpecimenInput = {
  kind: 'national_id',
  title: 'National ID',
  country: 'Ghana',
  side: 'front',
  aspect: 1.586,
  accent: '#5645F5',
  sans: 'sans-serif',
  mono: 'monospace',
};

const KINDS = ['passport', 'national_id', 'nin_slip', 'drivers_license', 'drivers_license_ng', 'voter_card', 'pvc', 'residence_permit', 'generic'] as const;

describe('specimenKind', () => {
  it.each([
    ['passport', 'passport'],
    ['drivers-license', 'drivers_license'],
    ['nin', 'national_id'],
    ['nin-slip', 'nin_slip'],
    ['ghana-card', 'national_id'],
    ['pvc', 'pvc'],
    ['voters', 'voter_card'],
    ['residence-card', 'residence_permit'],
  ])('%s draws as %s', (idType, kind) => {
    expect(specimenKind(idType)).toBe(kind);
  });

  it('draws an ID it does not know as a generic document, never a passport', () => {
    expect(specimenKind('ssnit')).toBe('generic');
    expect(specimenKind(null)).toBe('generic');
  });
});

describe('documentSpecimen', () => {
  it('writes the name of the document and its country on it', () => {
    const xml = documentSpecimen({ ...base, title: "Driver's Licence", kind: 'drivers_license' });
    expect(xml).toContain('GHANA');
    expect(xml).toContain("DRIVER'S LICENCE");
  });

  it('keeps the same page whichever side a passport is asked for', () => {
    const passport = { ...base, kind: 'passport' as const, title: 'Passport', aspect: 1.42 };
    expect(documentSpecimen({ ...passport, side: 'back' })).toBe(documentSpecimen(passport));
  });

  it('escapes what it is given, so a title cannot break the drawing', () => {
    const xml = documentSpecimen({ ...base, title: 'Tax & Levy <ID>', country: "Cote d'Ivoire" });
    expect(xml).toContain('TAX &amp; LEVY &lt;ID&gt;');
    expectWellFormed(xml);
  });

  it.each(KINDS)('%s is well formed on both sides, with no country', (kind) => {
    for (const side of ['front', 'back'] as const) {
      expectWellFormed(documentSpecimen({ ...base, kind, side, country: null }));
    }
  });

  it.each(KINDS.slice(1).filter((k) => k !== 'nin_slip'))('%s has its own back', (kind) => {
    expect(documentSpecimen({ ...base, kind, side: 'back' })).not.toBe(documentSpecimen({ ...base, kind }));
  });

  /** Where each barcode bar sits down the card, from the drawing itself. */
  const barcodeBars = (xml: string) =>
    [...xml.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="#12141F"\/>/g)]
      .map((bar) => ({ top: Number(bar[1]), bottom: Number(bar[1]) + Number(bar[2]) }));

  it("puts a PVC's two barcodes where the card has them: the top half of the back, the linear one first", () => {
    const bars = barcodeBars(documentSpecimen({ ...base, kind: 'pvc', side: 'back' }));
    const linear = bars.filter((bar) => bar.bottom - bar.top === 84);
    const stacked = bars.filter((bar) => bar.bottom - bar.top < 84);
    expect(linear.length).toBeGreaterThan(20);
    expect(stacked.length).toBeGreaterThan(100);
    expect(Math.max(...bars.map((bar) => bar.bottom))).toBeLessThan(Math.round(1000 / base.aspect) * 0.55);
    expect(Math.max(...linear.map((bar) => bar.bottom))).toBeLessThanOrEqual(Math.min(...stacked.map((bar) => bar.top)));
  });

  it("draws no barcode on a PVC's front: both of the card's barcodes are on its back", () => {
    expect(barcodeBars(documentSpecimen({ ...base, kind: 'pvc' }))).toHaveLength(0);
  });

  it("puts a Nigerian licence's barcodes in the top half of its back: a short linear one at the right, the block under it", () => {
    const xml = documentSpecimen({ ...base, kind: 'drivers_license_ng', side: 'back' });
    const bars = barcodeBars(xml);
    const linear = bars.filter((bar) => bar.bottom - bar.top === 44);
    const block = bars.filter((bar) => bar.bottom - bar.top !== 44);
    expect(linear.length).toBeGreaterThan(10);
    expect(block.length).toBeGreaterThan(100);
    expect(Math.max(...bars.map((bar) => bar.bottom))).toBeLessThan(Math.round(1000 / base.aspect) * 0.56);
    expect(Math.max(...linear.map((bar) => bar.bottom))).toBeLessThanOrEqual(Math.min(...block.map((bar) => bar.top)));
    // The linear barcode keeps to the right half, as on the card.
    const lefts = [...xml.matchAll(/<rect x="([\d.]+)" y="136" width="[\d.]+" height="44" fill="#12141F"\/>/g)].map((bar) => Number(bar[1]));
    expect(Math.min(...lefts)).toBeGreaterThanOrEqual(450);
  });

  it("draws a licence as Nigeria's own card only for Nigeria", () => {
    expect(specimenKind('drivers-license', 'NG')).toBe('drivers_license_ng');
    expect(specimenKind('drivers-license', 'ng')).toBe('drivers_license_ng');
    expect(specimenKind('drivers-license', 'GH')).toBe('drivers_license');
    expect(specimenKind('drivers-license', null)).toBe('drivers_license');
    expect(specimenKind('drivers-license')).toBe('drivers_license');
    // The country changes nothing for an ID that has no card of its own drawn.
    expect(specimenKind('passport', 'NG')).toBe('passport');
  });

  it("keeps any other country's licence barcode as one block in the lower half of its back", () => {
    const height = Math.round(1000 / base.aspect);
    const bars = barcodeBars(documentSpecimen({ ...base, kind: 'drivers_license', side: 'back' }));
    expect(bars.length).toBeGreaterThan(100);
    expect(Math.min(...bars.map((bar) => bar.top))).toBeGreaterThanOrEqual(300);
    expect(Math.max(...bars.map((bar) => bar.bottom))).toBeGreaterThan(height * 0.8);
  });

  it("leaves any other voter card's barcode along the foot of its back", () => {
    const bars = barcodeBars(documentSpecimen({ ...base, kind: 'voter_card', side: 'back' }));
    expect(bars.length).toBeGreaterThan(20);
    expect(Math.min(...bars.map((bar) => bar.top))).toBeGreaterThan(Math.round(1000 / base.aspect) / 2);
  });

  it.each([
    ['passport', 1.42, 'front'],
    ['national_id', 1.586, 'back'],
    ['residence_permit', 1.586, 'back'],
  ] as const)('keeps every machine-readable character inside a %s', (kind, aspect, side) => {
    const xml = documentSpecimen({ ...base, kind, aspect, side });
    const cells = [...xml.matchAll(/<text x="([\d.]+)"[^>]*text-anchor="middle"[^>]*>([A-Z0-9])<\/text>/g)];
    expect(cells.length).toBeGreaterThan(20);
    for (const cell of cells) {
      expect(Number(cell[1])).toBeGreaterThan(44);
      expect(Number(cell[1])).toBeLessThan(956);
    }
  });

  it('draws a NIN slip with no photo or chip, and the same on both sides', () => {
    const slip = { ...base, kind: 'nin_slip' as const, title: 'NIN Slip', country: 'Nigeria', aspect: 2.07 };
    const xml = documentSpecimen(slip);
    expect(xml).toContain('NIN SLIP');
    expect(xml).toContain('00000000000');
    expect(documentSpecimen({ ...slip, side: 'back' })).toBe(xml);
    expectWellFormed(xml);
  });

  it('draws an upright NIN slip turned clockwise, its top facing right', () => {
    const slip = { ...base, kind: 'nin_slip' as const, title: 'NIN Slip', country: 'Nigeria', aspect: 2.07 };
    const landscape = documentSpecimen(slip);
    const upright = documentSpecimen({ ...slip, aspect: 1 / 2.07 });
    // Taller than wide, the landscape slip's own box swapped round.
    const height = Math.round(1000 / 2.07);
    expect(upright).toContain(`viewBox="0 0 ${height} 1000"`);
    // A clockwise quarter: the slip's top edge (y = 0) lands on the right edge.
    expect(upright).toContain(`<g transform="translate(${height} 0) rotate(90)">`);
    // The same slip inside, not a different drawing.
    const inner = landscape.replace(/^<svg[^>]*>\n/, '').replace(/\n<\/svg>$/, '');
    expect(upright).toContain(inner);
    expect(upright.match(/<svg/g)).toHaveLength(1);
    expectWellFormed(upright);
  });

  it('marks a passport with the e-passport symbol', () => {
    const xml = documentSpecimen({ ...base, kind: 'passport', title: 'Passport', aspect: 1.42 });
    expect(xml).toMatch(/<rect x="468" y="46" width="84" height="56"/);
    expect(xml).toMatch(/<circle cx="510" cy="74" r="14"/);
  });
});

describe('specimenImageSource', () => {
  it('is an image source with nothing left to break the URL', () => {
    const source = specimenImageSource(base);
    expect(source.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(source).not.toContain('#');
    expect(decodeURIComponent(source.split(',')[1]!)).toBe(documentSpecimen(base));
  });
});

describe('specimenTitle', () => {
  it('uses the label the step already has', () => {
    expect(specimenTitle('nin', 'National ID Number')).toBe('National ID Number');
  });

  it('never writes the word Document when the ID has a name', () => {
    expect(specimenTitle('drivers-license', 'Document')).toBe('Drivers License');
  });

  it('calls a passport a passport', () => {
    expect(specimenTitle('passport', 'International Passport')).toBe('Passport');
  });
});
