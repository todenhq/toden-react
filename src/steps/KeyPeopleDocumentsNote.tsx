'use client';

import React from 'react';
import { FileText, Loader2, Sparkles } from '../components/icons';
import { useText } from '../i18n';

/**
 * What the company documents did for this list, at the top of the key-people
 * step: still being read (after the applicant chose to carry on), or the
 * people they named, filled in and waiting for an email each. The "found"
 * card is deliberately loud, a tinted card with a title, because it is the
 * reason the applicant has less to type and the thing they must act on.
 * Icon and words, in a polite live region. Mirrors the React Native SDK's
 * KeyPeopleDocumentsNote and the Flutter SDK's KeyPeopleDocumentsNote.
 */
export function KeyPeopleDocumentsNote({ reading, added, kept = 0 }: { reading: boolean; added: number; kept?: number }) {
  const t = useText();
  if (kept > 0 && !reading && added === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex w-full items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 animate-fade-in"
      >
        <FileText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span className="text-sm leading-relaxed">
          {t(kept === 1 ? 'keyPeople.hints.keptFromRemovedOne' : 'keyPeople.hints.keptFromRemovedMany', { count: kept })}
        </span>
      </div>
    );
  }
  if (reading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left animate-fade-in"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        </span>
        <span className="text-sm leading-relaxed text-foreground">{t('keyPeople.hints.readingDocuments')}</span>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative w-full overflow-hidden rounded-2xl border border-primary/40 bg-primary/10 p-4 text-left shadow-sm animate-slide-up"
    >
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 font-heading text-base font-semibold text-foreground">
            {t(added === 1 ? 'keyPeople.reading.foundOne' : 'keyPeople.reading.foundMany', { count: added })}
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            {t(added === 1 ? 'keyPeople.hints.fromDocumentsOne' : 'keyPeople.hints.fromDocumentsMany', { count: added })}
          </p>
        </div>
      </div>
    </div>
  );
}
