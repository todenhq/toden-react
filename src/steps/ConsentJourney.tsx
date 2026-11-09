'use client';

import React, { useId } from 'react';
import type { ProcessStep } from './consent-copy';

/**
 * What the flow will do, as an inset grouped list: a quiet heading over one
 * card of rows, each a small icon tile and a line of text, hairlines between.
 * An ordered list, so a screen reader still hears the order. The rows rise in
 * one after another (reduced motion: at once).
 */
export function ConsentJourney({ steps, heading }: { steps: ProcessStep[]; heading: string }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-2xl bg-muted/50 p-1.5">
      <h3 id={headingId} className="px-3 pb-2 pt-2 text-xs font-medium text-muted-foreground">
        {heading}
      </h3>
      <ol className="divide-y divide-border/60 overflow-hidden rounded-xl bg-background dark:shadow-sm">
        {steps.map(({ icon: Icon, label }, index) => (
          <li
            key={label}
            className="flex items-center gap-3 px-3.5 py-3 animate-slide-up"
            style={{ animationDelay: `${60 + index * 45}ms`, animationFillMode: 'both' }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground/90">{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
