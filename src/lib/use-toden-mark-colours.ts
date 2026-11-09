'use client';

import { useOptionalVerificationConfig } from '../context/VerificationConfigContext';
import { TODEN_ACCENT, TODEN_ACCENT_ON_DARK } from '../components/TodenWordmark';
import { brandMarkColor, brandMarkIsLight } from './brand';
import { useIsDark } from './use-is-dark';

/**
 * The colours Toden's mark is drawn in on the sheet, as the footer draws it:
 * one ink for the bar and the shield's left half, chosen for contrast against
 * the background the mark actually sits on (the dark palette's when the flow
 * is dark, whichever theme the person toggled to), and Toden's purple for the
 * right half, a step lighter when the ink is the light tone.
 *
 * The background is not simply `appearance.backgroundColor`: on a dark flow
 * the dark palette lives in `appearance.dark`, and `appearance.theme` is only
 * the starting theme (the person can toggle), so the live class decides. Not
 * read from CSS, because contrast cannot be computed in a stylesheet and this
 * has to hold for any organisation's background.
 */
export function useTodenMarkColours(): { ink: string; accent: string } {
  // Optional: the biometric re-auth modal renders the footer with no config.
  const config = useOptionalVerificationConfig();
  const isDark = useIsDark();
  const appearance = config?.appearance;
  const background = isDark
    ? (appearance?.dark?.backgroundColor ?? appearance?.backgroundColor ?? '#080A12')
    : (appearance?.backgroundColor ?? '#FFFFFF');
  const ink = brandMarkColor(background);
  return { ink, accent: brandMarkIsLight(ink) ? TODEN_ACCENT_ON_DARK : TODEN_ACCENT };
}
