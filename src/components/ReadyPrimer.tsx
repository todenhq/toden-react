'use client';

import type { ReactNode } from 'react';
import type { AppIconComponent } from './icons';
import { cn } from '../lib/utils';
import { useText } from '../i18n';
import { resolveText } from '../i18n/translate';
import { Button } from './ui/button';

/**
 * "Here's what happens next" screen, shown once before a capture step opens the
 * camera. It exists because the camera used to appear unannounced: a user who
 * doesn't know their ID or their face is about to be photographed fumbles the
 * first attempt, and a retake costs more than a sentence of warning.
 *
 * Structure is deliberately the minimal single-column pattern — one hero, at
 * most three expectations, one primary action — so it reads in a glance rather
 * than becoming a wall of terms. It carries no StepHeader so it can drop into a
 * step that already renders one, matching CameraPermissionPrimer.
 *
 * It sits BEFORE that permission primer: first what we're about to do, then the
 * OS prompt. Two asks in a row, each with a reason, and never a surprise.
 */
export interface ReadyPrimerProps {
  /** Hero glyph — the thing being captured (document, face). */
  icon: AppIconComponent;
  /** A picture of the step itself, shown in the hero in place of the glyph. */
  hero?: ReactNode;
  title: string;
  /** A sentence under the title. Empty: the title stands alone. */
  body: string;
  /**
   * Show the sentence only where the workflow has written its own, and leave
   * the SDK's stock one out: for a screen whose picture already says it.
   */
  ownBodyOnly?: boolean;
  /**
   * The same for the title: shown only where the workflow has written its own.
   * For a screen whose step heading above already says it.
   */
  ownTitleOnly?: boolean;
  /** Keep the tinted box round the picture too, as a glyph has it. */
  heroBoxed?: boolean;
  /** What to expect. Three at most; past that nobody reads it. */
  checklist: { icon: AppIconComponent; label: string }[];
  buttonLabel?: string;
  /** Catalogue keys for the copy above; when set, the workflow's text wins. */
  textKeys?: { title: string; body: string; checklist: string[] };
  /** What the texts' `{placeholders}` stand for, such as the document's name. */
  textVars?: Record<string, string>;
  onReady: () => void;
  className?: string;
}

export function ReadyPrimer({
  icon: Icon,
  hero,
  title,
  body,
  ownBodyOnly = false,
  ownTitleOnly = false,
  heroBoxed = false,
  checklist,
  buttonLabel,
  textKeys,
  textVars,
  onReady,
  className,
}: ReadyPrimerProps) {
  const t = useText();
  const titled = textKeys ? t(textKeys.title, textVars) : title;
  const heading =
    ownTitleOnly && textKeys && titled === resolveText(textKeys.title, { vars: textVars }) ? '' : titled;
  const written = textKeys ? t(textKeys.body, textVars) : body;
  const description =
    ownBodyOnly && textKeys && written === resolveText(textKeys.body, { vars: textVars }) ? '' : written;
  const rows = checklist.map((row, i) => {
    const key = textKeys?.checklist[i];
    return key ? { ...row, label: t(key, textVars) } : row;
  });
  return (
    <div className={cn('space-y-5 animate-fade-in', className)}>
      {/* Hero. Whatever moves here (the ring, or the step's own picture) is
          the ONLY looping element on the screen — more than one competing
          animation reads as noise — and it stops under prefers-reduced-motion.
          The liveness picture stands on the page by itself: its own window
          is its frame, and a tinted box round it would be a frame round a
          frame. A glyph keeps the box, which gives it something to sit on,
          and so does the document's picture (heroBoxed; user, 2026-11-16). */}
      <div
        className={cn(
          'flex flex-col items-center gap-4 text-center',
          hero && !heroBoxed
            ? 'px-2 pt-2 pb-1'
            : cn('rounded-xl border border-primary/15 bg-primary/5', hero ? 'px-4 py-6' : 'px-6 py-9'),
        )}
      >
        {hero ?? (
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden
              className="absolute h-20 w-20 rounded-full border-2 border-primary/30 animate-pulse-ring"
            />
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <Icon className="h-7 w-7 text-primary" aria-hidden />
            </span>
          </div>
        )}
        {(heading || description) && (
          <div className="space-y-1.5">
            {heading && <p className="text-base font-semibold text-foreground">{heading}</p>}
            {description && (
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>

      {/* Expectations — same row idiom as the consent screen's "during this
          process we will" list, so the two read as one flow. */}
      <ul className="space-y-3">
        {rows.map(({ icon: RowIcon, label }, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RowIcon className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="text-sm font-medium text-foreground/90">{label}</span>
          </li>
        ))}
      </ul>

      {/* One primary action. h-12 clears the 44px touch minimum. */}
      <Button className="h-12 w-full text-base font-medium" onClick={onReady}>
        {buttonLabel ?? t('primer.readyButton')}
      </Button>
    </div>
  );
}
