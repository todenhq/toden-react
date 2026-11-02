'use client';

import React, { useState } from 'react';
import { useText } from '../../i18n';
import { groupUpload, type BusinessDocumentGroup } from '../../lib/business-document-groups';
import { cn } from '../../lib/utils';
import { GroupPanel } from './GroupPanel';
import { GroupEdge, GroupRow } from './GroupRow';
import type { useGroupUpload } from './use-group-upload';

/**
 * The groups as a vertical carousel: the open group's card in front, the next
 * group's card tucked behind it at the top and the previous group's at the
 * bottom (press it to change it), with a thin edge beyond each when there are
 * more groups that way. Continue brings the next card down into the middle;
 * Back brings the previous one up. Nothing moves on first render, and reduced
 * motion keeps it still. A polite announcement names the group that opened.
 */
export function GroupStack({
  groups,
  active,
  docs,
  onOpen,
}: {
  groups: BusinessDocumentGroup[];
  active: number;
  docs: ReturnType<typeof useGroupUpload>;
  onOpen: (index: number) => void;
}) {
  const t = useText();
  // Which way the last move went, derived when `active` changes (null until the
  // first move, so the step's own entrance is not doubled).
  const [shown, setShown] = useState(active);
  const [direction, setDirection] = useState<'forward' | 'back' | null>(null);
  if (shown !== active) {
    setDirection(active > shown ? 'forward' : 'back');
    setShown(active);
  }

  const group = groups[active];
  const previous = groups[active - 1];
  const next = groups[active + 1];
  if (!group) return null;
  // Forward: the next card was above, so the open one arrives from above.
  const motion = direction === 'forward' ? 'animate-slide-down' : direction === 'back' ? 'animate-slide-up' : undefined;

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {t('business.documents.progress', { current: active + 1, total: groups.length })}: {group.title}
      </p>
      <div key={`ahead-${active}`} className={cn(direction && 'animate-fade-in')}>
        {groups[active + 2] && <GroupEdge side="top" />}
        {next && <GroupRow group={next} number={active + 2} fileName={null} />}
      </div>
      <div key={group.key} className={cn('relative z-10', motion)}>
        <GroupPanel group={group} number={active + 1} total={groups.length} docs={docs} />
      </div>
      <div key={`behind-${active}`} className={cn(direction && 'animate-fade-in')}>
        {previous && (
          <GroupRow
            group={previous}
            number={active}
            // '' rather than null when restored without a name: it is uploaded, not skipped.
            fileName={(() => {
              const upload = groupUpload(previous, docs.uploads);
              return upload ? (upload.fileName ?? '') : null;
            })()}
            onOpen={() => onOpen(active - 1)}
          />
        )}
        {groups[active - 2] && <GroupEdge side="bottom" />}
      </div>
    </div>
  );
}
