import { useLayoutEffect, useRef, useState } from 'react';
import { MoveLeft, X } from '../icons';
import { CountryFlag } from '../CountryFlag';
import { cn } from '../../lib/utils';
import { useText } from '../../i18n';
import { GLASS_CLASSES, primaryOnDark } from './immersive-glass';
import { SIDE_MARGIN, TOP_BAR_GAP, TOP_BAR_HEIGHT, safeTop, topBarTop } from '../../lib/immersive-layout';

// ─── The full-screen camera's top bar ───────────────────────────────────────
//
// Back on the left, the document being captured in the middle, and which side
// of it on the right. One row, one height, one glass, so the guide below has
// nothing sitting on its edge. Mirrors the React Native SDK's
// components/viewfinder/ImmersiveControls.tsx.

/** A guess at the side badge's width until it has been measured. */
const BADGE_WIDTH_GUESS = 96;

/** The round glass back control, 44 across. */
export function BackButton({
  onClick,
  className,
  style,
  size = TOP_BAR_HEIGHT,
}: {
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** The inline camera's top row height (inline-layout.ts); the top bar's otherwise. */
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className={cn(
        'pointer-events-auto flex shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        GLASS_CLASSES,
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <MoveLeft size={glyphSize(size, 20)} aria-hidden />
    </button>
  );
}

/** A glyph drawn at `base` on the 44 top bar, scaled to a smaller control. */
function glyphSize(size: number, base: number): number {
  return size === TOP_BAR_HEIGHT ? base : Math.round((size * base) / TOP_BAR_HEIGHT);
}

/**
 * The round glass close control: the flow's own close, drawn where the scan
 * draws its side badge. Photo mode only; the caller leaves it out when the
 * flow cannot be closed. Mirrors the React Native SDK's CloseButton.
 */
export function CloseButton({
  onClick,
  className,
  style,
  size = TOP_BAR_HEIGHT,
}: {
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}) {
  const t = useText();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.close')}
      className={cn(
        'pointer-events-auto flex shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        GLASS_CLASSES,
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <X size={glyphSize(size, 20)} aria-hidden />
    </button>
  );
}

/**
 * "FRONT" / "BACK": which face of the document is expected right now. The
 * inline camera passes its own `height` and `fontSize` (inline-layout.ts);
 * the full-screen camera leaves them at the top bar's.
 */
export function SideBadge({
  side,
  primaryColor,
  height = TOP_BAR_HEIGHT,
  fontSize,
}: {
  side: 'front' | 'back';
  primaryColor: string;
  height?: number;
  fontSize?: number;
}) {
  const t = useText();
  return (
    <div
      className={cn('flex items-center gap-2 rounded-full px-3.5', GLASS_CLASSES)}
      style={{ height }}
    >
      <span
        aria-hidden="true"
        className="block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: primaryOnDark(primaryColor) }}
      />
      <span
        className="whitespace-nowrap text-[14px] font-semibold uppercase leading-5 tracking-[0.8px]"
        style={fontSize ? { fontSize } : undefined}
      >
        {t(side === 'back' ? 'uploadDocument.camera.sideBack' : 'uploadDocument.camera.sideFront')}
      </span>
    </div>
  );
}

/**
 * Flag + document name, so the person can see WHICH document is expected. The
 * flag carries the country on its own: a name beside it is the same fact
 * twice, and it reads faster at a glance than text.
 */
export function DocumentPill({
  label,
  country,
  maxWidth,
  height = TOP_BAR_HEIGHT,
  fontSize,
  flagClassName = 'h-5 w-5',
}: {
  label: string;
  country?: string | null;
  maxWidth: string;
  /** The inline camera's sizes (inline-layout.ts); the top bar's otherwise. */
  height?: number;
  fontSize?: number;
  flagClassName?: string;
}) {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2 rounded-full px-3.5', GLASS_CLASSES)}
      style={{ height, maxWidth }}
    >
      {country && (
<CountryFlag code={country} className={cn(flagClassName, 'shrink-0')} />
      )}
      <span
        className="min-w-0 truncate text-[15px] font-semibold leading-5"
        style={fontSize ? { fontSize } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Back, document and side on one row. The document pill is centred on the
 * screen and is the item that gives way on a narrow phone: it may use the
 * width left between the two sides (the wider of them, mirrored, so it stays
 * centred), and truncates its label past that.
 *
 * In photo mode (no `side`, an `onClose`) the right-hand item is the close
 * button instead of the side badge, as in the React Native SDK.
 */
export function TopBar({
  onBack,
  country,
  documentLabel,
  side,
  primaryColor = '',
  onClose = null,
}: {
  onBack: (() => void) | null;
  country?: string | null;
  documentLabel: string;
  /** The scan's side badge. Left out in photo mode. */
  side?: 'front' | 'back';
  primaryColor?: string;
  /** Photo mode: close the whole flow. Drawn in place of the side badge. */
  onClose?: (() => void) | null;
}) {
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const [badgeWidth, setBadgeWidth] = useState(BADGE_WIDTH_GUESS);
  useLayoutEffect(() => {
    const badge = badgeRef.current;
    if (!badge) return undefined;
    const measure = () => {
      const w = Math.ceil(badge.getBoundingClientRect().width);
      if (w > 0) setBadgeWidth(w);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(badge);
    return () => observer?.disconnect();
  }, []);
  const sideWidth = side && !onClose ? Math.max(TOP_BAR_HEIGHT, badgeWidth) : TOP_BAR_HEIGHT;
  const pillMax = `max(${TOP_BAR_HEIGHT}px, calc(100% - ${2 * (SIDE_MARGIN + sideWidth + TOP_BAR_GAP)}px))`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: safeTop(topBarTop(0)), height: TOP_BAR_HEIGHT }}
    >
      {onBack && <BackButton onClick={onBack} className="absolute top-0" style={{ left: SIDE_MARGIN }} />}
      <div className="absolute inset-x-0 top-0 flex justify-center">
        <DocumentPill label={documentLabel} country={country} maxWidth={pillMax} />
      </div>
      {onClose ? (
        <CloseButton onClick={onClose} className="absolute top-0" style={{ right: SIDE_MARGIN }} />
      ) : side ? (
        <div ref={badgeRef} className="absolute top-0" style={{ right: SIDE_MARGIN }}>
          <SideBadge side={side} primaryColor={primaryColor} />
        </div>
      ) : null}
    </div>
  );
}
