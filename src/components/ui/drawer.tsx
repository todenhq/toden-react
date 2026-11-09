'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../../lib/utils';
import { X } from '../icons';
import { useThemeVars } from '../../lib/theme-context';
import { usePortalHost } from '../../lib/sdk-frame-context';

function Drawer({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />;
}

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/50', className)}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  style,
  direction = 'bottom',
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  /**
   * Must match the `direction` on the Drawer root. `bottom` (default) is the
   * mobile sheet, floating as the React Native and Flutter sheets do: 8px off
   * the screen's sides and bottom, all four corners round, a faint
   * brand-tinted edge and a slim grab handle at the lip. Its corner radius is
   * `--sdk-sheet-radius` (28px when unset): where the sheet meets a screen's
   * own corners, as in the builder's phone preview, the host sets it to that
   * screen's radius less the 8px gap so the two curves run together. `right` is the
   * desktop side sheet — full-height panel sliding in from the right, no
   * handle.
   */
  direction?: 'bottom' | 'right';
}) {
  // verification-root only restores the DEFAULT tokens inside the portal; the brand
  // overrides are inline vars on the modal root, so re-apply them here.
  const themeVars = useThemeVars();
  // SdkFrame mounts portal into the SDK's shadow frame; null = document.body.
  const portalHost = usePortalHost();
  return (
    <DrawerPortal container={portalHost ?? undefined}>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn(
          // `text-foreground` is load-bearing: in a shadow-isolated mount the
          // host reset (`all: initial`) severs inherited page colour, so a
          // surface that only sets its background renders BLACK text — on a
          // dark theme, black on near-black. Same pattern as DialogContent.
          'verification-root fixed z-50 flex flex-col bg-background text-foreground',
          direction === 'right'
            ? // A plain full-height panel — no rounded corners, no border;
              // the overlay alone separates it from the page.
              'inset-y-0 right-0 h-full w-full max-w-md'
            : // Clipped by its corners: a scrolling body runs to the lip and
              // slides under the curve, as the system sheet does.
              'inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] mt-24 h-auto overflow-hidden rounded-[var(--sdk-sheet-radius,28px)] border border-primary/20',
          className,
        )}
        style={{ ...themeVars, ...style }}
        {...props}
      >
        {direction === 'bottom' && <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-border" />}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

/** Longest the close slide takes; the sheet goes even if no end event comes. */
const CLOSE_FALLBACK_MS = 600;

/**
 * Closing a sheet that its parent mounts while it is open. Removing it at once
 * skips the slide down, so `close` (and a drag or an outside tap) first turns
 * the drawer closed, and `onClosed` (the parent unmounting it) runs when the
 * slide has finished. Spread `rootProps` on the Drawer root.
 */
export function useSheetClose(onClosed: () => void) {
  const [open, setOpen] = React.useState(true);
  const done = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);
  const finish = React.useCallback(() => {
    window.clearTimeout(timer.current);
    if (done.current) return;
    done.current = true;
    onClosed();
  }, [onClosed]);
  const close = React.useCallback(() => {
    setOpen(false);
    timer.current = window.setTimeout(finish, CLOSE_FALLBACK_MS);
  }, [finish]);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    close,
    rootProps: {
      open,
      onOpenChange: (next: boolean) => {
        if (!next) close();
      },
      onAnimationEnd: (isOpen: boolean) => {
        if (!isOpen) finish();
      },
    },
  };
}

/**
 * The house sheet header: the title, an optional line under it, and the round
 * close button at the right. One header for every sheet, so the close button
 * looks and sits the same wherever a sheet opens, as on the mobile SDKs.
 */
function SheetHeader({
  title,
  description,
  onClose,
  closeLabel = 'Close',
  direction = 'bottom',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
  direction?: 'bottom' | 'right';
}) {
  return (
    <div className={cn('flex shrink-0 items-start gap-3 pb-2 pl-5 pr-3', direction === 'right' ? 'pt-5' : 'pt-1')}>
      <div className="min-w-0 flex-1 pt-1">
        <DrawerTitle className="font-heading text-base font-semibold leading-6">{title}</DrawerTitle>
        {description && <DrawerDescription className="mt-0.5 text-xs">{description}</DrawerDescription>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  SheetHeader,
};
