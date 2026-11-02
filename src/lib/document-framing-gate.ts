// ─── Auto-capture framing gate ──────────────────────────────────────────────
//
// A port of the Flutter SDK's services/document_framing_gate.dart. Decides when
// a detected shape is (a) actually the expected ID document and (b) framed well
// enough to shoot. Pure logic, no camera or React dependency, so the thresholds
// are unit-tested rather than tuned by trial on a device.
//
// Four conditions, each earning its place:
//   • SHAPE — the detected aspect must match the expected document. The edge
//     detector will happily segment a book, a receipt or a laptop.
//   • SIZE — big enough that the crop keeps the detail OCR and MRZ need, but
//     NOT so big that it's overflowing the frame.
//   • MARGIN — every edge clear of the frame border, so all four corners are in
//     shot. A document cropped flush to a corner loses characters.
//   • STABILITY — held steady for a dwell, so the shot isn't taken mid-move.


/**
 * What to actually tell the user. The gate rejects for several distinct
 * reasons, and collapsing them into one "align your ID" message leaves people
 * stuck: the commonest failure is holding the document TOO CLOSE, where the
 * instinct is to move nearer still.
 */
export type DocumentHint =
  | 'searching'
  | 'moreLight'
  | 'wrongDocument'
  | 'moveCloser'
  | 'moveBack'
  | 'centre'
  | 'showMrz'
  | 'holdStill'
  | 'captured'
  // The corner gate (document-corners.ts): nothing found, a corner off the
  // edge, or no room past a corner. See document-hints.ts.
  | 'placeDocument'
  | 'fitCorners'
  | 'spaceAround'
  // The box found is the person's face, not a document (lib/face-in-document.ts).
  | 'faceNotDocument';

export type DocumentFraming =
  /** Nothing document-shaped in the frame. */
  | 'none'
  /** Something detected, but not the right shape for this document. */
  | 'wrongShape'
  /** Right shape, but too small / too large / too close to an edge. */
  | 'adjust'
  /** Well framed, waiting out the stability dwell. */
  | 'holding'
  /** Well framed and stable — take the photo. */
  | 'ready';

export interface DocumentGuidance {
  framing: DocumentFraming;
  hint: DocumentHint;
}

/** One detection, normalised against the frame it came from. */
export interface DocumentBox {
  /** width / height. */
  aspectRatio: number;
  /** Share of the frame's area the document covers, 0..1. */
  area: number;
  /** Smallest gap between any document edge and the frame edge, 0..1. */
  edgeMargin: number;
  /** Distance of the document's centre from the frame's, 0..1. */
  offCentre: number;
  /** Detector confidence, 0..1. */
  confidence: number;
}

export interface FramingGateOptions {
  /** 1.586 for ID cards, 1.42 for a passport page. */
  expectedAspect: number;
  /** How far the detected aspect may stray, as a fraction of expectedAspect. */
  aspectTolerance?: number;
  minArea?: number;
  maxArea?: number;
  minEdgeMargin?: number;
  maxOffCentre?: number;
  minConfidence?: number;
  /** How long the framing must hold before firing, ms. */
  dwellMs?: number;
  /** Mean frame luma below which we ask for more light. */
  minBrightness?: number;
}

/**
 * Derives the normalised box the gate consumes from a detector's pixel bounds.
 * Kept here so the geometry lives beside the thresholds that judge it.
 */
export function documentBoxFrom(
  bounds: { x: number; y: number; width: number; height: number },
  frame: { width: number; height: number },
  confidence = 1,
): DocumentBox | null {
  if (frame.width <= 0 || frame.height <= 0) return null;
  if (bounds.width <= 0 || bounds.height <= 0) return null;

  const area = (bounds.width * bounds.height) / (frame.width * frame.height);
  const margins = [
    bounds.x / frame.width,
    bounds.y / frame.height,
    (frame.width - (bounds.x + bounds.width)) / frame.width,
    (frame.height - (bounds.y + bounds.height)) / frame.height,
  ];
  const cx = (bounds.x + bounds.width / 2) / frame.width;
  const cy = (bounds.y + bounds.height / 2) / frame.height;

  return {
    aspectRatio: bounds.width / bounds.height,
    area,
    edgeMargin: Math.min(...margins),
    offCentre: Math.hypot(cx - 0.5, cy - 0.5),
    confidence,
  };
}

export class DocumentFramingGate {
  private readonly o: Required<FramingGateOptions>;
  private heldSince: number | null = null;
  private fired = false;

  constructor(options: FramingGateOptions) {
    this.o = {
      aspectTolerance: 0.28,
      minArea: 0.22,
      maxArea: 0.88,
      minEdgeMargin: 0.02,
      maxOffCentre: 0.14,
      minConfidence: 0.5,
      dwellMs: 900,
      minBrightness: 0.22,
      ...options,
    };
  }

  /** True once `ready` has been reported, so the caller can't double-fire. */
  get hasFired(): boolean {
    return this.fired;
  }

  /** Progress through the stability dwell, 0..1 — drives the scan ring. */
  progress(now: number): number {
    if (this.heldSince === null) return 0;
    if (this.o.dwellMs <= 0) return 1;
    return Math.min(1, Math.max(0, (now - this.heldSince) / this.o.dwellMs));
  }

  /**
   * True when the detected shape is plausibly this document type. An upright
   * guide (a long document turned on a tall screen, lib/document-turn.ts) is
   * judged turned back, so its tolerance accepts exactly the shapes the
   * landscape guide would.
   */
  matchesShape(box: DocumentBox): boolean {
    const upright = this.o.expectedAspect < 1;
    const expected = upright ? 1 / this.o.expectedAspect : this.o.expectedAspect;
    const actual = upright ? 1 / box.aspectRatio : box.aspectRatio;
    return Math.abs(actual - expected) <= expected * this.o.aspectTolerance;
  }

  /** Feeds one frame. `brightness` is the frame's mean luma (0..1). */
  update(
    box: DocumentBox | null,
    { at = Date.now(), brightness = 0.5 }: { at?: number; brightness?: number } = {},
  ): DocumentGuidance {
    if (this.fired) return { framing: 'ready', hint: 'captured' };

    if (!box || box.confidence < this.o.minConfidence) {
      this.heldSince = null;
      // Nothing found AND the frame is dark: light is the likely cause, and it
      // is actionable, so say that instead of a neutral "looking…".
      return {
        framing: 'none',
        hint: brightness < this.o.minBrightness ? 'moreLight' : 'searching',
      };
    }

    // Shape first: a wrong-shaped object is not "adjust your framing", it is
    // the wrong object, and the UI should say so rather than inviting the user
    // to move a book around.
    if (!this.matchesShape(box)) {
      this.heldSince = null;
      return { framing: 'wrongShape', hint: 'wrongDocument' };
    }

    // Order matters: report the reason the user must act on FIRST. Too-close is
    // checked before centring because an overflowing document is usually also
    // off-centre, and "move back" is the instruction that actually helps.
    let problem: DocumentHint | null = null;
    if (box.area > this.o.maxArea || box.edgeMargin < this.o.minEdgeMargin) {
      problem = 'moveBack';
    } else if (box.area < this.o.minArea) {
      problem = 'moveCloser';
    } else if (box.offCentre > this.o.maxOffCentre) {
      problem = 'centre';
    }

    if (problem) {
      // Reset the dwell: a document that drifts out and back has not been held
      // steady, and shooting on re-entry is exactly when a blurry frame slips
      // through.
      this.heldSince = null;
      return { framing: 'adjust', hint: problem };
    }

    // Well framed but dim — the shot would be readable-ish, but OCR does much
    // better with light, so ask before firing rather than after failing.
    if (brightness < this.o.minBrightness) {
      this.heldSince = null;
      return { framing: 'adjust', hint: 'moreLight' };
    }

    if (this.heldSince === null) this.heldSince = at;
    if (at - this.heldSince >= this.o.dwellMs) {
      this.fired = true;
      return { framing: 'ready', hint: 'captured' };
    }
    return { framing: 'holding', hint: 'holdStill' };
  }

  /** Clears the dwell and the fired latch — for the next side or a retake. */
  reset(): void {
    this.heldSince = null;
    this.fired = false;
  }
}

// The hint wording lives in document-hints.ts, beside the corner gate's.
export { documentHintText } from './document-hints';
