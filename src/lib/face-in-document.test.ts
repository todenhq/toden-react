import { describe, expect, it } from 'vitest';
import { currentFace, faceBlocksDocument, faceBoxFromLandmarks, faceFillsDocument } from './face-in-document';

const doc = { x: 0.2, y: 0.2, width: 0.6, height: 0.38 };

describe('faceFillsDocument', () => {
  it('refuses a box that is mostly a face (the webcam photo that was taken as an ID)', () => {
    expect(faceFillsDocument({ x: 0.3, y: 0.15, width: 0.36, height: 0.5 }, doc)).toBe(true);
  });

  it('accepts an ID whose printed portrait is small next to the card', () => {
    // A card's portrait is about a quarter to a third of its width.
    expect(faceFillsDocument({ x: 0.25, y: 0.3, width: 0.16, height: 0.2 }, doc)).toBe(false);
  });

  it('ignores a face beside the document, the person holding it up', () => {
    expect(faceFillsDocument({ x: 0.82, y: 0.1, width: 0.3, height: 0.4 }, { x: 0.05, y: 0.4, width: 0.6, height: 0.38 })).toBe(false);
  });

  it('decides nothing without a face', () => {
    expect(faceFillsDocument(null, doc)).toBe(false);
  });

  it('measures an upright document along its length, its height', () => {
    // A NIN slip turned upright on a tall screen (lib/document-turn.ts).
    const slip = { x: 0.3, y: 0.15, width: 0.4, height: 0.7 };
    expect(faceFillsDocument({ x: 0.32, y: 0.3, width: 0.36, height: 0.4 }, slip, true)).toBe(true);
    expect(faceFillsDocument({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, slip, true)).toBe(false);
  });
});

describe('faceBlocksDocument', () => {
  const reading = (box: { x: number; y: number; width: number; height: number }) => ({ box, at: 1000 });

  it('reads a box taller than wide in pixels as upright', () => {
    const frame = { width: 1080, height: 1920 };
    const slip = { x: 324, y: 288, width: 432, height: 1344 };
    // Wide enough across the slip, but short along it: a portrait on the slip.
    expect(faceBlocksDocument(reading({ x: 0.32, y: 0.4, width: 0.36, height: 0.2 }), slip, frame, 1000)).toBe(false);
    expect(faceBlocksDocument(reading({ x: 0.32, y: 0.3, width: 0.36, height: 0.4 }), slip, frame, 1000)).toBe(true);
  });

  it('keeps judging a landscape card by its width on a wide webcam frame', () => {
    // Normalised, this card is taller than wide; in pixels it is landscape.
    const frame = { width: 1920, height: 1080 };
    const card = { x: 480, y: 240, width: 960, height: 605 };
    expect(faceBlocksDocument(reading({ x: 0.33, y: 0.3, width: 0.25, height: 0.2 }), card, frame, 1000)).toBe(true);
  });
});

describe('face readings', () => {
  it('boxes the landmarks, and has none to box when there are none', () => {
    expect(faceBoxFromLandmarks([{ x: 0.2, y: 0.3 }, { x: 0.5, y: 0.7 }])).toEqual({ x: 0.2, y: 0.3, width: 0.3, height: 0.39999999999999997 });
    expect(faceBoxFromLandmarks(null)).toBeNull();
    expect(faceBoxFromLandmarks([])).toBeNull();
  });

  it('stops trusting a reading after a second', () => {
    const reading = { box: doc, at: 1000 };
    expect(currentFace(reading, 1500)).toBe(doc);
    expect(currentFace(reading, 2500)).toBeNull();
  });

  it('judges pixel bounds against the frame', () => {
    const face = { box: { x: 0.3, y: 0.15, width: 0.36, height: 0.5 }, at: 0 };
    expect(faceBlocksDocument(face, { x: 256, y: 144, width: 768, height: 274 }, { width: 1280, height: 720 }, 10)).toBe(true);
    expect(faceBlocksDocument(undefined, { x: 256, y: 144, width: 768, height: 274 }, { width: 1280, height: 720 }, 10)).toBe(false);
  });
});
