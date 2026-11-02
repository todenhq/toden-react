import {
  DOCUMENT_GUIDE_RADIUS as R,
  documentGuideRect,
  type GuideBand,
  type GuideRect,
} from '../../lib/document-guide';

// ─── Document scan painter ──────────────────────────────────────────────────
//
// A port of the Flutter SDK's widgets/document_scan_painter.dart, drawn on a
// 2D canvas because it is the same imperative model as Flutter's CustomPaint
// (gradients, blurred glows, a partially-stroked path) — expressing it as
// animated SVG would mean reinventing each of those.
//
// Layers, back to front: scrim → sweep → border → brackets → dwell ring.
// Every constant here is the Flutter one; changing a number changes what the
// user frames against, so the two must move together.

export interface ScanFrame {
  /** 0..1 sweep phase, or null once locked (motion stops). */
  sweep: number | null;
  /** 0..1 corner lock-on settle. */
  lock: number;
  /** 0..1 stability dwell. */
  progress: number;
  /** Darkness outside the guide. */
  scrim: number;
  /** 0..1 breathing pulse while locked. */
  pulse: number;
  /** Guide aspect (width / height). */
  aspect: number;
  /** The free band an upright guide is fitted to (documentGuideRect). */
  band?: GuideBand | null;
  /** CSS colour for the state's accent. */
  accent: string;
}

function roundRectPath(ctx: CanvasRenderingContext2D, r: GuideRect, radius: number) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.width, r.height, radius);
}

/** Applies alpha to a `#rrggbb` or `rgb()` accent without a colour library. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function paintScan(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  f: ScanFrame,
): void {
  const rect = documentGuideRect(size, f.aspect, f.band);
  ctx.clearRect(0, 0, size.width, size.height);

  paintScrim(ctx, size, rect, f.scrim);
  if (f.sweep !== null) {
    paintSweep(ctx, rect, f.sweep, f.accent);
  }
  paintBorder(ctx, rect, f);
  paintBrackets(ctx, rect, f);
  if (f.progress > 0) paintRing(ctx, rect, f);
}

/** Dim everything outside the guide so the eye goes to the document. */
function paintScrim(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  rect: GuideRect,
  scrim: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size.width, size.height);
  roundRectPath(ctx, rect, R);
  // evenodd punches the guide out of the full-screen rect.
  ctx.fillStyle = `rgba(0, 0, 0, ${scrim})`;
  ctx.fill('evenodd');
  ctx.restore();
}

/** Scan line with a soft trailing band, ping-ponging so it never jumps. */
function paintSweep(
  ctx: CanvasRenderingContext2D,
  rect: GuideRect,
  phase: number,
  accent: string,
) {
  const t = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  const y = rect.y + rect.height * t;

  ctx.save();
  roundRectPath(ctx, rect, R);
  ctx.clip();

  // Soft trailing band — flat translucency (no gradients in the flow,
  // house rule 2026-08-29).
  ctx.fillStyle = withAlpha(accent, 0.12);
  ctx.fillRect(rect.x, y - 26, rect.width, 52);

  // Bright core line.
  ctx.fillStyle = withAlpha(accent, 0.9);
  ctx.fillRect(rect.x, y - 1.5, rect.width, 3);
  ctx.restore();
}

/** Thin outline, so the target is visible before detection has anything to say. */
function paintBorder(ctx: CanvasRenderingContext2D, rect: GuideRect, f: ScanFrame) {
  ctx.save();
  roundRectPath(ctx, rect, R);
  ctx.strokeStyle = withAlpha(f.accent, 0.35 + 0.25 * f.lock);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Corner brackets. They grow and thicken as `lock` settles, so recognition is
 * felt rather than just coloured.
 */
function paintBrackets(ctx: CanvasRenderingContext2D, rect: GuideRect, f: ScanFrame) {
  const grow = 1 + 0.18 * f.lock;
  const arm = rect.width * 0.1 * grow;
  const width = 3 + 2 * f.lock + f.pulse * 0.8;
  const corners: [number, number, number, number][] = [
    [rect.x, rect.y, 1, 1],
    [rect.x + rect.width, rect.y, -1, 1],
    [rect.x, rect.y + rect.height, 1, -1],
    [rect.x + rect.width, rect.y + rect.height, -1, -1],
  ];

  const stroke = (lineWidth: number, color: string, blur: number) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    if (blur > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
    }
    ctx.beginPath();
    for (const [x, y, dx, dy] of corners) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + arm * dx, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + arm * dy);
    }
    ctx.stroke();
    ctx.restore();
  };

  // A glow underlay once locked, so the brackets read as "engaged".
  if (f.lock > 0) stroke(width * 3, withAlpha(f.accent, 0.28 * f.lock), 6);
  stroke(width, withAlpha(f.accent, 0.7 + 0.3 * f.lock), 0);
}

/**
 * Dwell ring — turns the deliberate "hold still" wait into visible progress
 * instead of an unexplained pause.
 */
function paintRing(ctx: CanvasRenderingContext2D, rect: GuideRect, f: ScanFrame) {
  const inner: GuideRect = {
    x: rect.x + 3,
    y: rect.y + 3,
    width: rect.width - 6,
    height: rect.height - 6,
  };
  const clamped = Math.min(1, Math.max(0, f.progress));
  // Flutter walks the path with computeMetrics; canvas has no equivalent, so
  // the perimeter is dashed instead — the same visual, one dash long enough to
  // cover the drawn fraction.
  const perimeter = 2 * (inner.width + inner.height) - 8 * R + 2 * Math.PI * R;

  const drawRing = (lineWidth: number, color: string, blur: number) => {
    ctx.save();
    roundRectPath(ctx, inner, R);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([perimeter * clamped, perimeter]);
    if (blur > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
    }
    ctx.stroke();
    ctx.restore();
  };

  drawRing(10, withAlpha(f.accent, 0.5), 8);
  drawRing(4.5, f.accent, 0);

  // At completion, a brief full-frame flash sells the capture.
  if (clamped >= 1) {
    ctx.save();
    roundRectPath(ctx, rect, R);
    ctx.fillStyle = withAlpha(f.accent, 0.16 * Math.sin(f.pulse * Math.PI));
    ctx.fill();
    ctx.restore();
  }
}
