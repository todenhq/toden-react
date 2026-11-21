// ---------------------------------------------------------------------------
// The face window of the full-screen liveness camera.
//
// The camera owns the surface (a phone's screen, or the whole modal on a
// desktop): the feed runs edge to edge and
// everything but a tall, round-ended window for the face is blurred behind a
// tint of the flow's own background colour. The window is at the exact centre
// of the frame because that is the centre of the camera picture, and "centre
// your face" is judged against the picture.
//
// Its size is worked out from the box the camera is ACTUALLY drawn in, never
// the viewport: the two disagree whenever the SDK does not have the whole
// display.
//
// Mirrors the React Native SDK's lib/livenessCutout.ts + lib/faceWindow.ts and
// the Flutter SDK's screens/liveness_cutout.dart + liveness/face_window.dart.
// One rule in three languages: change a number in one and change all three.
// ---------------------------------------------------------------------------

export const CUTOUT_MAX_WIDTH = 280;
export const CUTOUT_MIN_WIDTH = 200;

/** A face is taller than it is wide. */
export const CUTOUT_ASPECT = 1.32;

/** The room above the window at which the long lighting note fits over the
 *  instruction: the note and its gap (78) and the instruction's pill (50). */
export const ROOM_FOR_LIGHTING_NOTE = 128;

/** What the instruction's pill needs of the room, on two lines. */
export const INSTRUCTION_ROOM = 66;

/**
 * The height of the block above the window. On a phone too short for the
 * instruction, the block keeps that height and runs over the window's top
 * edge (the hair, not the face) instead of cutting the words off.
 *
 * Nothing but the instruction stands here: a gesture is asked for in words and
 * no picture demonstrates it.
 */
export function aboveHeight(room: number): number {
  return Math.max(room, INSTRUCTION_ROOM);
}

/** How much of the background colour covers the blurred feed in a lit room. */
export const LIVENESS_TINT = 0.08;
/** In a dark room: the step is lit so the SCREEN lights the face, and a thin
 *  tint over a dark room is a dark screen. */
export const LIVENESS_DIM_ROOM_TINT = 0.66;
/** With no blur under it (a slow phone, more contrast asked for): it then has
 *  to do the blur's job of quietening the room. */
export const LIVENESS_FLAT_TINT = 0.74;

export interface Size {
  width: number;
  height: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/**
 * A frame this wide is a desktop, not a phone. WEB ONLY: the native SDKs have
 * no desktop, so the desktop rule below is the one rule here with no mirror.
 */
export const DESKTOP_FRAME_WIDTH = 600;
const PHONE_HEIGHT_SHARE = 0.46;

// The desktop window grows with the screen (user, 2026-11-17). It used to stop
// at 330 wide, which suits the modal; on a full-screen camera the picture is
// drawn several times larger while the window stayed the same, so a person at
// a laptop had to move far back to get their face into it.
//
// A webcam's picture is drawn cover-fit, so how large a face looks follows the
// width the picture is drawn at. The window is a set share of that width: the
// share the modal already had, at which a person sitting at their screen fits.
// The screen's height is the limit, since the instruction stands over the
// window and the retry panel under it.
/** In the modal: the window's share of the frame's height. */
const DESKTOP_HEIGHT_SHARE = 0.56;
/** On a taller frame the window may take all the height but this much above and
 *  below it: the instruction over it, the retry panel under it. */
export const DESKTOP_WINDOW_MARGIN = 150;
/** The window's width as a share of the width the camera picture is drawn at. */
export const DESKTOP_PICTURE_SHARE = 0.32;
/** A webcam's picture, width over height. Assumed, so the window can be sized
 *  before the camera has started and does not jump when it does. */
const WEBCAM_ASPECT = 4 / 3;

function desktopCutoutWidth(frame: Size): number {
  const height = Math.max(frame.height * DESKTOP_HEIGHT_SHARE, frame.height - 2 * DESKTOP_WINDOW_MARGIN);
  const pictureWidth = Math.max(frame.width, frame.height * WEBCAM_ASPECT);
  return Math.max(CUTOUT_MIN_WIDTH, Math.min(frame.width - 96, height / CUTOUT_ASPECT, pictureWidth * DESKTOP_PICTURE_SHARE));
}

export function livenessCutout(frame: Size): Size {
  const width =
    frame.width >= DESKTOP_FRAME_WIDTH
      ? desktopCutoutWidth(frame)
      : clamp(
          Math.min(frame.width - 96, (frame.height * PHONE_HEIGHT_SHARE) / CUTOUT_ASPECT, CUTOUT_MAX_WIDTH),
          CUTOUT_MIN_WIDTH,
          CUTOUT_MAX_WIDTH,
        );
  return { width, height: width * CUTOUT_ASPECT };
}

/** How much of the background covers the feed, given the room and the blur. */
export function livenessTint(input: { dimRoom: boolean; blurs: boolean }): number {
  const tint = input.dimRoom ? LIVENESS_DIM_ROOM_TINT : LIVENESS_TINT;
  return input.blurs ? tint : Math.max(tint, LIVENESS_FLAT_TINT);
}

/** A tall window with fully round ends, as one closed subpath. */
function windowPath(left: number, top: number, window: Size): string {
  const r = window.width / 2;
  const right = left + window.width;
  const bottom = top + window.height;
  return (
    `M${left} ${top + r} A${r} ${r} 0 0 1 ${right} ${top + r} ` +
    `V${bottom - r} A${r} ${r} 0 0 1 ${left} ${bottom - r} Z`
  );
}

/** [outer] with a window subtracted at (left, top): for an even-odd clip. */
export function surroundPath(outer: Size, left: number, top: number, window: Size): string {
  return `M0 0 H${outer.width} V${outer.height} H0 Z ${windowPath(left, top, window)}`;
}

// The window sits a little BELOW the centre on a short screen, and only by
// what the block above it is short of. The face is judged against the window
// wherever it sits (faceWindowFor takes the drop).
//
// The room was sized when a gesture picture stood over the instruction: a gap
// (8), the picture on its plate (108), a gap (8), the instruction (46) and the
// gap over the window (20). The web no longer has the picture; the mobile SDKs
// still do. The number is kept so the window is in the same place in all
// three, and it changes in all three together.
/** The room wanted above the window, from the top inset down. */
export const WINDOW_TOP_ROOM = 190;
/** What must stay below the window: the gap under it, the retry panel a failed
 *  check shows there (its words and its button), and the gap to the edge. It
 *  was sized for the step count alone, and the panel was cut off. */
export const WINDOW_BELOW_KEEP = 136;
/** The furthest the window drops. More reads as off-centre. */
export const WINDOW_MAX_DROP = 48;

/**
 * How far below the centre the window sits, for a frame and its window.
 * [topInset] is what the frame must keep clear of at its top (a status bar,
 * on the mobile SDKs; a browser's frame starts under it).
 */
export function windowDrop(frame: Size, window: Size, topInset = 0): number {
  const margin = (frame.height - window.height) / 2;
  const wanted = WINDOW_TOP_ROOM + topInset - margin;
  const spare = margin - WINDOW_BELOW_KEEP;
  return Math.round(Math.max(0, Math.min(wanted, spare, WINDOW_MAX_DROP)));
}

/** The top of the window in its frame: the centre, plus the drop. */
export function windowTop(frame: Size, window: Size): number {
  return (frame.height - window.height) / 2 + windowDrop(frame, window);
}

/** The frame with the window taken out of it. */
export function tintPath(frame: Size, window: Size): string {
  return surroundPath(frame, (frame.width - window.width) / 2, windowTop(frame, window), window);
}

/**
 * The window's own outline, starting at twelve o'clock and running clockwise,
 * with its length: what the progress line is drawn along. `inset` pulls the
 * line in by half its stroke so it sits on the edge rather than across it.
 */
export function windowOutline(window: Size, inset: number): { d: string; length: number } {
  const w = window.width - inset * 2;
  const h = window.height - inset * 2;
  const r = w / 2;
  const x0 = inset;
  const y0 = inset;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const cx = x0 + r;
  const d =
    `M${cx} ${y0} A${r} ${r} 0 0 1 ${x1} ${y0 + r} V${y1 - r} ` +
    `A${r} ${r} 0 0 1 ${x0} ${y1 - r} V${y0 + r} A${r} ${r} 0 0 1 ${cx} ${y0}`;
  return { d, length: 2 * Math.PI * r + 2 * (h - w) };
}

// ── Is the face inside the window? ──────────────────────────────────────────
//
// In the modal the camera circle shows the whole frame, so "a sensible size in
// the frame" is the same statement as "sits in the circle". Full screen the
// frame fills the surface and the window shows only its middle, so the face is
// judged against the WINDOW. Everything is in shares of the camera frame.

/** The window, as shares of the camera frame's width and height. Centred
 *  across; `centreY` is where its middle sits down the frame (0.5 when absent). */
export interface FaceWindow {
  width: number;
  height: number;
  centreY?: number;
}

/** A face wider than this share of the window is spilling over its edges. */
export const FACE_WINDOW_MAX_FILL = 0.84;
/** A face narrower than this share of the window is too far to judge. */
export const FACE_WINDOW_MIN_FILL = 0.46;
/** How far the face's centre may sit from the window's, as a share of the
 *  window's own width and height. */
export const FACE_WINDOW_MAX_DRIFT = 0.2;

/**
 * How much of the frame the window covers, and where its middle sits, for a
 * frame of `frameAspect` (width over height) drawn cover-fit in `frame` with
 * `window` centred across and `drop` pixels below the centre.
 */
export function faceWindowFor(input: { frame: Size; window: Size; frameAspect: number; drop?: number }): FaceWindow {
  const shownWidth = Math.max(input.frame.width, input.frame.height * input.frameAspect);
  const shownHeight = shownWidth / input.frameAspect;
  return {
    width: input.window.width / shownWidth,
    height: input.window.height / shownHeight,
    centreY: 0.5 + (input.drop ?? 0) / shownHeight,
  };
}
