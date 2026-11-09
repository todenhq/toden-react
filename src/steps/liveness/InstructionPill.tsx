'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CircleCheck, TriangleAlert } from '../../components/icons';
import { cn } from '../../lib/utils';
import { Pill } from './surfaces';
import {
  PILL_FADE_BEZIER,
  PILL_MOTION_MS,
  PILL_SIZE_BEZIER,
  cssBezier,
  pillContentWidth,
} from './instruction-pill-motion';

// ---------------------------------------------------------------------------
// The instruction over the full-screen camera.
//
//  - It is read out. The person is looking at their own face, and somebody
//    using a screen reader cannot see the words at all, so the pill is a live
//    region and every change is announced.
//  - A warning carries a mark as well as its red, and a finished step a tick
//    as well as its green: the colour is never the only signal.
//  - The words change in place. The pill keeps its position and eases to its
//    new width while one line fades into the next (instruction-pill-motion.ts
//    has the timings, which are Flutter's).
//
// CSS cannot transition `width: auto`, so a hidden copy of the pill lays the
// new line out at its natural width, and the visible pill's content box is
// given that width in pixels and transitions to it. The line itself sits in a
// box of its final width, centred and clipped, so the words never rewrap
// mid-change.
// ---------------------------------------------------------------------------

export type InstructionTone = 'prompt' | 'warning' | 'done';

type Line = { key: string; text: string; tone: InstructionTone; leading?: React.ReactNode };

type Swap = {
  /** The line last rendered: the one to fade out at the next change. */
  line: Line | null;
  /** The line fading out, with the width it was measured at. */
  outgoing: (Line & { width: number | null }) | null;
  /** Bumps on every change, so a stale fade's end cannot clear a newer one. */
  seq: number;
};

/** The content box's width while a new line is not yet measured: more than
 *  any line needs, so nothing wraps; the pill's own box clips it. */
const UNMEASURED_ROOM = 4096;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION).matches,
  );
  useEffect(() => {
    const query = typeof window !== 'undefined' ? window.matchMedia?.(REDUCED_MOTION) : undefined;
    if (!query) return;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function fade(el: HTMLElement | null, from: number, to: number) {
  if (!el || typeof el.animate !== 'function') return;
  el.animate([{ opacity: from }, { opacity: to }], {
    duration: PILL_MOTION_MS,
    easing: cssBezier(PILL_FADE_BEZIER),
    fill: 'both',
  });
}

function Row({ line, measureRef }: { line: Line; measureRef?: React.Ref<HTMLSpanElement> }) {
  const mark =
    line.tone === 'warning' ? (
      <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
    ) : line.tone === 'done' ? (
      <CircleCheck className="h-5 w-5 shrink-0 text-[var(--verification-success)]" aria-hidden />
    ) : (
      (line.leading ?? null)
    );
  return (
    // The green of a finished step does not reach 4.5:1 on a light surface,
    // so the tick carries it and the words stay the text colour.
    <span ref={measureRef} className="flex items-center justify-center gap-2">
      {mark}
      <span
        className={cn(
          'text-center text-base font-semibold',
          line.tone === 'warning' ? 'text-destructive' : 'text-foreground',
        )}
      >
        {line.text}
      </span>
    </span>
  );
}

export function InstructionPill({
  text,
  tone = 'prompt',
  leading,
}: {
  text: string;
  tone?: InstructionTone;
  /** The gesture's picture, on a phone too short to show it above the pill.
   *  Shown for a prompt only: a warning's mark takes its place. */
  leading?: React.ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const visible = text.trim().length > 0;
  const key = `${tone}:${leading != null}:${text}`;

  // The measured natural width of the line now shown, by key.
  const [measured, setMeasured] = useState<{ key: string; width: number } | null>(null);

  const [swap, setSwap] = useState<Swap>(() => ({
    line: visible ? { key, text, tone, leading } : null,
    outgoing: null,
    seq: 0,
  }));

  // A new line: decided while rendering, so the old one is still on screen
  // in the same frame as the new one starts to come in.
  const lineKey = visible ? key : null;
  if ((swap.line?.key ?? null) !== lineKey) {
    const before = swap.line;
    const animate = !reduceMotion && before != null && visible;
    setSwap({
      line: visible ? { key, text, tone, leading } : null,
      outgoing: animate
        ? { ...before, width: measured?.key === before.key ? measured.width : null }
        : null,
      seq: swap.seq + 1,
    });
  }

  // The crossfade, started before the first paint of the new line.
  const incomingRef = useRef<HTMLSpanElement>(null);
  const outgoingRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!swap.outgoing) return;
    fade(incomingRef.current, 0, 1);
    fade(outgoingRef.current, 1, 0);
    const { seq } = swap;
    const done = window.setTimeout(
      () => setSwap((s) => (s.seq === seq ? { ...s, outgoing: null } : s)),
      PILL_MOTION_MS,
    );
    return () => window.clearTimeout(done);
  }, [swap]);

  // The new line's natural width, from the hidden copy. A ResizeObserver
  // reports before the frame is painted, in layout pixels (unscaled by any
  // transform), and again if the font loads or the room changes.
  const measureRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const width = entry?.borderBoxSize?.[0]?.inlineSize ?? entry?.contentRect.width;
      if (width == null) return;
      setMeasured((m) => (m?.key === key && m.width === width ? m : { key, width }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [key, visible]);

  const incomingWidth = measured?.key === key ? measured.width : null;
  const target = visible ? pillContentWidth(incomingWidth, swap.outgoing?.width) : null;
  const current: Line = { key, text, tone, leading };

  // The pill's box keeps the width it last had until the new line is
  // measured, rather than snapping to its natural size and back; meanwhile
  // the words get all the room they want, centred and clipped, rather than
  // wrapping at the old line's width. Hidden, it forgets, and comes back at
  // its own size.
  const [boxWidth, setBoxWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!visible) setBoxWidth(null);
    else if (target != null) setBoxWidth(target);
  }, [visible, target]);
  const content = target ?? UNMEASURED_ROOM;

  return (
    // The live region stays mounted while the words come and go: a region
    // that appears WITH its first words is not announced.
    //
    // Stretched to the room it is given, not shrunk to the pill: the parent
    // centres its children, and a region as wide as the pill would hold the
    // measuring copy to the OLD line's width, so a longer line measured
    // wrapped and stayed wrapped.
    <div
      className="flex justify-center"
      style={{ position: 'relative', alignSelf: 'stretch' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {visible ? (
        <>
          {/* The measuring copy: the same pill under the same max width, out
              of the layout, unseen and unread. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <Pill opacity={0.92}>
              <Row line={current} measureRef={measureRef} />
            </Pill>
          </div>
          <Pill opacity={0.92}>
            <span
              style={
                boxWidth == null
                  ? { display: 'flex', justifyContent: 'center', minWidth: 0 }
                  : {
                      display: 'flex',
                      justifyContent: 'center',
                      minWidth: 0,
                      width: boxWidth,
                      overflow: 'hidden',
                      transition: reduceMotion
                        ? 'none'
                        : `width ${PILL_MOTION_MS}ms ${cssBezier(PILL_SIZE_BEZIER)}`,
                    }
              }
            >
              <span
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  flexShrink: boxWidth == null ? 1 : 0,
                  minWidth: 0,
                  width: boxWidth == null ? undefined : content,
                }}
              >
                <span key={key} ref={incomingRef} style={{ display: 'flex', minWidth: 0 }}>
                  <Row line={current} />
                </span>
                {swap.outgoing ? (
                  <span
                    key={swap.outgoing.key}
                    ref={outgoingRef}
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Row line={swap.outgoing} />
                  </span>
                ) : null}
              </span>
            </span>
          </Pill>
        </>
      ) : null}
    </div>
  );
}
