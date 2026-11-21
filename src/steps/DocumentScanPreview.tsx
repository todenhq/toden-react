'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { specimenSource, type DocumentSpecimenSubject } from '../components/viewfinder/DocumentGhost';
import { documentGuideAspect } from '../lib/document-guide';

// ---------------------------------------------------------------------------
// A picture of the document scan, for the screen that comes before it: the
// document the person chose, within the camera's frame marks with no backdrop
// of its own (it sits in the screen's tinted box), drawn with the same
// sample the camera's guide shows (lib/document-specimen.ts, through
// DocumentGhost's specimenSource), so the two screens show the same thing.
//
// A band of light passes down it as it is read, then a light green cover and
// a tick say it worked. A document with two sides turns over, catching the
// light as it turns, and its back is read the same way; then it turns back
// and starts again. A passport page, or any one-sided document, is read
// again after a rest.
//
// It is a picture: hidden from screen readers (the words beside it say what
// happens next) and, for a person who has asked for less motion, the front of
// the document in its frame, still.
// ---------------------------------------------------------------------------

/** How the loop runs, in seconds. */
const SCAN = 1.6;
const PASS = 0.8;
const REST = 0.25;
const FLIP = 0.75;
/** One side: read it, the tick, a beat, turn it over. */
const SIDE = SCAN + PASS + REST + FLIP;
/** How long it takes to come in, once. */
const COMING_IN = 0.5;
/** The specimen's own corner, as a share of its width (rx 40 on 1000). */
const CORNER = 0.04;
/** Room between the document and the frame marks, either side and above and
 *  below: enough for the marks to sit clear of it, no more. */
const ROOM_X = 20;
const ROOM_Y = 22;
/** The document's width bounds, in CSS pixels. Between them it takes all the
 *  room it is given. */
const MIN_WIDTH = 180;
const MAX_WIDTH = 340;
/** Before it has been measured (and on the server). */
const FIRST_WIDTH = 270;

// useLayoutEffect warns when rendered on the server; it only measures.
const useMeasure = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** The light a document catches as it turns, on the document so it turns too. */
const Glint = React.forwardRef<HTMLDivElement>(function Glint(_, ref) {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: 0,
        backgroundImage: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.6) 50%, transparent 62%)',
        backgroundSize: '250% 100%',
      }}
    />
  );
});

export function DocumentScanPreview({
  subject,
  twoSided,
  accent,
  width,
}: {
  /** The document the person chose: its ID type, name and country. */
  subject: Omit<DocumentSpecimenSubject, 'side'>;
  /** Its details are on both sides, so it turns over to be read again. */
  twoSided: boolean;
  /** The workflow's colour, which the sample is printed in. */
  accent: string;
  /** The document's width, in CSS pixels. Left out, it takes the room it has. */
  width?: number;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const aspect = documentGuideAspect(subject.idType);
  // As big as the room allows: the document is what this picture is about.
  const hostRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<number | null>(null);
  useMeasure(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => setRoom(host.clientWidth);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    return () => observer?.disconnect();
  }, []);
  const docWidth =
    width ?? Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, (room ?? FIRST_WIDTH + ROOM_X * 2) - ROOM_X * 2)));
  const docHeight = Math.round(docWidth / aspect);
  const radius = Math.round(docWidth * CORNER);
  // The camera's frame: room round the document, as the viewfinder leaves it.
  const frameWidth = docWidth + ROOM_X * 2;
  const frameHeight = docHeight + ROOM_Y * 2;
  const full = { ...subject, side: 'front' as const };
  const front = specimenSource(full, 'front', aspect, accent);
  const back = twoSided ? specimenSource(full, 'back', aspect, accent) : null;

  const stageRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const glintRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coverRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const doc = docRef.current;
    const scan = scanRef.current;
    if (!stage || !doc || !scan) return undefined;
    const glints = glintRefs.current.filter((el): el is HTMLDivElement => el != null);
    const glint = (opacity: number, at: number): void => {
      for (const el of glints) {
        el.style.opacity = String(opacity);
        el.style.backgroundPosition = `${at}% 0`;
      }
    };
    const pass = (on: boolean): void => {
      if (coverRef.current) coverRef.current.style.opacity = on ? '1' : '0';
      if (tickRef.current) {
        tickRef.current.style.opacity = on ? '1' : '0';
        tickRef.current.style.transform = on ? 'scale(1)' : 'scale(0.4)';
      }
    };
    /** The read: the band of light down the document, then the cover and tick. */
    const read = (t: number): void => {
      const reading = t >= 0 && t < SCAN;
      scan.style.opacity = reading ? String(Math.min(1, t / 0.18, (SCAN - t) / 0.18)) : '0';
      scan.style.top = `${ease(t / SCAN) * 100}%`;
      pass(t >= SCAN && t < SCAN + PASS);
    };
    pass(false);
    scan.style.opacity = '0';
    glint(0, 130);
    doc.style.transform = 'none';
    if (reduceMotion) {
      stage.style.opacity = '1';
      return undefined;
    }

    const began = performance.now();
    let frame = requestAnimationFrame(function step() {
      const now = (performance.now() - began) / 1000;
      // Coming in, once.
      const arriving = Math.min(1, now / COMING_IN);
      stage.style.opacity = String(arriving);
      stage.style.transform = `scale(${0.94 + 0.06 * ease(arriving)})`;
      const clock = Math.max(0, now - COMING_IN);

      if (!twoSided) {
        read(clock % (SCAN + PASS + REST * 3));
      } else {
        const at = clock % (SIDE * 2);
        const onBack = at >= SIDE;
        const t = at - (onBack ? SIDE : 0);
        read(t);
        // Then it turns over, catching the light as it goes.
        const turning = ease((t - SCAN - PASS - REST) / FLIP);
        const lift = Math.sin(Math.PI * turning);
        doc.style.transform = `rotateY(${(onBack ? 180 : 0) + 180 * turning}deg) scale(${1 + 0.04 * lift})`;
        glint(0.9 * lift, 130 - 160 * turning);
      }
      frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
      stage.style.opacity = '1';
      stage.style.transform = 'none';
    };
  }, [reduceMotion, twoSided]);

  const docBox: React.CSSProperties = {
    left: (frameWidth - docWidth) / 2,
    top: (frameHeight - docHeight) / 2,
    width: docWidth,
    height: docHeight,
  };
  // The sample is printed a little see-through for the camera; here it sits on
  // white, as a document does.
  const face = 'absolute inset-0 overflow-hidden bg-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)]';
  // The frame marks in the workflow's colour, so they read on a light page and
  // a dark one alike.
  const corner = 'absolute h-5 w-5 border-primary/70';
  return (
    <div ref={hostRef} className="flex w-full self-stretch justify-center">
    <div
      aria-hidden
      data-document-scan-preview={subject.idType ?? 'document'}
      className="relative"
      style={{ width: frameWidth, height: frameHeight }}
    >
      <div ref={stageRef} className="absolute inset-0" style={{ opacity: reduceMotion ? 1 : 0, perspective: 900 }}>
        <div ref={docRef} className="absolute" style={{ ...docBox, transformStyle: 'preserve-3d' }}>
          <div className={face} style={{ borderRadius: radius, backfaceVisibility: 'hidden' }}>
            <img src={front} alt="" className="absolute inset-0 size-full max-w-none" />
            <Glint ref={(el) => { glintRefs.current[0] = el; }} />
          </div>
          {back && (
            <div
              className={face}
              style={{ borderRadius: radius, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <img src={back} alt="" className="absolute inset-0 size-full max-w-none" />
              <Glint ref={(el) => { glintRefs.current[1] = el; }} />
            </div>
          )}
        </div>
        {/* The band of light that reads it, inside its edges. */}
        <div className="pointer-events-none absolute overflow-hidden" style={{ ...docBox, borderRadius: radius }}>
          <div ref={scanRef} className="absolute inset-x-0 -translate-y-full" style={{ opacity: 0, top: 0 }}>
            {/* A soft trail above a bright edge. */}
            <div
              className="h-8"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--verification-success) 28%, transparent))',
              }}
            />
            <div className="h-[2px] bg-[var(--verification-success)] shadow-[0_0_10px_2px_var(--verification-success)]" />
          </div>
        </div>
      </div>
      {/* The camera's frame marks, as the viewfinder draws them. */}
      <span className={`${corner} left-1.5 top-1.5 rounded-tl-[9px] border-l-[2.5px] border-t-[2.5px]`} />
      <span className={`${corner} right-1.5 top-1.5 rounded-tr-[9px] border-r-[2.5px] border-t-[2.5px]`} />
      <span className={`${corner} bottom-1.5 left-1.5 rounded-bl-[9px] border-b-[2.5px] border-l-[2.5px]`} />
      <span className={`${corner} bottom-1.5 right-1.5 rounded-br-[9px] border-b-[2.5px] border-r-[2.5px]`} />
      {/* After each read, as in the liveness check: a light green cover over
          the document, and a tick. */}
      <div
        ref={coverRef}
        className="pointer-events-none absolute bg-[var(--verification-success)]/20"
        style={{ ...docBox, borderRadius: radius, opacity: 0, transition: 'opacity 140ms ease-out' }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          ref={tickRef}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--verification-success)] shadow-lg"
          style={{
            opacity: 0,
            transform: 'scale(0.4)',
            transition: 'transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 90ms linear',
          }}
        >
          <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>
    </div>
  );
}
