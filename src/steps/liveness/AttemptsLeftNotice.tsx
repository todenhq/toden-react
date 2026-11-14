'use client';

import React from 'react';
import { TriangleAlert } from '../../components/icons';

/**
 * The failed check's second line, "1 attempt left." or "2 attempts left."
 * (lib/liveness-attempts.ts), as a small warning under the red reason.
 *
 * A slim pill on the warning tint with a warning glyph, the words in the body
 * colour rather than the muted grey or the reason's red, so it reads as a
 * heads-up and not a second error. The same notice as React Native's
 * AttemptsLeftNotice and Flutter's `LivenessAttemptsLeft`, in their colours:
 * the warning tint (#FFF1D6, #2B1B00 dark) with a 40% warning edge, and the
 * glyph in amber-800 (6.3:1 on the light tint) or the warning yellow (10:1 on
 * the dark one). The glyph is hidden from screen readers: the words carry it.
 */
export function AttemptsLeftNotice({ text }: { text: string }) {
  return (
    <div className="flex justify-center">
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#FFC107]/40 bg-[#FFF1D6] px-2.5 py-1 text-xs font-medium text-foreground dark:bg-[#2B1B00]">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-[#92400E] dark:text-[#FFC107]" aria-hidden />
        <span>{text}</span>
      </span>
    </div>
  );
}
