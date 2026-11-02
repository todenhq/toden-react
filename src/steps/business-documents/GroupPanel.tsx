'use client';

import React from 'react';
import { FileText } from '../../components/icons';
import { useText } from '../../i18n';
import { groupUpload, type BusinessDocumentGroup } from '../../lib/business-document-groups';
import { cn } from '../../lib/utils';
import { DocumentDropZone } from './DocumentDropZone';
import type { useGroupUpload } from './use-group-upload';

/**
X
 */
export function GroupPanel({
  group,
  number,
  total,
  docs,
}: {
  group: BusinessDocumentGroup;
  number: number;
  total: number;
  docs: ReturnType<typeof useGroupUpload>;
}) {
  const t = useText();
  const uploaded = groupUpload(group, docs.uploads);
  const headingId = `business-doc-group-${group.key}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-background p-4 shadow-[0_10px_30px_-18px_rgba(7,3,48,0.45)]"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 id={headingId} className="text-base font-semibold">{group.title}</h3>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              group.required ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {t(group.required ? 'business.documents.status.required' : 'business.documents.status.optional')}
          </span>
        </div>
        {total > 1 && (
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {t('business.documents.progress', { current: number, total })}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t(group.types.length > 1 ? 'business.documents.accepts' : 'business.documents.acceptsOne')}
        </p>
        <ul className="space-y-1">
          {group.types.map((type) => (
            <li key={type.key} className="flex items-start gap-2 text-sm leading-snug">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                {type.label}
                {type.maxAgeMonths != null && (
                  <span className="block text-xs text-muted-foreground">
                    {t('business.documents.validity', { months: type.maxAgeMonths })}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <DocumentDropZone
        title={group.title}
        fileName={uploaded?.fileName ?? null}
        size={uploaded?.size}
        file={docs.files[group.key] ?? null}
        uploading={docs.uploading === group.key}
        error={docs.error}
        onPick={(file) => void docs.upload(group, file)}
        onRemove={() => docs.remove(group)}
      />
    </section>
  );
}
