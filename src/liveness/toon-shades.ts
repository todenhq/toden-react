import type { CSSProperties } from 'react';

/**
 * Every colour of the cartoon person (liveness/toon-face.ts) as a shade of the
 * workflow's own colour, `--primary`: skin, hair and clothes alike, so the
 * person has no skin colour and stands for anyone. Set on the element that
 * holds the drawing.
 */
export const TOON_SHADES = {
  '--toon-skin': 'color-mix(in srgb, var(--primary) 22%, #fff)',
  // Dark, so the hair reads as hair, not a cap (user, 2026-11-17).
  '--toon-hair': 'color-mix(in srgb, var(--primary) 40%, #000)',
  '--toon-clothes': 'var(--primary)',
  '--toon-light': '#fff',
  '--toon-ink': 'color-mix(in srgb, var(--primary) 40%, #000)',
  '--toon-mouth': 'color-mix(in srgb, var(--primary) 45%, #000)',
  '--toon-tongue': 'color-mix(in srgb, var(--primary) 50%, #fff)',
  '--toon-line': 'color-mix(in srgb, var(--primary) 30%, #000)',
} as CSSProperties;

/** The room behind a picture of the camera: a soft dusk, leaning to the
 *  workflow's colour so the picture sits with it. */
export const CAMERA_ROOM =
  'linear-gradient(160deg, color-mix(in srgb, var(--primary) 28%, #66708a) 0%, color-mix(in srgb, var(--primary) 22%, #3b4257) 100%)';
