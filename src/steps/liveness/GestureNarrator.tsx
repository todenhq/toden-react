'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  NARRATOR_REST,
  NARRATOR_SECONDS,
  narratorPose,
  narratorStillPose,
  type NarratorGesture,
  type NarratorPose,
} from '../../liveness/narrator-pose';
import { usePrefersReducedMotion } from './InstructionPill';

// ---------------------------------------------------------------------------
// The gesture narrator: a face icon, in the manner of a phone's face unlock,
// that pops up in the camera's window, acts out the gesture being asked for
// once, and goes. It works like a hint in a game: quick to come, quicker to
// go, so it is out of the way before the person moves.
//
// It comes back to show again only to someone who is not responding: nothing
// done with their face for a while (liveness/response-watch.ts). A person who
// is trying, and has not got it yet, is left to it. It is not there while they
// are being asked to move into place, for the flash or the hold, or once the
// gesture has landed.
//
// The words above the window say the same, so it is hidden from screen
// readers. With less motion asked for it does not move: it shows the pose
// that says the gesture, then fades.
//
// A workflow can switch it off (`livenessGestureGuide: false`).
// ---------------------------------------------------------------------------

type Turn = 'showing' | 'gone';

/** How long the person may do nothing before it shows them again. */
const PATIENCE_SECONDS = 5;
/** How often it looks to see whether they have gone quiet. */
const LOOK_EVERY_MS = 400;
/** How long the still pose stays, with less motion asked for. */
const STILL_SECONDS = 2.5;
/** Its side, as a share of the window's width. */
const SIZE = 0.6;

const APPEAR = 'opacity 200ms ease-out, transform 380ms cubic-bezier(0.34, 1.4, 0.64, 1)';
const LEAVE = 'opacity 180ms ease-in, transform 180ms ease-in';
const FADE_ONLY = 'opacity 260ms ease-in-out';

// The icon, in a 100 by 100 square, drawn as Apple draws its face
// recognition face (user, 2026-11-17): a round head filling the square, with
// no ring round it, in place of the square corner marks it had before. The
// features are kept to the head, so in a turn or a nod they slide round it as
// on a ball and go out of sight at its edge rather than over it, and the head
// turns with them: its outline narrows and leans the way it goes.
const HEAD_R = 44;
/** Inside the head's line: where the features may show. */
const FACE_INSET = 3.5;
/** How much the head's outline narrows at the end of a turn, and flattens at
 *  the end of a nod, and how far it leans that way. */
const HEAD_TURN_NARROW = 0.1;
const HEAD_NOD_FLATTEN = 0.06;
const HEAD_TURN_LEAN = 3;
const HEAD_NOD_LEAN = 2.5;
/** The features were drawn for a smaller face, so they are scaled to this
 *  head and centred on it, at the same line weight. */
const FEATURES_SCALE = 1.15;
const FEATURES_FIT = `translate(50 50) scale(${FEATURES_SCALE}) translate(-50 -54)`;
const EYES_AT = [37, 63];

/** The head's outline in a pose, inset by [inset] for the features' clip. */
function headShape(pose: NarratorPose, inset = 0): { cx: number; cy: number; rx: number; ry: number } {
  return {
    cx: 50 + pose.across * HEAD_TURN_LEAN,
    cy: 50 + pose.down * HEAD_NOD_LEAN,
    rx: HEAD_R * (1 - HEAD_TURN_NARROW * Math.abs(pose.across)) - inset,
    ry: HEAD_R * (1 - HEAD_NOD_FLATTEN * Math.abs(pose.down)) - inset,
  };
}

function setShape(el: SVGEllipseElement | null, shape: ReturnType<typeof headShape>): void {
  if (!el) return;
  el.setAttribute('cx', String(shape.cx));
  el.setAttribute('cy', String(shape.cy));
  el.setAttribute('rx', String(shape.rx));
  el.setAttribute('ry', String(shape.ry));
}
const EYE_Y = 40;
/** Which side of the face each eye is on: the left one, then the right. */
const EYE_SIDE = [-1, 1];
/** How far the eyes travel in their look, in the drawing's units. */
const LOOK_X = 3.2;
const LOOK_Y = 2.6;
/** The line's weight, a little heavier than the set's so it holds over a
 *  busy camera picture (user, 2026-11-17). */
const LINE = 6.5;

/** An open eye is a short upright stroke, which shrinks as it closes. */
function eyeLine(x: number, y: number, open: number): string {
  const h = 4.5 * open;
  return `M${x} ${y - h}L${x} ${y + h}`;
}
/** A shut eye is a short flat stroke, which shows only as the eye closes. */
const lidLine = (x: number, y: number): string => `M${x - 4.5} ${y}H${x + 4.5}`;
const lidOpacity = (open: number): number => Math.max(0, Math.min(1, (0.45 - open) / 0.35));

/** The mouth, foreshortened on the side the face turns away to. */
function mouthLine(smile: number, across = 0): string {
  const end = 68 - 3 * smile;
  const reach = 13 + 4 * smile;
  const left = reach * (1 + 0.16 * across);
  const right = reach * (1 - 0.16 * across);
  return `M${50 - left} ${end}Q${50 + (left - right) / 2} ${74 + 9 * smile} ${50 + right} ${end}`;
}

/** The nose: a line down and a hook at its tip, which points the way the face
 *  turns and lengthens as the face tips down. */
function noseLine(across: number, down: number): string {
  const tip = 54 + 3 * down;
  const hook = -4.5 + 8 * Math.max(0, across) - 1.5 * Math.max(0, -across);
  return `M50 37V${tip}Q50 ${tip + 4} ${50 + hook} ${tip + 4}`;
}

/** The face's lines: white, the colour of the line round the window. */
export const NARRATOR_COLOUR = '#ffffff';

export function GestureNarrator({
  gesture,
  respondedAtRef,
  windowWidth,
  showAgain = 0,
}: {
  /** The gesture to act out, or null for it to go. */
  gesture: NarratorGesture | null;
  /** When the person last did anything with their face, on the performance
   *  clock (0 for never). */
  respondedAtRef: { current: number };
  /** The width of the camera's window, which it is sized to. */
  windowWidth: number;
  /** Changes each time it should act the gesture out again now, without
   *  waiting for the person to go quiet: they went the wrong way. */
  showAgain?: number;
}) {
  const [turn, setTurn] = useState<Turn>('showing');
  const reduceMotion = usePrefersReducedMotion();
  const featuresRef = useRef<SVGGElement>(null);
  const noseRef = useRef<SVGPathElement>(null);
  const eyeRefs = useRef<(SVGPathElement | null)[]>([]);
  const lidRefs = useRef<(SVGPathElement | null)[]>([]);
  const mouthRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGEllipseElement>(null);
  const clipRef = useRef<SVGEllipseElement>(null);
  const faceClip = `narrator-face-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Every gesture is shown first.
  useEffect(() => {
    if (gesture) setTurn('showing');
  }, [gesture]);

  // Asked to show again: back at once.
  const shownFor = useRef(showAgain);
  useEffect(() => {
    if (showAgain === shownFor.current) return;
    shownFor.current = showAgain;
    if (gesture) setTurn('showing');
  }, [showAgain, gesture]);

  // One pass, then it goes.
  useEffect(() => {
    if (!gesture || turn !== 'showing') return undefined;
    const seconds = reduceMotion ? STILL_SECONDS : NARRATOR_SECONDS[gesture];
    const timer = setTimeout(() => setTurn('gone'), seconds * 1000);
    return () => clearTimeout(timer);
  }, [gesture, turn, reduceMotion]);

  // Gone for as long as the person is doing something. Once they have gone
  // quiet, from when it left or since their last move, it comes back.
  useEffect(() => {
    if (!gesture || turn !== 'gone') return undefined;
    const left = performance.now();
    const looking = setInterval(() => {
      const quietSince = Math.max(left, respondedAtRef.current);
      if (performance.now() - quietSince >= PATIENCE_SECONDS * 1000) setTurn('showing');
    }, LOOK_EVERY_MS);
    return () => clearInterval(looking);
  }, [gesture, turn, respondedAtRef]);

  useEffect(() => {
    const draw = (pose: NarratorPose): void => {
      setShape(headRef.current, headShape(pose));
      setShape(clipRef.current, headShape(pose, FACE_INSET));
      const squeeze = 1 - 0.2 * Math.abs(pose.across);
      featuresRef.current?.setAttribute(
        'transform',
        `translate(${50 + pose.across * 11} ${pose.down * 8}) scale(${squeeze} 1) translate(-50 0)`,
      );
      // The nose stands out from the face, so it moves further in a turn, and
      // rises a little with a smile.
      noseRef.current?.setAttribute('transform', `translate(${pose.across * 5} ${pose.down * 2 - pose.smile * 1.5})`);
      noseRef.current?.setAttribute('d', noseLine(pose.across, pose.down));
      EYES_AT.forEach((x, i) => {
        // Each eye looks ahead of the head. The one on the far side of a turn
        // is foreshortened and the near one grows; both shorten as the face
        // tips away.
        const ex = x + pose.lookX * LOOK_X;
        const ey = EYE_Y + pose.lookY * LOOK_Y;
        const depth = (1 - 0.24 * pose.across * EYE_SIDE[i]!) * (1 - 0.2 * Math.abs(pose.down));
        eyeRefs.current[i]?.setAttribute('d', eyeLine(ex, ey, pose.eyes * depth));
        lidRefs.current[i]?.setAttribute('d', lidLine(ex, ey));
        lidRefs.current[i]?.setAttribute('opacity', String(lidOpacity(pose.eyes)));
      });
      // The mouth sits lower on the face, so it moves a little less than the
      // eyes in a nod.
      mouthRef.current?.setAttribute('d', mouthLine(pose.smile, pose.across));
      mouthRef.current?.setAttribute('transform', `translate(0 ${-pose.down * 1.5})`);
    };
    if (!gesture) return undefined;
    if (reduceMotion) {
      draw(narratorStillPose(gesture));
      return undefined;
    }
    if (turn !== 'showing') return undefined;
    draw(NARRATOR_REST);
    const started = performance.now();
    const once = NARRATOR_SECONDS[gesture];
    let frame = requestAnimationFrame(function tick() {
      draw(narratorPose(gesture, Math.min((performance.now() - started) / 1000, once)));
      frame = requestAnimationFrame(tick);
    });
    // The last pose stays while it goes.
    return () => cancelAnimationFrame(frame);
  }, [gesture, turn, reduceMotion]);

  const shown = Boolean(gesture) && turn === 'showing';
  const side = Math.round(windowWidth * SIZE);
  return (
    <svg
      aria-hidden
      data-gesture-narrator={gesture ?? undefined}
      data-narrator-turn={gesture ? turn : undefined}
      viewBox="0 0 100 100"
      width={side}
      height={side}
      fill="none"
      stroke={NARRATOR_COLOUR}
      strokeWidth={LINE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{
        marginLeft: -side / 2,
        marginTop: -side / 2,
        opacity: shown ? 1 : 0,
        transform: shown || reduceMotion ? 'none' : 'scale(0.86)',
        transition: reduceMotion ? FADE_ONLY : shown ? APPEAR : LEAVE,
        // Flat white lines, with no edge or shadow round them (user,
        // 2026-11-16). White to match the line round the window, where white
        // is what is still to do (user, 2026-11-18); solid where that line is
        // at 70%, because this sits ON the face and 70% white washed out over
        // a lit forehead, as the line's earlier faint tint had (2026-11-17).
        // It was the workflow's colour until then.
      }}
    >
      <defs>
        <clipPath id={faceClip}>
          <ellipse ref={clipRef} cx="50" cy="50" rx={HEAD_R - FACE_INSET} ry={HEAD_R - FACE_INSET} />
        </clipPath>
      </defs>
      <ellipse ref={headRef} cx="50" cy="50" rx={HEAD_R} ry={HEAD_R} />
      <g clipPath={`url(#${faceClip})`}>
        <g transform={FEATURES_FIT} strokeWidth={LINE / FEATURES_SCALE}>
          <g ref={featuresRef} transform="translate(0 0)">
            {EYES_AT.map((x, i) => (
              <path
                key={x}
                ref={(el) => {
                  eyeRefs.current[i] = el;
                }}
                d={eyeLine(x, EYE_Y, 1)}
              />
            ))}
            {EYES_AT.map((x, i) => (
              <path
                key={`lid-${x}`}
                ref={(el) => {
                  lidRefs.current[i] = el;
                }}
                d={lidLine(x, EYE_Y)}
                opacity={0}
              />
            ))}
            <path ref={noseRef} d={noseLine(0, 0)} />
            <path ref={mouthRef} d={mouthLine(0)} />
          </g>
        </g>
      </g>
    </svg>
  );
}
