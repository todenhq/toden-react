'use client';

import React, { createContext, useContext } from 'react';
import { BookUser, CircleCheck, MapPin, MapPinCheck } from '../../components/icons';
import { Drawer, DrawerContent, DrawerTitle, useSheetClose } from '../../components/ui/drawer';
import { useDesktopPointer } from '../../lib/use-desktop-pointer';
import { cn } from '../../lib/utils';
import { AddressBookDialog, AddressBookDialogTitle } from './AddressBookDialog';
import { savedAddressLine, type SavedAddress } from '../../lib/address-book';
import { useText } from '../../i18n';

/** Whether the open sheet is the desktop dialog, for its title and buttons. */
const DialogShape = createContext(false);

/**
 * The sheet the saved address offer and the save question sit in: a bottom
 * drawer on a phone, a small dialog centred inside the SDK window on a desktop
 * (AddressBookDialog), where a drawer pinned to the foot of the page ran past
 * the window and covered the flow. Swipe, the backdrop and Escape close either.
 */
export function AddressBookSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const desktop = useDesktopPointer();
  // A drag or an outside tap slides the sheet away before the parent removes it.
  const sheet = useSheetClose(onClose);
  if (desktop) {
    return (
      <DialogShape.Provider value>
        <AddressBookDialog onClose={onClose}>{children}</AddressBookDialog>
      </DialogShape.Provider>
    );
  }
  return (
    <Drawer direction="bottom" {...sheet.rootProps}>
      <DrawerContent aria-describedby={undefined} className="max-h-[85vh]">
        <div className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * A sheet's buttons, main action first. Stacked full width for a thumb; on a
 * desktop side by side, the main action on the right where a mouse expects it.
 */
export function SheetActions({ children }: { children: React.ReactNode }) {
  const dialog = useContext(DialogShape);
  return <div className={dialog ? 'flex flex-row-reverse gap-3 [&>*]:flex-1' : 'space-y-2'}>{children}</div>;
}

/** A sheet's opening: its icon, title and one line of why, centred. */
export function SheetHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <span className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      {useContext(DialogShape) ? (
        <AddressBookDialogTitle className="text-lg font-bold">{title}</AddressBookDialogTitle>
      ) : (
        <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export const BookIcon = BookUser;
export const EnterIcon = MapPin;

/** The saved addresses as a single-choice list. */
export function SavedAddressList({
  addresses,
  selected,
  onSelect,
}: {
  addresses: SavedAddress[];
  selected: string | null;
  onSelect: (entryId: string) => void;
}) {
  const t = useText();
  return (
    <div role="radiogroup" aria-label={t('address.book.pick.title')} className="space-y-2">
      {addresses.map((a) => {
        const on = a.entryId === selected;
        return (
          <button
            key={a.entryId}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(a.entryId)}
            className={cn(
              'flex w-full min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              on ? 'border-primary bg-primary/[0.06]' : 'border-border bg-background hover:border-primary/40',
            )}
          >
            <MapPin className={cn('h-5 w-5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{savedAddressLine(a) || a.countryCode || ''}</span>
              {a.presenceStatus === 'verified' && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                  <MapPinCheck className="h-3.5 w-3.5" aria-hidden />
                  {t('address.book.presence.verified')}
                </span>
              )}
            </span>
            {on && <CircleCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/** The saved address already picked (returning to this step). */
export function ChosenAddress({ label, area }: { label: string | null; area: string | null }) {
  const t = useText();
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-4">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <BookUser className="h-3 w-3" aria-hidden />
        {t('address.book.chosen.badge')}
      </span>
      <p className="mt-2 text-base font-semibold leading-snug">{savedAddressLine({ label, area })}</p>
    </div>
  );
}
