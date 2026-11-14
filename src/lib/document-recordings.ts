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
