'use client';

import React, { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { DropdownSurface } from './DropdownSurface';
import { Drawer, DrawerContent, SheetHeader } from './ui/drawer';

/** At this width and above a picker is a menu under its field; below it, a bottom sheet. */
const MENU_MIN_WIDTH = '(min-width: 640px)';

/**
 * Whether pickers open as bottom sheets here: a phone-width screen, as the
 * React Native and Flutter SDKs open every picker. Follows the width live.
 */
export function usePickerSheet(): boolean {
  const [sheet, setSheet] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(MENU_MIN_WIDTH).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(MENU_MIN_WIDTH);
    const update = () => setSheet(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return sheet;
}

/**
 * Where a picker's list opens: the house floating sheet on a phone (the shared
 * header with its close button, dragged or tapped away, sliding down when it
 * closes), the menu under the field otherwise (portaled out of the dialog,
 * positioned by useDropdownAnchor). The picker passes the same content for
 * both and only drops the menu's height cap in the sheet, which sizes itself.
 *
 * `menuRef` lands on the sheet's body too, so a picker's outside-tap check
 * treats taps in the list as inside and taps on the backdrop as outside.
 */
export function PickerSurface({
  sheet,
  open,
  onClose,
  title,
  menuRef,
  anchor,
  menuClassName,
  role,
  children,
}: {
  /** From usePickerSheet: the picker's own read, so it can size its list to match. */
  sheet: boolean;
  open: boolean;
  onClose: () => void;
  /** The sheet's heading: what is being picked. */
  title: ReactNode;
  menuRef: RefObject<HTMLDivElement | null>;
  anchor: { host: HTMLElement | null; style: CSSProperties };
  /** The menu's own box (border, radius, shadow); the sheet brings its own. */
  menuClassName?: string;
  role?: string;
  children: ReactNode;
}) {
  if (sheet) {
    return (
      // No background scaling: a picker can open from inside another sheet
      // (the key-person form), and the page must not shrink twice.
      <Drawer open={open} direction="bottom" shouldScaleBackground={false} onOpenChange={(next) => !next && onClose()}>
        <DrawerContent direction="bottom" className="max-h-[85%]">
          <SheetHeader title={title} onClose={onClose} />
          <div ref={menuRef} role={role} className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  if (!open || !anchor.host) return null;
  return createPortal(
    <DropdownSurface menuRef={menuRef}>
      <div
        style={anchor.style}
        role={role}
        className={cn(
          'z-50 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg animate-slide-up',
          menuClassName,
        )}
      >
        {children}
      </div>
    </DropdownSurface>,
    anchor.host,
  );
}

/** A picker's scrolling list: capped under the field, filling the sheet. */
export function pickerListProps(sheet: boolean, maxHeight: number | undefined, className?: string) {
  return {
    className: cn('overflow-y-auto', className, sheet && 'min-h-0 flex-1 overscroll-contain pb-6'),
    style: sheet ? undefined : { maxHeight },
  };
}
