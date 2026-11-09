import { useId } from 'react';
import { CircleAlert, CircleCheck, Flash, FlashOff, Image, Info, Loader2, ScanLine } from '../icons';
import type { AppIconComponent } from '../icons';
import { cn } from '../../lib/utils';
import { useText } from '../../i18n';
import {
  GLASS_CLASSES,
  IMMERSIVE_GLASS,
  SHUTTER_IDLE_COLOUR,
  SUCCESS_COLOUR,
  WARNING_COLOUR,
  primaryOnDark,
  type HintTone,
} from './immersive-glass';
import {
  BOTTOM_OFFSET,
  BOTTOM_ROW_HEIGHT,
  CAPTION_GAP,
  CAPTION_LINE_HEIGHT,
  HINT_LINE_HEIGHT,
  HINT_PADDING_V,
  SHUTTER_SIZE,
  SIDE_BUTTON_SIZE,
  SIDE_MARGIN,
  safeBottom,
} from '../../lib/immersive-layout';

// ─── The full-screen camera's instruction and bottom row ────────────────────
//
// Mirrors the React Native SDK's components/viewfinder/ImmersiveBottomBar.tsx.

// Short captions under the side buttons. Hard-coded beside the other fixed
// camera strings ("Capture document", "Go back"): a catalogue key would have
// to be added to the shared customisable-texts contract, which every SDK must
// match.
export const UPLOAD_CAPTION = 'Upload';
export const TORCH_CAPTION_OFF = 'Light';
export const TORCH_CAPTION_ON = 'Light on';
const UPLOAD_HINT = 'Choose a photo of your document instead of using the camera.';

const TONE_ICON: Record<HintTone, AppIconComponent> = {
  neutral: ScanLine,
  action: Info,
  ready: CircleCheck,
  warning: CircleAlert,
};

/**
 * The capture gate's live instruction, on the glass. The icon's colour carries
 * the state, so the words stay white and legible over any scene.
 */
export function HintPill({
  hint,
  tone,
  primaryColor,
  maxWidth,
  metrics,
}: {
  hint: string;
  tone: HintTone;
  primaryColor: string;
  maxWidth: string;
  /** The inline camera's type and padding (inline-layout.ts); the full-screen camera's otherwise. */
  metrics?: { fontSize: number; lineHeight: number; paddingV: number };
}) {
  const Icon = TONE_ICON[tone];
  const lineHeight = metrics?.lineHeight ?? HINT_LINE_HEIGHT;
  const paddingV = metrics?.paddingV ?? HINT_PADDING_V;
  const toneColour =
    tone === 'ready'
      ? SUCCESS_COLOUR
      : tone === 'warning'
        ? WARNING_COLOUR
        : tone === 'action'
          ? primaryOnDark(primaryColor)
          : 'rgba(255,255,255,0.7)';
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-2 rounded-full px-4', GLASS_CLASSES)}
      style={{ maxWidth, paddingTop: paddingV, paddingBottom: paddingV }}
    >
      <Icon size={16} color={toneColour} className="shrink-0" aria-hidden />
      <span
        className="line-clamp-2 min-w-0 text-center text-[15px] font-semibold"
        style={metrics ? { lineHeight: `${lineHeight}px`, fontSize: metrics.fontSize } : { lineHeight: `${lineHeight}px` }}
      >
        {hint}
      </span>
    </div>
  );
}

/**
 * A round glass button beside the shutter, with its caption hanging below. The
 * inline camera may pass a smaller `size` and no caption (inline-layout.ts).
 */
export function SideButton({
  icon: Icon,
  caption,
  label,
  describedBy,
  lit,
  litColour,
  onClick,
  size = SIDE_BUTTON_SIZE,
}: {
  icon: AppIconComponent;
  caption?: string;
  label: string;
  describedBy?: string;
  /** Solid white when on, so "on" never depends on the scene behind it. */
  lit?: boolean;
  /** The icon's colour when lit: the brand colour. */
  litColour?: string;
  onClick: () => void;
  size?: number;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-describedby={describedBy}
        aria-pressed={lit === undefined ? undefined : lit}
        className={cn(
          // The ::before grows the 52 button to a 60 target, as RN's hitSlop.
          "pointer-events-auto relative flex items-center justify-center rounded-full transition-colors before:absolute before:-inset-1 before:rounded-full before:content-['']",
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          lit ? 'border border-white bg-white active:bg-[rgba(255,255,255,0.82)]' : GLASS_CLASSES,
        )}
        style={{ width: size, height: size, color: lit ? litColour : IMMERSIVE_GLASS.text }}
      >
        <Icon size={Math.round((size * 22) / SIDE_BUTTON_SIZE)} aria-hidden />
      </button>
      {caption && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute whitespace-nowrap text-center text-[12px] font-medium"
          style={{
            top: size + CAPTION_GAP,
            left: -size,
            right: -size,
            lineHeight: `${CAPTION_LINE_HEIGHT}px`,
            color: IMMERSIVE_GLASS.caption,
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}

/** The shutter's inner disc and icon, at the full SHUTTER_SIZE. */
const SHUTTER_DISC = 62;
const SHUTTER_ICON = 26;

/**
 * The shutter. It takes a photo only once all four corners of the document are
 * in view with room past them (lib/document-corners.ts); until then its disc
 * is grey and `blockedReason` says why, to screen readers as well. When the
 * detector cannot run on the device there is no reason, and it always works.
 *
 * The inline camera may pass a smaller `size` (inline-layout.ts); the disc,
 * the icon and the dwell ring scale with it.
 */
export function Shutter({
  onCapture,
  busy,
  progress,
  primaryColor,
  blockedReason,
  size = SHUTTER_SIZE,
  icon: ShutterIcon = ScanLine,
  label = 'Capture document',
}: {
  onCapture: () => void;
  busy: boolean;
  progress: number;
  primaryColor: string;
  blockedReason: string | null;
  size?: number;
  /** The glyph inside the shutter: the scan's by default, a camera in photo mode. */
  icon?: AppIconComponent;
  /** Its accessible name: the scan's by default. */
  label?: string;
}) {
  const blocked = !!blockedReason;
  const scale = size / SHUTTER_SIZE;
  const disc = Math.round(SHUTTER_DISC * scale);
  const icon = Math.round(SHUTTER_ICON * scale);
  // The ring the dwell is drawn on, just outside the shutter.
  const ringRadius = size / 2;
  const ringSize = size + 8;
  const ringCircumference = 2 * Math.PI * ringRadius;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* The dwell, drawn around the shutter: someone holding steady can see
          it working instead of wondering whether to press. */}
      {progress > 0 && progress < 1 && (
        <svg
          aria-hidden="true"
          width={ringSize}
          height={ringSize}
          className="pointer-events-none absolute"
          style={{ top: -4, left: -4 }}
        >
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            stroke={primaryColor}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringCircumference * (1 - progress)}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </svg>
      )}
      <button
        type="button"
        // aria-disabled rather than disabled while blocked: the button stays
        // focusable, so a screen reader can still reach it and hear the reason.
        onClick={blocked ? undefined : onCapture}
        disabled={busy}
        aria-disabled={blocked || undefined}
        aria-label={blocked ? `${label}. ${blockedReason}` : label}
        title={blockedReason ?? undefined}
        className={cn(
          'pointer-events-auto flex items-center justify-center rounded-full border-4 border-white bg-transparent transition-opacity',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          busy ? 'opacity-60' : blocked ? 'cursor-not-allowed' : 'active:opacity-[0.85]',
        )}
        style={{ width: size, height: size }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: disc, height: disc, backgroundColor: blocked ? SHUTTER_IDLE_COLOUR : primaryColor }}
        >
          {busy ? (
            <Loader2 size={icon} className="animate-spin text-white" aria-hidden />
          ) : (
            <ShutterIcon size={icon} className="text-white" aria-hidden />
          )}
        </span>
      </button>
    </div>
  );
}

/** Upload, shutter and torch, in three equal slots along the bottom. */
export function BottomBar({
  onUpload,
  onCapture,
  busy,
  progress,
  blockedReason,
  hasTorch,
  torch,
  onToggleTorch,
  primaryColor,
  shutterIcon,
  shutterLabel,
  uploadHint = UPLOAD_HINT,
}: {
  onUpload: (() => void) | null;
  onCapture: () => void;
  busy: boolean;
  progress: number;
  /** Set while the four-corner gate holds capture: the shutter says why. */
  blockedReason: string | null;
  hasTorch: boolean;
  torch: boolean;
  onToggleTorch: () => void;
  primaryColor: string;
  /** Photo mode: a camera glyph in the shutter. The scan's otherwise. */
  shutterIcon?: AppIconComponent;
  /** Photo mode: the shutter's name. The scan's otherwise. */
  shutterLabel?: string;
  /** The upload button's screen-reader hint. */
  uploadHint?: string;
}) {
  const t = useText();
  const uploadHintId = useId();
  // Three equal slots, so the shutter stays centred whether or not the upload
  // and torch buttons are shown.
  const slot = 'flex flex-1 items-center justify-center';
  return (
    <div
      className="pointer-events-none absolute z-20 flex items-start justify-center"
      style={{ left: SIDE_MARGIN, right: SIDE_MARGIN, bottom: safeBottom(BOTTOM_OFFSET), height: BOTTOM_ROW_HEIGHT }}
    >
      <div className={slot} style={{ height: SHUTTER_SIZE }}>
        {onUpload && (
          <>
            {/* Outside the button, so it describes it without becoming part of its name. */}
            <span id={uploadHintId} className="sr-only">
              {uploadHint}
            </span>
            <SideButton
              icon={Image}
              caption={UPLOAD_CAPTION}
              label={t('uploadDocument.camera.uploadInstead')}
              describedBy={uploadHintId}
              onClick={onUpload}
            />
          </>
        )}
      </div>

      <div className={slot} style={{ height: SHUTTER_SIZE }}>
        <Shutter
          onCapture={onCapture}
          busy={busy}
          progress={progress}
          primaryColor={primaryColor}
          blockedReason={blockedReason}
          icon={shutterIcon}
          label={shutterLabel}
        />
      </div>

      <div className={slot} style={{ height: SHUTTER_SIZE }}>
        {hasTorch && (
          <SideButton
            // One family for one toggle: Flash and FlashOff are the same bolt,
            // slashed or not (Zap is a different shape in this icon set).
            icon={torch ? Flash : FlashOff}
            caption={torch ? TORCH_CAPTION_ON : TORCH_CAPTION_OFF}
            label={torch ? 'Turn off the torch' : 'Turn on the torch'}
            lit={torch}
            litColour={primaryColor}
            onClick={onToggleTorch}
          />
        )}
      </div>
    </div>
  );
}
