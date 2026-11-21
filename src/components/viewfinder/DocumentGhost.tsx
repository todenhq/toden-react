'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { documentGuideRect, type GuideBand, type GuideRect } from '../../lib/document-guide';
import { specimenImageSource, specimenKind } from '../../lib/document-specimen';

// ─── The sample document in the capture guide ───────────────────────────────
//
// Shown for a few seconds when the camera opens, so the person sees what to hold
// up and which way round: a passport with PASSPORT written on it and its
// machine-readable lines inside the frame, a licence with its categories, the
// back of a card with what the back carries. The commonest passport mistake is
// cropping those lines off the bottom edge, which auto-capture then refuses.
//
// It sits exactly on documentGuideRect, the function the overlay and the
// post-shutter crop share, so they cannot disagree about where the document
// goes. The drawing itself is lib/document-specimen.ts. The timing mirrors the
// React Native and Flutter SDKs.
//
// It is never mirrored, even over a mirrored webcam preview: it is there to be
// read, and backwards writing reads as a fault.
//
// Between the two sides of a card it is also the turn-over: mounted with
// `turnFrom`, it shows the side just taken and turns over, in its place in the
// frame, to the side asked for next, then stays for that side's scan (user,
// 2026-11-18: a separate, smaller card turning over a dimmed camera, with the
// frame gone until it ended, did not read as one movement).

/** How long the side just taken is shown before it turns, and the turn. */
export const GHOST_TURN_DELAY_MS = 600;
const GHOST_TURN_MS = 800;

/** When it starts to leave if nothing is framed: long enough to read it, find
 *  the document and bring it up to the camera. */
export const DOCUMENT_GHOST_MS = 5000;
/** A document in frame brings that forward, but never before it has been read. */
const MIN_GHOST_MS = 2000;
/** Slow on purpose, so it melts away over the camera rather than blinking off
 *  while the person is still lining their document up with it. */
const FADE_OUT_MS = 1600;
const FADE_IN_MS = 300;
/** See-through, so the sample guides the person without hiding the camera: they
 *  have to see their own document arrive behind it. */
const GHOST_OPACITY = 0.6;

const SANS = 'system-ui, -apple-system, Helvetica Neue, Arial, sans-serif';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

/** What to draw: the ID in hand, and the side the camera is asking for. */
export interface DocumentSpecimenSubject {
  idType: string | null | undefined;
  title: string;
  country: string | null;
  /** The country's ISO-2 code: a few IDs are drawn as that country's own card. */
  countryCode?: string | null;
  side: 'front' | 'back';
}

/** One face of the document, ready for an `<img>`. */
export function specimenSource(
  subject: DocumentSpecimenSubject,
  side: 'front' | 'back',
  aspect: number,
  accent: string,
): string {
  return specimenImageSource({
    kind: specimenKind(subject.idType ?? null, subject.countryCode),
    title: subject.title,
    country: subject.country,
    side,
    aspect,
    accent,
    sans: SANS,
    mono: MONO,
  });
}

export function DocumentGhost({
  aspect,
  band = null,
  accent,
  subject,
  documentFound = false,
  turnFrom = null,
  holding = false,
}: {
  /** Guide aspect (width / height): a card and a passport page differ. */
  aspect: number;
  /** The free band an upright guide is fitted to, so the sample sits on it. */
  band?: GuideBand | null;
  accent: string;
  subject: DocumentSpecimenSubject;
  /** Ends it early, after MIN_GHOST_MS: once a document is framed the guidance
   *  has done its job and would only sit on top of the thing being captured. */
  documentFound?: boolean;
  /** The side to turn over from, when it opens as the turn-over. Read once, at
   *  mount: it is the same sample before and after the turn. */
  turnFrom?: 'front' | 'back' | null;
  /** Stays, and its timing does not start, while true: the turn-over is still
   *  on screen and nothing is being scanned yet. */
  holding?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shownAt = useRef(Date.now());
  const [guide, setGuide] = useState<GuideRect | null>(null);
  const [arrived, setArrived] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [from] = useState(turnFrom);
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!from) return undefined;
    const turn = setTimeout(() => setTurned(true), GHOST_TURN_DELAY_MS);
    return () => clearTimeout(turn);
  }, [from]);

  // Its time on screen counts from when the scan it guides starts.
  useEffect(() => {
    if (holding) return undefined;
    shownAt.current = Date.now();
    const hold = setTimeout(() => setLeaving(true), DOCUMENT_GHOST_MS);
    return () => clearTimeout(hold);
  }, [holding]);

  useEffect(() => {
    if (!documentFound || holding) return undefined;
    const wait = Math.max(0, MIN_GHOST_MS - (Date.now() - shownAt.current));
    const early = setTimeout(() => setLeaving(true), wait);
    return () => clearTimeout(early);
  }, [documentFound, holding]);

  // Measured on resize as well: the guide is derived from the viewport, so a
  // rotation would otherwise leave the sample on the old rectangle.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = host;
      if (width > 0 && height > 0) setGuide(documentGuideRect({ width, height }, aspect, band));
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    return () => observer?.disconnect();
  }, [aspect, band]);

  const place = guide && {
    left: guide.x,
    top: guide.y,
    width: guide.width,
    height: guide.height,
    opacity: arrived && !leaving ? GHOST_OPACITY : 0,
    transition: `opacity ${leaving ? FADE_OUT_MS : FADE_IN_MS}ms ease-in-out`,
  };
  // One face of the turning card: the back of each is hidden, so only the face
  // towards the camera shows, as with a real card.
  const face = (rotate: number) => ({
    transform: `rotateY(${rotate}deg)`,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    transition: `transform ${GHOST_TURN_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
  });

  return (
    <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {place && !from && (
        <img src={specimenSource(subject, subject.side, aspect, accent)} alt="" className="absolute" style={place} />
      )}
      {place && from && (
        <div className="absolute" style={{ ...place, perspective: '900px' }} data-ghost-turn={turned ? 'turned' : 'from'}>
          <img
            src={specimenSource(subject, from, aspect, accent)}
            alt=""
            className="absolute inset-0 h-full w-full motion-reduce:transition-none"
            style={face(turned ? 180 : 0)}
          />
          <img
            src={specimenSource(subject, subject.side, aspect, accent)}
            alt=""
            className="absolute inset-0 h-full w-full motion-reduce:transition-none"
            style={face(turned ? 0 : -180)}
          />
        </div>
      )}
    </div>
  );
}
