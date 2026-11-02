// ─── Document capture methods ─────────────────────────────────────────────────
//
// A workflow chooses how the applicant supplies a photo of each document side:
// scanned live with the camera (`allowDocumentScan`), picked from the device
// (`allowDocumentUpload`), or either. Both default ON when absent.
//
// At least one must stay on. The server refuses to publish a workflow with both
// switched off, but a stored config or a consumer prop can still carry that
// pair, and a document step with no way to capture is a dead end. So when
// upload is off, the camera is on, whatever `allowDocumentScan` says.
//
// Components read the pair through here, never the raw keys, so the rule lives
// in exactly one place.

export interface DocumentCaptureMethodFlags {
  allowDocumentScan?: boolean;
  allowDocumentUpload?: boolean;
}

export interface DocumentCaptureMethods {
  /** The live camera scan: viewfinder, auto-capture, per-side video. */
  scan: boolean;
  /** Picking a photo from the device: file picker, drag and drop. */
  upload: boolean;
}

/** How a side's photo arrived. Restored photos have no known source. */
export type DocumentSideSource = 'camera' | 'upload' | null;

/**
 * Whether a capture moves straight on, past the review screen.
 *
 * The review is off unless the workflow asks for it, and even then only every
 * side scanned just now moves on: an uploaded photo has had no look from anyone, so it keeps its
 * preview. Mirrored by the React Native and Flutter SDKs.
 */
export function skipsDocumentReview(
  config: { documentReview?: boolean } | null | undefined,
  sources: DocumentSideSource[],
): boolean {
  return config?.documentReview !== true && sources.every((source) => source === 'camera');
}

export type AfterDocumentCapture =
  /** Stop on the front, with Retake and a way on to the back. */
  | 'preview-front'
  /** The review is off and the back is still to come: straight to it. */
  | 'scan-back'
  /** Both sides shown, with Retake and Continue. */
  | 'review'
  /** Upload and check with nothing to press. A problem brings the review back. */
  | 'hand-over';

/**
 * Where a side's capture leads. The rule all three SDKs share, so a workflow
 * behaves the same on every platform.
 */
export function afterDocumentCapture(
  config: { documentReview?: boolean } | null | undefined,
  capture: {
    side: 'front' | 'back';
    twoSided: boolean;
    front: DocumentSideSource;
    back: DocumentSideSource;
    /** A photo of the back is already held (a retake of the front). */
    hasBack: boolean;
  },
): AfterDocumentCapture {
  const { side, twoSided, front, back, hasBack } = capture;
  if (skipsDocumentReview(config, twoSided ? [front, back] : [front])) return 'hand-over';
  if (side === 'back' || !twoSided) return 'review';
  return !hasBack && skipsDocumentReview(config, [front]) ? 'scan-back' : 'preview-front';
}

/** Whether the document clip records sound. Off unless a workflow asked. */
export function recordsDocumentAudio(
  config: { documentAudio?: boolean } & DocumentCaptureMethodFlags | null | undefined,
): boolean {
  return config?.documentAudio === true && documentCaptureMethods(config).scan;
}

export function documentCaptureMethods(
  config: DocumentCaptureMethodFlags | null | undefined,
): DocumentCaptureMethods {
  const upload = config?.allowDocumentUpload !== false;
  // Only an explicit `false` switches the scan off, and never while upload is
  // also off: that pair would leave the step with no way to capture.
  const scan = config?.allowDocumentScan !== false || !upload;
  return { scan, upload };
}

/**
 * Whether the document step would open the camera. False when document capture
 * is off, and when documents are upload-only: a photo picked from the device
 * needs no camera, so the document step alone gives no reason to move the flow
 * to a phone or to disclose a recording.
 */
export function documentCaptureNeedsCamera(
  config: (DocumentCaptureMethodFlags & { enableDocumentCapture?: boolean }) | null | undefined,
): boolean {
  return config?.enableDocumentCapture !== false && documentCaptureMethods(config).scan;
}
