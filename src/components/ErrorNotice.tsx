import React from 'react';
import { CircleAlert } from './icons';
import { cn } from '../lib/utils';

// An error the person must notice, drawn as the Flutter and React Native SDKs'
// UiAlert is: a tinted card with a faint edge in the error colour, a round
// icon tile carrying the meaning, and the words in the foreground colour. The
// colour sits in the icon and the edge, so the words stay readable on every
// surface, light or dark.

export function ErrorNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5',
        className,
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/15">
        <CircleAlert className="h-3.5 w-3.5 text-destructive" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-5 text-foreground">{children}</p>
    </div>
  );
}
