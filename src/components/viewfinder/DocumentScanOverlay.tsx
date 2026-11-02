import { useEffect, useRef } from 'react';
import type { DocumentFraming } from '../../lib/document-framing-gate';
import type { GuideBand } from '../../lib/document-guide';
import { paintScan } from './scan-painter';

// ─── Document scan overlay ──────────────────────────────────────────────────
//
// A port of the Flutter SDK's widgets/document_scan_overlay.dart. Visual
// feedback for auto-capture, deliberately elaborate: the wait before the
// shutter fires is real work (edge detection every frame, shape matching, a
// stability dwell), and with a bare guide box it reads as the camera being
// frozen. The motion is what makes "we are analysing this" legible.
//
// Each state maps to one question the user is actually asking:
//   searching   → "is the camera even working?"   → sweep + drifting grid
//   wrongShape  → "why won't it take the photo?"  → amber, motion stops
//   adjust      → "what do I do?"                 → amber, corners recede
//   holding     → "did it see it?"                → green lock-on + dwell ring
//   ready       → "is it done?"                   → full ring, flash

const SWEEP_MS = 2200;
const LOCK_MS = 380;

/** Flutter's Curves.easeOutBack — the springy settle that reads as a decision. */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function DocumentScanOverlay({
  framing,
  progress,
  aspect,
  band = null,
  successColor = '#22c55e',
  warningColor = '#f59e0b',
  primaryColor,
}: {
  framing: DocumentFraming;
  /** 0..1 through the stability dwell. */
  progress: number;
  /** Guide rect aspect (width / height) the document should fill. */
  aspect: number;
  /** The free band an upright guide is fitted to; the sample and crop share it. */
  band?: GuideBand | null;
  successColor?: string;
  warningColor?: string;
  /** Resolved brand primary; the searching state uses it. */
  primaryColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Animation state lives in refs: this repaints every frame, and routing it
  // through React state would re-render the whole capture step 60 times a
  // second for a canvas that draws itself.
  const startedAt = useRef<number>(0);
  const lockRef = useRef(0);
  const latest = useRef({ framing, progress, aspect, band, successColor, warningColor, primaryColor });
  latest.current = { framing, progress, aspect, band, successColor, warningColor, primaryColor };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let previous = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = parent;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const frame = (now: number) => {
      const dt = now - previous;
      previous = now;
      if (!startedAt.current) startedAt.current = now;

      const s = latest.current;
      const locked = s.framing === 'holding' || s.framing === 'ready';
      const needsAction = s.framing === 'wrongShape' || s.framing === 'adjust';

      // Lock settles forward when recognised and reverses when lost, so the
      // brackets retract rather than snapping back.
      const dir = locked ? 1 : -1;
      lockRef.current = Math.min(1, Math.max(0, lockRef.current + (dir * dt) / LOCK_MS));
      const lock = easeOutBack(lockRef.current);

      const phase = ((now - startedAt.current) % SWEEP_MS) / SWEEP_MS;

      // Amber for "I can see something, but it isn't right" — distinct from the
      // neutral searching state, so the user knows to act rather than wait.
      const accent = locked
        ? s.successColor
        : needsAction
          ? s.warningColor
          : s.primaryColor;

      paintScan(
        ctx,
        { width: canvas.clientWidth, height: canvas.clientHeight },
        {
          // Freeze the search motion once locked: continuing to sweep would
          // imply we're still looking after we've decided.
          sweep: locked ? null : phase,
          lock,
          progress: s.progress,
          // Only dim once we're confident — dimming while searching makes a
          // dark room impossible to aim in.
          scrim: locked ? 0.45 : needsAction ? 0.25 : 0.18,
          pulse: locked ? (Math.sin(phase * Math.PI * 4) + 1) / 2 : 0,
          aspect: s.aspect,
          band: s.band,
          accent,
        },
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
