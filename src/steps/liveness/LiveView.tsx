'use client';

import React from 'react';
import { Loader2 } from '../../components/icons';
import { Button } from '../../components/ui/button';
import { ROOM_FOR_LIGHTING_NOTE, type Size } from '../../lib/liveness-cutout';
import type { NarratorGesture } from '../../liveness/narrator-pose';
import type { DirectionChallenge } from '../../liveness/types';
import { AttemptsLeftNotice } from './AttemptsLeftNotice';
import { GestureNarrator } from './GestureNarrator';
import { ImmersiveFrame } from './ImmersiveFrame';
import { InstructionPill, type InstructionTone } from './InstructionPill';
import { SideRing } from './SideRing';
import { Panel, Reassurance, StepCount } from './surfaces';
import { RING_TRACK, WindowRing } from './WindowRing';

// ---------------------------------------------------------------------------
// The live liveness camera, full screen (the whole modal on a desktop): the
// feed edge to edge, a
// clear window for the face, the instruction above it and the step count
// below.
//
// A gesture is asked for in words, and (unless the workflow turns it off) a
// face icon pops up in the window, acts it out once and goes
// (GestureNarrator). A head direction also lights its side of the line round
// the window, which turns green when it is done (SideRing). The words stand ABOVE the window: eyes that go up to read
// stay near the lens, at the top of the phone, while eyes that drop to the
// bottom of the screen tip the head down, which is the wrong pose for the
// photo and for a nod being judged.
// ---------------------------------------------------------------------------

export interface LiveViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Measured for the flash, which paints everywhere but the window. */
  windowRef: React.RefObject<HTMLDivElement | null>;
  progressRef: { current: number };
  phase: string;
  loading: boolean;
  text: string;
  tone: InstructionTone;
  warning: boolean;
  /** The gesture the narrator acts out, or null for none. */
  gesture: NarratorGesture | null;
  /** When the person last did anything with their face, on the performance
   *  clock: the narrator comes back only once they have gone quiet. */
  respondedAtRef: { current: number };
  /** Counts wrong-way head turns: the narrator shows the way again on each. */
  wrongWayCount?: number;
  /**
   * Set when the test is head directions: the line round the window is then
   * four sides (SideRing). `asked` is the direction asked for now, whose side
   * lights up, and `done` those the person has done, whose sides are green.
   */
  sides?: {
    asked: DirectionChallenge | null;
    done: readonly DirectionChallenge[];
    /** The directions this run asks for. */
    directions?: readonly DirectionChallenge[];
  } | null;
  /** The long lighting note, when the room is too dark or too bright. */
  lightingNote: string | null;
  step: number;
  total: number;
  /**
   * Why the check stopped, with its retry, or null while it is running. `note`
   * is the attempts left when the workflow limits them
   * (lib/liveness-attempts.ts), shown as a small warning under the message.
   */
  failure: { message: string; note?: string | null; retryLabel: string; onRetry: () => void } | null;
  dimRoom: boolean;
  blurs: boolean;
  onBack: () => void;
  onSize: (size: Size) => void;
}

export function LiveView(p: LiveViewProps) {
  const settlingIn = p.loading || p.phase === 'loading' || p.phase === 'positioning';
  const showsCount = !p.failure && p.total > 1 && (p.phase === 'challenge' || p.phase === 'challenge_passed');
  const ringOn = !p.loading && p.phase !== 'loading' && p.phase !== 'failed';
  const track = p.loading
    ? 'var(--border)'
    : p.warning || p.phase === 'failed'
      ? 'var(--destructive)'
      : RING_TRACK;

  return (
    <ImmersiveFrame
      onBack={p.onBack}
      onSize={p.onSize}
      dimRoom={p.dimRoom}
      blurs={p.blurs}
      preview={
        <video
          ref={p.videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover transform-[scaleX(-1)]"
        />
      }
      cutout={(window) => (
        <div
          ref={p.windowRef}
          className="relative h-full w-full"
          style={{
            borderRadius: window.width / 2,
            // Outside the window only: a shadow that fell inside would dim the face.
            boxShadow: '0 0 22px rgba(0,0,0,0.32)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: window.width / 2 }}>
            <GestureNarrator
              gesture={p.failure ? null : p.gesture}
              respondedAtRef={p.respondedAtRef}
              showAgain={p.wrongWayCount}
              windowWidth={window.width}
            />
            {(p.loading || p.phase === 'loading') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-16 w-16 rounded-full border-2 border-primary/40 animate-pulse-ring" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </div>
              </div>
            )}
            {/* After every gesture, head directions included: the side turning
                green is not enough by itself to say "done" (user, 2026-11-17). */}
            {p.phase === 'challenge_passed' && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--verification-success)]/20 animate-fade-in">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--verification-success)] animate-checkmark-pop">
                  <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 13l4 4L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 0 }} className="animate-checkmark" />
                  </svg>
                </div>
              </div>
            )}
            {/* The shutter, then one pass of light down the window. */}
            {p.phase === 'complete' && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-white animate-capture-flash" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-1.5 -translate-y-1/2 bg-[var(--verification-success)] opacity-0 shadow-[0_0_12px_2px_var(--verification-success)] animate-liveness-scan"
                />
              </>
            )}
          </div>
          {/* Head directions: one part of the line per side. Otherwise one
              part per stage: positioning, each step, the capture. */}
          {ringOn && p.sides && (
            <SideRing
              window={window}
              asked={p.phase === 'challenge' ? p.sides.asked : null}
              done={p.sides.done}
              directions={p.sides.directions}
              track={track}
            />
          )}
          {ringOn && !p.sides && (
            <WindowRing window={window} progressRef={p.progressRef} track={track} segments={p.total + 2} />
          )}
        </div>
      )}
      above={(room) => {
        if (p.failure) return null;
        // The long lighting note is wide, so it only shows when it fits under
        // the back and close buttons with the instruction.
        const showsLighting = !!p.lightingNote && room >= ROOM_FOR_LIGHTING_NOTE;
        return (
          <div className="flex flex-col items-center gap-2">
            {showsLighting && (
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 animate-lighting-in">
                {p.lightingNote}
              </div>
            )}
            <InstructionPill text={p.text} tone={p.tone} />
          </div>
        );
      }}
      below={!p.failure && showsCount ? <StepCount step={p.step} total={p.total} visuallyHidden={!!p.sides} /> : undefined}
      // A failed check rests its panel on the bottom edge at its full height.
      // Squeezed into the strip under the window it was cut off on a short
      // screen; the window has nothing left to show, so the panel may cover its
      // lower edge.
      footer={
        p.failure ? (
          // Its own surface: red text straight on the camera would be lost.
          <Panel className="w-full space-y-2 p-3">
            <div className="space-y-2 text-center text-sm" role="alert">
              <p className="font-medium text-destructive">{p.failure.message}</p>
              {p.failure.note && <AttemptsLeftNotice text={p.failure.note} />}
            </div>
            <Button className="h-11 w-full" onClick={p.failure.onRetry}>
              {p.failure.retryLabel}
            </Button>
          </Panel>
        ) : (
          <Reassurance visible={settlingIn} />
        )
      }
    />
  );
}
