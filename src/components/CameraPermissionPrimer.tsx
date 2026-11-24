'use client';

import { Camera } from './icons';
import { cn } from '../lib/utils';
import { useText } from '../i18n';
import { Button } from './ui/button';

interface CameraPermissionPrimerProps {
  /** Heading above the body copy. */
  title?: string;
  /** Body copy explaining the upcoming OS prompt. */
  bodyText?: string;
  /** Primary button label. */
  buttonLabel?: string;
  /** Fires when the user taps the primary button — triggers the real camera start. */
  onGrant: () => void;
  className?: string;
}

/**
 * "Allow camera access" priming card, shown right before the native OS camera
 * permission prompt. It carries no StepHeader of its
 * own so it can drop into a step that already renders one.
 */
export function CameraPermissionPrimer({
  title,
  bodyText,
  buttonLabel,
  onGrant,
  className,
}: CameraPermissionPrimerProps) {
  const t = useText();
  return (
    <div className={cn('space-y-5 animate-fade-in', className)}>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/15 bg-primary/5 px-6 py-10 text-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute h-20 w-20 rounded-full border-2 border-primary/30 animate-pulse-ring" />
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <Camera className="h-7 w-7 text-primary" />
          </span>
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title ?? t('primer.camera.title')}</p>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{bodyText ?? t('primer.camera.body')}</p>
        </div>
      </div>
      <Button className="w-full" onClick={onGrant}>
        {buttonLabel ?? t('primer.camera.button')}
      </Button>
    </div>
  );
}
