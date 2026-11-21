// Which capture of each document side is current, so a side's recording is
// always the recording of the photo submitted for that side.
//
// The server compares each still with the recording of the same side to catch
// an injected capture, so a recording from another capture is a wrong answer,
// not untidy evidence. A recording is uploaded the moment it stops, and the
// upload can land after the side was taken again. Every new capture of a side
// (a recording starting, a photo picked from the device, a retake) renews its
// number, and an upload is stored only while the number it started with is
// still current. The step also clears the side's earlier recording when a new
// capture begins (CLEAR_DOCUMENT_VIDEO), which is what drops a recording
// restored with a resumed session once that side is captured again.

export type RecordingSide = 'front' | 'back';

export type RecordingCaptures = Record<RecordingSide, number>;

export function emptyRecordingCaptures(): RecordingCaptures {
  return { front: 0, back: 0 };
}

/** A new capture of [side] begins. Returns its number. */
export function renewCapture(captures: RecordingCaptures, side: RecordingSide): number {
  captures[side] += 1;
  return captures[side];
}

/** Whether [capture] is still [side]'s current capture. */
export function isCurrentCapture(captures: RecordingCaptures, side: RecordingSide, capture: number): boolean {
  return captures[side] === capture;
}

// How long a side's recording must be, and which side is being recorded.
//
// The server reads the recording twice a second and needs three readings to
// compare the photo with it; a shorter recording is "not checked", which lets
// an injected back through unexamined. A back whose recording began only when
// the back's turn came was photographed about a second later, the card already
// steady in the frame, and 4 of 11 two-sided captures were not checked on the
// back (measured 2026-11-21). So the back's recording starts with the
// turn-over, and no photo is taken of either side until its recording has run
// this long.

/** The least a side's recording runs before its photo is taken. */
export const MIN_RECORDED_MS = 2200;

/** How much longer the recording must run before the photo: 0 once long enough, or when nothing is recording. */
export function recordingShortBy(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  return Math.max(0, Math.ceil(MIN_RECORDED_MS - (now - startedAt)));
}

/**
 * The side being recorded. A side being scanned records itself; the turn-over
 * records the back it leads to, so the back's recording already holds the card
 * turning when its photo is taken. Nothing is recorded anywhere else.
 */
export function recordingSideOf(input: { cameraActive: boolean; phase: string; turningOver: boolean }): RecordingSide | null {
  if (input.cameraActive) return input.phase === 'back' ? 'back' : 'front';
  return input.turningOver ? 'back' : null;
}
