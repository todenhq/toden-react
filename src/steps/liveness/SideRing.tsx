'use client';

import { useEffect, useMemo, useRef } from 'react';
import { windowOutline, type Size } from '../../lib/liveness-cutout';
import { WINDOW_SIDES, sideSegments, type WindowSide } from '../../lib/window-segments';
import { DIRECTION_CHALLENGES, type DirectionChallenge } from '../../liveness/types';
import { usePrefersReducedMotion } from './InstructionPill';
import { RING_INSET, RING_REACH, RING_STROKE, RING_TRACK } from './WindowRing';

// ---------------------------------------------------------------------------
// The line round the camera's window when the test is head directions: four
// parts, one per side. The side the head should go to lights up, and turns
// green when the person has turned that way. When the run's are green they
// close into one ring, which pulses once (user, 2026-11-17). A run asks for three
// of the four (2026-11-18), and the ring closes when those three are done.
//
// With the words above the window and the voice, it is the third way a
// direction is given. It took the place of an arrow drawn inside the window,
// which sat on the face. Left and right are the person's own, which on the
// mirrored picture are the screen's.
//
// Kept plain (user, 2026-11-18: "make it simpler and more accessible"). One
// line per side and nothing else round it:
//
//   waiting   a quiet white line, the same over any room
//   asked     amber and thicker: the side to turn to (user, 2026-11-18: a
//             bright colour that shows attention, thicker on its side)
//   done      green
//
// Waiting and asked differ in weight and brightness as well as colour. A tick
// on each done side was tried for colour blindness and taken off (user,
// 2026-11-18: "I do not like those checks"); the tick in the window after each
// direction, the words and the voice still say a direction is done. One soft shadow under the whole line keeps it readable on a pale
// wall and a dark room alike; it replaced a glow, a dark edge and a breathing
// band round the asked side, which made four kinds of line at once.
//
// On a warning the waiting sides go red, as the line of the other tests does.
// ---------------------------------------------------------------------------

/** The side of the window each direction lights. */
export const SIDE_OF: Record<DirectionChallenge, WindowSide> = {
  turnLeft: 'left',
  turnRight: 'right',
  lookUp: 'top',
  lookDown: 'bottom',
};

export type SideState = 'idle' | 'asked' | 'done';

/** What each side shows, from the direction asked for and those done. */
export function sideStates(
  asked: DirectionChallenge | null,
  done: readonly DirectionChallenge[],
): Record<WindowSide, SideState> {
  const out: Record<WindowSide, SideState> = { top: 'idle', right: 'idle', bottom: 'idle', left: 'idle' };
  if (asked) out[SIDE_OF[asked]] = 'asked';
  // Done wins: a side that is green stays green.
  for (const direction of done) out[SIDE_OF[direction]] = 'done';
  return out;
}

/** The side to turn to. */
export const ATTENTION = 'var(--verification-attention, #ffb020)';
const GREEN = 'var(--verification-success)';
/** A waiting side: white, quiet, readable over any room under the shadow. */
export const WAITING = 'rgba(255, 255, 255, 0.7)';
/** The asked side is the heaviest line on screen. */
export const LIT_STROKE = RING_STROKE + 4;
// A close, firm shadow and a wider soft one: the first keeps a white line
// readable on a pale wall, the second lifts every line off the picture.
const SHADOW = 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25))';
/** The pulse when the ring closes: how far it grows as it fades. */
const PULSE_GROW = 1.07;
const PULSE_MS = 850;
const EASE = '300ms ease-out';

export function SideRing({
  window,
  asked,
  done,
  directions = DIRECTION_CHALLENGES,
  track,
}: {
  window: Size;
  /** The direction being asked for now, or null between them. */
  asked: DirectionChallenge | null;
  /** The directions the person has done. */
  done: readonly DirectionChallenge[];
  /** The directions this run asks for: three of the four. The side no run
   *  asks for stays a waiting line until the whole ring closes green. */
  directions?: readonly DirectionChallenge[];
  /** The line's colour from the live view: the usual track while all is well
   *  (drawn here as the quiet white), red on a warning. */
  track: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const pulseRef = useRef<SVGPathElement | null>(null);
  const sides = useMemo(() => sideSegments(window, RING_INSET), [window]);
  const whole = useMemo(() => windowOutline(window, RING_INSET).d, [window]);
  const states = sideStates(asked, done);
  // Closed once every direction of the run is done, which is three sides.
  const closed = directions.length > 0 && directions.every((direction) => done.includes(direction));
  // A warning turns the waiting sides red; otherwise they are the quiet white.
  const waiting = track === RING_TRACK ? WAITING : track;

  // One pulse as the four sides close into a ring.
  useEffect(() => {
    const el = pulseRef.current;
    if (!closed || !el || reduceMotion || typeof el.animate !== 'function') return undefined;
    const run = el.animate(
      [
        { opacity: 0.75, transform: 'scale(1)' },
        { opacity: 0, transform: `scale(${PULSE_GROW})` },
      ],
      { duration: PULSE_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    return () => run.cancel();
  }, [closed, reduceMotion]);

  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: -RING_REACH, top: -RING_REACH, overflow: 'visible', filter: SHADOW }}
      width={window.width + RING_REACH * 2}
      height={window.height + RING_REACH * 2}
      viewBox={`${-RING_REACH} ${-RING_REACH} ${window.width + RING_REACH * 2} ${window.height + RING_REACH * 2}`}
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
      data-side-ring={closed ? 'closed' : 'open'}
    >
      {WINDOW_SIDES.map((side) => {
        const state = states[side];
        return (
          <g key={side} data-side={side} data-state={state}>
            <path
              d={sides[side]}
              stroke={state === 'done' ? GREEN : state === 'asked' ? ATTENTION : waiting}
              strokeWidth={state === 'asked' ? LIT_STROKE : RING_STROKE}
              style={{ transition: `stroke ${EASE}, stroke-width ${EASE}` }}
            />
          </g>
        );
      })}
      {/* The run's directions done: the gaps close, and the ring pulses once. */}
      <path d={whole} stroke={GREEN} strokeWidth={RING_STROKE} opacity={closed ? 1 : 0} style={{ transition: `opacity ${EASE}` }} />
      <path
        ref={pulseRef}
        d={whole}
        stroke={GREEN}
        strokeWidth={RING_STROKE}
        opacity={0}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </svg>
  );
}
