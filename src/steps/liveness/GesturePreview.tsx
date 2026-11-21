'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CUTOUT_ASPECT } from '../../lib/liveness-cutout';
import { TOON_PARTS, TOON_VIEWBOX } from '../../liveness/toon-face';
import { CAMERA_ROOM, TOON_SHADES } from '../../liveness/toon-shades';
import { WindowRing } from './WindowRing';

// ---------------------------------------------------------------------------
// A small picture of the liveness camera, for the screen that comes before
// it: the camera's own window with its line round it, and in it a cartoon
// person doing what the camera may ask for (turn, nod, blink, smile). The line
// is cut into four parts and one fills green with each gesture, as it does in
// the camera. Each gesture ends as it does in the camera, too: the window takes
// a light green cover and a tick pops up at once, then the next one starts.
// When the four have joined, it all starts again.
//
// The person comes in once, from a little way back, a touch too close, and
// settles, as someone finding their distance does. The turn and the nod are
// drawn by sliding the face across the head (the hair less, the hair at the
// back of the head the other way, the outline not at all), which reads as the
// head turning; the blink and the smile are the
// character's own drawings.
//
// It is painted in shades of the workflow's own colour (--primary), skin,
// hair and clothes alike, so it has no skin colour and stands for anyone.
//
// It is a picture: hidden from screen readers (the words beside it say what
// happens next) and still, at rest, for a person who has asked for less
// motion. The character is "Toon Head" by Johan Melin, CC BY 4.0, with short
// hair of our own (liveness/toon-face.ts).
// ---------------------------------------------------------------------------

export type PreviewGesture = 'turn' | 'nod' | 'blink' | 'smile' | 'turnLeft' | 'turnRight' | 'lookUp' | 'lookDown';

/** The head directions set, in the order the picture runs through them. */
export const DIRECTION_GESTURES: readonly PreviewGesture[] = ['turnLeft', 'turnRight', 'lookUp', 'lookDown'];

const ALL_GESTURES: readonly PreviewGesture[] = ['turn', 'nod', 'blink', 'smile'];
/** The room behind the window stands in for the camera. */
const ROOM = CAMERA_ROOM;
const LINE_PARTS = 4;
/** Seconds each gesture takes, rest to rest. */
const LENGTH: Record<PreviewGesture, number> = {
  turn: 2.4,
  nod: 2,
  blink: 1.5,
  smile: 1.9,
  turnLeft: 1.8,
  turnRight: 1.8,
  lookUp: 1.8,
  lookDown: 1.8,
};
/** Coming in: how long, and how much too close it gets on the way. */
const COMING_IN = 1.1;
const OVERSHOOT = 0.06;
/** The tick after each gesture: on screen this long, then the next one. The
 *  camera holds it longer; the picture keeps moving. */
const PASS_HOLD = 0.8;
/** The tick after the last gesture, before it all goes round again. */
const TICK_HOLD = 1.1;
/** The line eases after its progress (WindowRing), by about this much: the
 *  tick waits for the line to be seen to close, and no longer. */
const LINE_CATCH_UP = 0.15;
/** How far the face slides across the head at the end of a turn or a nod, in
 *  the drawing's own units (it is 768 across). */
const TURN_SLIDE = 46;
const NOD_SLIDE = 30;


/** Smooth from 0 to 1 and back to 0 over [0, 1]. */
const swell = (t: number): number => (t <= 0 || t >= 1 ? 0 : (1 - Math.cos(2 * Math.PI * t)) / 2);
const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(Math.PI * t)) / 2);

interface Pose {
  /** Across, -1 (their right, our left) to 1. */
  across: number;
  /** Down, -1 (up) to 1. */
  down: number;
  shut: boolean;
  smile: boolean;
}

const REST: Pose = { across: 0, down: 0, shut: false, smile: false };

function poseAt(gesture: PreviewGesture, at: number): Pose {
  const t = at / LENGTH[gesture];
  switch (gesture) {
    case 'turn':
      // One way, across to the other, and back to the middle.
      return { ...REST, across: -ease(t / 0.3) + 2 * ease((t - 0.35) / 0.3) - ease((t - 0.72) / 0.22) };
    case 'nod':
      return { ...REST, down: swell(t / 0.45) - 0.7 * swell((t - 0.45) / 0.45) };
    // One way, held for a moment, and back. The picture is the camera's own
    // mirrored view, so the person's left is the left of the screen.
    case 'turnLeft':
      return { ...REST, across: -(ease(t / 0.3) - ease((t - 0.68) / 0.26)) };
    case 'turnRight':
      return { ...REST, across: ease(t / 0.3) - ease((t - 0.68) / 0.26) };
    case 'lookUp':
      return { ...REST, down: -(ease(t / 0.3) - ease((t - 0.68) / 0.26)) };
    case 'lookDown':
      return { ...REST, down: ease(t / 0.3) - ease((t - 0.68) / 0.26) };
    case 'blink':
      // Twice, quickly.
      return { ...REST, shut: (t > 0.25 && t < 0.35) || (t > 0.55 && t < 0.65) };
    case 'smile':
      return { ...REST, smile: t > 0.15 && t < 0.85 };
  }
}

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

export function GesturePreview({
  gestures = ALL_GESTURES,
  width = 176,
}: {
  /** The gestures to run through, round and round. None: it comes in and
   *  holds still, as a passive check asks, and the line closes as it does. */
  gestures?: readonly PreviewGesture[];
  /** The width of the window, in CSS pixels. */
  width?: number;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const window_ = useMemo(() => ({ width, height: Math.round(width * CUTOUT_ASPECT) }), [width]);
  const stageRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const hairRef = useRef<SVGGElement>(null);
  const hairBehindRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const openRef = useRef<SVGGElement>(null);
  const shutRef = useRef<SVGGElement>(null);
  const happyRef = useRef<SVGGElement>(null);
  const restMouthRef = useRef<SVGGElement>(null);
  const smileMouthRef = useRef<SVGGElement>(null);
  const tickRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const show = (pose: Pose): void => {
      const x = pose.across * TURN_SLIDE;
      const y = pose.down * NOD_SLIDE;
      faceRef.current?.setAttribute('transform', `translate(${x} ${y})`);
      hairRef.current?.setAttribute('transform', `translate(${x * 0.35} ${y * 0.4})`);
      // The back of the head goes the other way, which is what makes it turn.
      hairBehindRef.current?.setAttribute('transform', `translate(${-x * 0.2} ${y * 0.1})`);
      // The head narrows a touch as it turns away, and drops a little in a nod.
      const narrow = 1 - 0.035 * Math.abs(pose.across);
      headRef.current?.setAttribute('transform', `translate(${384 * (1 - narrow)} ${y * 0.15}) scale(${narrow} 1)`);
      const set = (ref: React.RefObject<SVGGElement | null>, on: boolean) =>
        ref.current?.setAttribute('display', on ? 'inline' : 'none');
      set(openRef, !pose.shut && !pose.smile);
      set(shutRef, pose.shut);
      set(happyRef, pose.smile);
      set(restMouthRef, !pose.smile);
      set(smileMouthRef, pose.smile);
    };
    const tick = (on: boolean): void => {
      const el = tickRef.current;
      if (el) {
        el.style.opacity = on ? '1' : '0';
        el.style.transform = on ? 'scale(1)' : 'scale(0.4)';
      }
      if (coverRef.current) coverRef.current.style.opacity = on ? '1' : '0';
    };
    show(REST);
    tick(false);
    const stage = stageRef.current;
    if (reduceMotion || !stage) return undefined;

    let comingIn = true;
    let showing = 0;
    // A gesture has just been done: the cover and the tick are up.
    let passing = false;
    let began = performance.now();
    let frame = requestAnimationFrame(function step() {
      let at = (performance.now() - began) / 1000;
      if (comingIn) {
        if (at >= COMING_IN) {
          comingIn = false;
          stage.style.opacity = '1';
          stage.style.transform = 'none';
          began = performance.now();
          at = 0;
        } else {
          const t = at / COMING_IN;
          // From a little way back, past where it fits, and back.
          const scale = 0.86 + (0.14 + OVERSHOOT) * ease(t / 0.6) - OVERSHOOT * ease((t - 0.6) / 0.4);
          stage.style.opacity = String(Math.min(1, t / 0.35));
          stage.style.transform = `scale(${scale})`;
        }
      }
      if (!comingIn) {
        const last = gestures.length === 0 || showing === gestures.length;
        if (passing) {
          // The tick pops up as its part of the line is seen to close, stays
          // a moment, and the next gesture starts; after the last, it all
          // goes round again.
          if (at >= LINE_CATCH_UP) tick(true);
          if (at >= LINE_CATCH_UP + (last ? TICK_HOLD : PASS_HOLD)) {
            passing = false;
            tick(false);
            if (last) {
              showing = 0;
              progressRef.current = 0;
              setRound((count) => count + 1);
            }
            began = performance.now();
          }
        } else if (gestures.length === 0) {
          progressRef.current = Math.min(1, at / 2.4);
          show(REST);
          if (at >= 2.4) {
            passing = true;
            began = performance.now();
          }
        } else if (at >= LENGTH[gestures[showing]]) {
          showing += 1;
          progressRef.current = showing / gestures.length;
          show(REST);
          passing = true;
          began = performance.now();
        } else {
          progressRef.current = (showing + at / LENGTH[gestures[showing]]) / gestures.length;
          show(poseAt(gestures[showing], at));
        }
      }
      frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
      progressRef.current = 0;
      stage.style.opacity = '1';
      stage.style.transform = 'none';
    };
  }, [gestures, reduceMotion]);

  // Wider than the window and dropped a little, so the face fills it and the
  // shoulders run off its bottom edge, as in the camera.
  const drawing = Math.round(width * 1.36);
  return (
    <div aria-hidden className="relative" style={{ width: window_.width, height: window_.height }}>
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: width / 2, background: ROOM }}>
        <div ref={stageRef} className="absolute inset-0" style={{ opacity: reduceMotion ? 1 : 0 }}>
          <svg
            viewBox={TOON_VIEWBOX}
            width={drawing}
            height={drawing}
            className="absolute max-w-none"
            style={{ ...TOON_SHADES, left: (window_.width - drawing) / 2, top: (window_.height - drawing) / 2 + drawing * 0.1 }}
          >
            <g dangerouslySetInnerHTML={{ __html: TOON_PARTS.back }} />
            <g ref={hairBehindRef} dangerouslySetInnerHTML={{ __html: TOON_PARTS.hairBehind }} />
            <g ref={headRef} dangerouslySetInnerHTML={{ __html: TOON_PARTS.head }} />
            <g ref={faceRef}>
              <g ref={restMouthRef} dangerouslySetInnerHTML={{ __html: TOON_PARTS.mouthRest }} />
              <g ref={smileMouthRef} display="none" dangerouslySetInnerHTML={{ __html: TOON_PARTS.mouthSmile }} />
              <g ref={openRef} dangerouslySetInnerHTML={{ __html: TOON_PARTS.eyesOpen }} />
              <g ref={shutRef} display="none" dangerouslySetInnerHTML={{ __html: TOON_PARTS.eyesShut }} />
              <g ref={happyRef} display="none" dangerouslySetInnerHTML={{ __html: TOON_PARTS.eyesHappy }} />
              <g dangerouslySetInnerHTML={{ __html: TOON_PARTS.brows }} />
            </g>
            <g ref={hairRef} dangerouslySetInnerHTML={{ __html: TOON_PARTS.hair }} />
          </svg>
        </div>
        {/* After each gesture, as in the camera: a light green cover over the
            window, and the tick, up at once. */}
        <div
          ref={coverRef}
          className="pointer-events-none absolute inset-0 bg-[var(--verification-success)]/20"
          style={{ opacity: 0, transition: 'opacity 140ms ease-out' }}
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
      <WindowRing
        key={round}
        window={window_}
        progressRef={progressRef}
        track="color-mix(in srgb, var(--primary) 55%, transparent)"
        segments={LINE_PARTS}
      />
    </div>
  );
}
