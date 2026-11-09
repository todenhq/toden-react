'use client';

// One date picker, wherever a date is asked for.
//
// It began inside the questionnaire step because that was the first place that
// needed one. The company profile needs the same thing, and a second
// implementation would drift: two calendars that position differently inside
// the same dialog is exactly the sort of inconsistency people read as
// unfinished.
import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon } from './icons';
import { Calendar } from './ui/calendar';
import { cn } from '../lib/utils';
import { useDropdownAnchor } from '../lib/use-dropdown-anchor';
import { eventPathIncludes } from '../lib/event-path';
import { PickerSurface, usePickerSheet } from './PickerSurface';

export function formatIsoDate(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function DateField({
  inputId,
  value,
  placeholder,
  title,
  onChange,
}: {
  inputId: string;
  value: string | undefined;
  placeholder?: string;
  /** The sheet's heading on a phone: the question or field it answers. */
  title?: string;
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The calendar is wider than the field on a narrow phone, so it gets its own
  // width rather than the trigger's.
  const anchor = useDropdownAnchor(open, triggerRef, { width: 300, menuRef });
  // A bottom sheet on a phone, as the mobile SDKs open it; a menu otherwise.
  const sheet = usePickerSheet();
  const selected = parseIsoDate(value);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      // composedPath, not e.target: the SDK renders in a shadow frame and a
      // document listener sees retargeted events (see lib/event-path.ts).
      if (eventPathIncludes(e, rootRef.current, menuRef.current)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // The sheet takes its own outside taps and drags.
    if (!sheet) document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, sheet]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-12 w-full items-center gap-2.5 rounded-xl border border-input bg-background px-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          !selected && 'text-muted-foreground',
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
        {selected
          ? selected.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
          : placeholder ?? 'Pick a date'}
      </button>

      <PickerSurface
        sheet={sheet}
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? placeholder ?? 'Pick a date'}
        menuRef={menuRef}
        // The height budget has to be APPLIED, not just computed: without it
        // the calendar renders at its natural height and runs past the
        // dialog's bottom edge whichever side it opens on.
        anchor={{ host: anchor.host, style: { ...anchor.style, maxHeight: anchor.maxHeight } }}
        menuClassName="overflow-auto bg-background p-3 text-foreground shadow-md"
      >
        <div className={sheet ? 'flex justify-center overflow-y-auto px-3 pb-6' : undefined}>
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date: Date | undefined) => {
              onChange(date ? formatIsoDate(date) : undefined);
              setOpen(false);
            }}
          />
        </div>
      </PickerSurface>
    </div>
  );
}
