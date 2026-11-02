'use client';

import React from 'react';
import { Check, ChevronRight } from '../../components/icons';
import { useText } from '../../i18n';
import type { BusinessDocumentGroup } from '../../lib/business-document-groups';
import { displayFileName } from '../../lib/display-file-name';
import { cn } from '../../lib/utils';

/**
 * A neighbouring group's card, tucked behind the open one like the next card on
 * a vertical carousel: inset and muted, with only one edge showing. The next
 * group sits above (its top showing, not a control: a group still ahead cannot
 * be opened yet) and the previous group below (its bottom showing, a button, so
 * the applicant can go back and change it). The open card overlaps the hidden
 * edge, so each card keeps extra padding on that side.
 */
export function GroupRow({
  group,
  number,
  fileName,
  onOpen,
}: {
  group: BusinessDocumentGroup;
  number: number;
  /** The file the group holds; null when it has none. */
  fileName: string | null;
  /** Present for the previous group only. */
  onOpen?: () => void;
}) {
  const t = useText();
  const previous = onOpen !== undefined;
  const done = fileName !== null;
  const detail = previous
    ? done
      ? (displayFileName(fileName) ?? t('business.documents.uploaded'))
      : t('business.documents.skipped')
    : group.types.map((x) => x.label).join(', ');

  const body = (
    <>
      <span
        aria-hidden
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground"
      >
        {number}
        {done && (
          <span className="absolute -bottom-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--verification-success,#0DA211)] text-white ring-2 ring-[var(--background)]">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground/80">{group.title}</span>
          {!previous && (
            <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t('business.documents.status.next')}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </>
  );

  const card = 'mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 border border-border/70 bg-muted/50 px-3.5';

  if (previous) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${group.title}. ${detail}. ${t('business.documents.change')}`}
        className={cn(
          card,
          '-mt-3 rounded-b-xl border-t-0 pb-2.5 pt-5 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none',
        )}
      >
        {body}
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
          {t('business.documents.change')}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <div
      role="note"
      aria-label={`${t('business.documents.status.next')}: ${group.title}. ${detail}`}
      className={cn(card, '-mb-3 rounded-t-xl border-b-0 pb-5 pt-2.5')}
    >
      {body}
    </div>
  );
}

/** A thin edge of a card further back, so the carousel shows there is more. */
export function GroupEdge({ side }: { side: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden
      className={cn(
        'mx-6 h-2.5 border border-border/50 bg-muted/30',
        side === 'top' ? '-mb-1 rounded-t-lg border-b-0' : '-mt-1 rounded-b-lg border-t-0',
      )}
    />
  );
}
