'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '../../components/icons';
import { useModalSurface } from '../../lib/modal-surface';
import { usePortalHost } from '../../lib/sdk-frame-context';
import { useThemeVars } from '../../lib/theme-context';
import { cn } from '../../lib/utils';
import { useText } from '../../i18n';

/**
 * The address book questions on a desktop: a small dialog centred INSIDE the
 * SDK window, its scrim covering only that window, so the question reads as a
 * moment in the flow rather than something floating at the foot of the page.
 * Escape, the close button and the scrim close it; focus stays inside.
 */
export function AddressBookDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const t = useText();
  const surface = useModalSurface();
  const portalHost = usePortalHost();
  const themeVars = useThemeVars();
  // Inside the modal the window is the containing block; on the hosted page
  // the page is the window, so the dialog is fixed to the viewport instead.
  const place = surface ? 'absolute' : 'fixed';
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal container={surface ?? portalHost ?? undefined}>
        <DialogPrimitive.Overlay className={cn(place, 'inset-0 z-50 rounded-[inherit] bg-black/60 motion-safe:animate-fade-in')} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={themeVars}
          className={cn(
            'verification-root',
            place,
            'left-1/2 top-1/2 z-50 max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2',
            'overflow-y-auto rounded-2xl border border-border bg-background p-6 text-foreground shadow-xl focus:outline-none',
            'motion-safe:animate-fade-in',
          )}
        >
          <DialogPrimitive.Close
            aria-label={t('common.close')}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The dialog's title, where a drawer would use its own. */
export const AddressBookDialogTitle = DialogPrimitive.Title;
