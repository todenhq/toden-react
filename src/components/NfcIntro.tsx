'use client';

import React from 'react';
import { Button } from './ui/button';
import { BookUser, Camera, CircleCheck, IdCard, Nfc, Smartphone, Timer } from './icons';
import { nfcIntroCopy, type NfcIntroIcon } from '../lib/nfc-intro';
import { useText } from '../i18n';

/** The glyph for each row of the intro. */
const ICONS: Record<NfcIntroIcon, typeof Camera> = {
  camera: Camera,
  passport: BookUser,
  card: IdCard,
  phone: Smartphone,
  hold: Timer,
};

/**
 * What the chip read is and how to hold the document, before anything starts,
 * as the mobile SDKs show it. They lay it out as the address-monitoring
 * explanation (the hero in two soft rings, a title, the steps as one grouped
 * card, the "before you start" card over the button), and this draws the
 * same. The preview has no phone to name, so it says "the back of your phone"
 * where the apps say "the top of your iPhone" or the middle of an Android
 * phone's back.
 */
export function NfcIntro({
  passport,
  needsCode,
  onContinue,
}: {
  passport: boolean;
  needsCode: boolean;
  onContinue: () => void;
}) {
  const t = useText();
  const copy = nfcIntroCopy({ passport, needsCode, platform: 'other' });
  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <div className="mt-4 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-primary/[0.08]">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary/[0.18]">
            <Nfc className="h-[26px] w-[26px] text-primary" aria-hidden />
          </div>
        </div>
        <h3 className="mt-4 font-heading text-2xl font-semibold text-foreground">{copy.title}</h3>
        <p className="mt-1 text-base text-muted-foreground">{copy.description}</p>
      </div>

      <ol className="divide-y divide-border overflow-hidden rounded-2xl bg-muted">
        {copy.rows.map((row) => {
          const Icon = ICONS[row.icon];
          return (
            <li key={row.title} className="flex items-center gap-4 p-4">
              {/* Done already (the photo page, read during document capture):
                  a check in the success colour, in place of the icon. */}
              {row.done ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--verification-success,#0DA211)_14%,transparent)]">
                  <CircleCheck className="h-5 w-5 text-[var(--verification-success,#0DA211)]" aria-hidden />
                </span>
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/[0.14]">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-base font-semibold text-foreground">
                  {row.title}
                  {row.done && <span className="sr-only"> (done)</span>}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{row.caption}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-4 rounded-2xl bg-primary/10 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/[0.18]">
          <Smartphone className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-muted-foreground">{copy.before.lead}</span>
          <span className="mt-0.5 block text-base font-semibold text-foreground">{copy.before.tap}</span>
        </span>
      </div>

      <Button onClick={onContinue} className="h-12 w-full rounded-xl text-base font-medium">
        {t('common.continue')}
      </Button>
    </div>
  );
}
