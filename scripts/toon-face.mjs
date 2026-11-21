// ---------------------------------------------------------------------------
// Builds src/liveness/toon-face.ts: the character on the screen before the
// liveness camera, cut into the parts that move (head, eyes, brows, mouth,
// hair), with each of its colours handed to a CSS variable (--toon-*), so the
// screen can paint it in shades of the workflow's own colour. It has no skin
// colour of its own: it stands for anyone.
//
// The character is "Toon Head" by Johan Melin, CC BY 4.0
// (https://www.johanmelin.com), as packaged in @dicebear/toon-head 9.4.2. The
// short hair is ours, drawn in its style: a close crop that follows the head,
// round the back too, so it reads as any hair texture. The style's own cuts are straight-haired
// or a bun, and its long hair behind the head is left out.
//
// Usage: node scripts/toon-face.mjs <a folder with @dicebear/toon-head installed>
// Writes the file in place; check it in.
// ---------------------------------------------------------------------------

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(process.argv[2] ?? '.', 'package.json'));
const lib = dirname(require.resolve('@dicebear/toon-head'));
const part = async (name) => (await import(join(lib, 'components', `${name}.js`)))[name];

// The drawing is made in these colours, then each is handed to a variable.
const COLOURS = { skin: '#a36b4f', hair: '#2c1b18', clothes: '#5199e4' };
const VARIABLES = {
  '#a36b4f': 'skin',
  '#2c1b18': 'hair',
  '#5199e4': 'clothes',
  // The whites of the eyes and the teeth.
  '#F6F1E4': 'light',
  // The irises and the lashes.
  '#4B2422': 'ink',
  '#3F2626': 'ink',
  // Inside the open mouth, and the tongue.
  '#611519': 'mouth',
  '#E0564B': 'tongue',
  // The outline.
  black: 'line',
};
const themed = (svg) =>
  // One element at a time, so a shape with a fill AND an outline gets one style.
  svg.replace(/<[a-z]+\b[^>]*>/g, (tag) => {
    const styles = [];
    const rest = tag.replace(/\s(fill|stroke)="([^"]+)"/g, (whole, attr, colour) => {
      const name = VARIABLES[colour];
      // Black fills are shading, laid over at a low opacity: they stay black.
      if (!name || (attr === 'fill' && colour === 'black')) return whole;
      styles.push(`${attr}:var(--toon-${name})`);
      return '';
    });
    if (styles.length === 0) return tag;
    if (/\sstyle="/.test(rest)) return rest.replace(/\sstyle="([^"]*)"/, (w, own) => ` style="${own};${styles.join(';')}"`);
    return rest.replace(/(\/?>)$/, ` style="${styles.join(';')}"$1`);
  });

// The close crop, front. It stands a little off the skull, so it has some
// thickness. Its hairline is a row of soft points, as short hair grows, with
// rounded corners at the temples and short sideburns just above the ears.
// The hairline, from the right sideburn round to the left one.
const HAIRLINE =
  'L550 366C550 330 546 304 532 290Q520 272 500 276Q486 262 462 266Q446 254 424 258Q404 250 384 256' +
  'Q364 250 344 258Q322 254 306 266Q282 262 268 276Q248 272 236 290C222 304 218 330 218 366';
const CROP_SHAPE = `M206 366C186 262 220 110 384 110S582 262 562 366${HAIRLINE}Z`;
// It is shaded as a rounded thing, darker where it turns away round the
// edges, with no bright spot of light on it (user, 2026-11-17: "remove the
// bright concentrated light"). The front and the part behind the head take
// the SAME colour and the same shading, so they read as one head of hair.
const HAIR_ROUND =
  `<stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/>`;
export const CROP = (hair) =>
  `<defs><radialGradient id="hair-round" cx="0.5" cy="0.62" r="0.62">${HAIR_ROUND}</radialGradient></defs>` +
  `<path d="${CROP_SHAPE}" fill="${hair}" stroke="black"/>` +
  `<path d="${CROP_SHAPE}" fill="url(#hair-round)"/>` +
  // The shade it casts on the forehead, just under the hairline.
  `<path d="M550 366${HAIRLINE.replace(/^L550 366/, '')}" fill="none" stroke="#000" stroke-opacity="0.1" stroke-width="14" stroke-linejoin="round"/>`;

// The crop, behind the head: it goes round the back of the skull and down
// behind the ears, so the hair has a back to it and the head reads as round.
// Its edge shows only round the head's outline and above the ears; the head
// and the ears are drawn over it. It is the same hair as the front, so it
// takes the front's colour and its edge shading, never a darker wash of its own.
const BEHIND_SHAPE =
  'M384 116C248 116 196 206 198 312C199 380 198 424 205 456C212 488 232 502 256 506H512C536 502 556 488 563 456C570 424 569 380 570 312C572 206 520 116 384 116Z';
export const CROP_BEHIND = (hair) =>
  `<defs><radialGradient id="hair-behind-round" cx="0.5" cy="0.5" r="0.62">${HAIR_ROUND}</radialGradient></defs>` +
  `<path d="${BEHIND_SHAPE}" fill="${hair}" stroke="black"/><path d="${BEHIND_SHAPE}" fill="url(#hair-behind-round)"/>`;

const [head, body, clothes, eyes, eyebrows, mouth] = await Promise.all(
  ['head', 'body', 'clothes', 'eyes', 'eyebrows', 'mouth'].map(part),
);
const draw = (fn) => themed(fn({}, COLOURS));
// Ids are prefixed so they cannot meet one on the host page.
const scoped = (svg) => svg.replace(/id="/g, 'id="toden-').replace(/url\(#/g, 'url(#toden-');

const parts = {
  back: draw(body.body) + draw(clothes.tShirt),
  hairBehind: scoped(themed(CROP_BEHIND(COLOURS.hair))),
  head: draw(head.head),
  brows: draw(eyebrows.neutral),
  eyesOpen: draw(eyes.wide),
  eyesShut: draw(eyes.bow),
  eyesHappy: draw(eyes.happy),
  mouthRest: draw(mouth.smile),
  mouthSmile: scoped(draw(mouth.laugh)),
  hair: scoped(themed(CROP(COLOURS.hair))),
};

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'liveness', 'toon-face.ts');
writeFileSync(
  out,
  `// Generated by scripts/toon-face.mjs. Do not edit by hand.
//
// "Toon Head" by Johan Melin (https://www.johanmelin.com), licensed under
// CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), from
// @dicebear/toon-head 9.4.2. Changed: cut into parts, its colours handed to
// CSS variables (--toon-skin, -hair, -clothes, -light, -ink, -mouth, -tongue,
// -line), the long hair behind the head left out, and a short crop of our own
// drawn in its place.

/** The drawing's own square, which every part is drawn in. */
export const TOON_VIEWBOX = '0 0 768 768';

export const TOON_PARTS = ${JSON.stringify(parts, null, 2)} as const;
`,
);
console.log('wrote', out);
