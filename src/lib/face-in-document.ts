// ─── A face is not a document ───────────────────────────────────────────────
//
// On a laptop the document camera is the webcam, which is also looking at the
// person. The edge detector looks for any steady rectangle with four clear
// sides, and a face against a window frame, a curtain edge and the shoulders
// makes one: the step then took a photo of the person's face as their ID.
//
// So while the camera faces the person, the face model the liveness step uses
// watches the frame, and a "document" whose box is mostly a face is refused.
// A real document's printed portrait is small next to the card (about a
// quarter to a third of its width), so a genuine ID held up does not trip it.

/** A box normalised to the video frame (0..1 on both axes, unmirrored). */
export interface NormalBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A face this wide, as a share of the document box's width, is the subject, not a printed portrait. */
export const FACE_FILLS_DOCUMENT_WIDTH = 0.45;

/** A face reading older than this no longer describes the frame. */
export const FACE_READING_MAX_AGE_MS = 1000;

/** The bounding box of a face's landmarks, or null when there are none. */
export function faceBoxFromLandmarks(points: ReadonlyArray<{ x: number; y: number }> | null): NormalBox | null {
  if (!points || points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * True when the face sits inside the document box and fills enough of it to be
 * the thing photographed. Measured along the document's length: its width, or
 * its height when the box is `upright` (a long document turned on a tall
 * screen, lib/document-turn.ts), so a turned frame is judged the same way.
 * Normalised boxes do not show which side is longer, so the caller says.
 */
export function faceFillsDocument(face: NormalBox | null, doc: NormalBox, upright = false): boolean {
  if (!face || doc.width <= 0 || doc.height <= 0) return false;
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  const inside = cx >= doc.x && cx <= doc.x + doc.width && cy >= doc.y && cy <= doc.y + doc.height;
  const faceLength = upright ? face.height : face.width;
  const docLength = upright ? doc.height : doc.width;
  return inside && faceLength >= docLength * FACE_FILLS_DOCUMENT_WIDTH;
}

/** The latest face reading, kept by useFaceWatch. */
export interface FaceReading {
  box: NormalBox | null;
  at: number;
}

/** The face to judge against, or null when there is none or the reading is stale. */
export function currentFace(reading: FaceReading | null, now: number): NormalBox | null {
  if (!reading || now - reading.at > FACE_READING_MAX_AGE_MS) return null;
  return reading.box;
}

/** Pixel bounds as a box normalised to the frame. */
export function normalBox(
  b: { x: number; y: number; width: number; height: number },
  frame: { width: number; height: number },
): NormalBox {
  return { x: b.x / frame.width, y: b.y / frame.height, width: b.width / frame.width, height: b.height / frame.height };
}

/** True when the latest face reading says the box found in this frame is a face, not a document. */
export function faceBlocksDocument(
  reading: FaceReading | null | undefined,
  bounds: { x: number; y: number; width: number; height: number },
  frame: { width: number; height: number },
  now: number,
): boolean {
  // In pixels, unlike the normalised box: a box taller than wide is upright.
  const upright = bounds.height > bounds.width;
  return faceFillsDocument(currentFace(reading ?? null, now), normalBox(bounds, frame), upright);
}
