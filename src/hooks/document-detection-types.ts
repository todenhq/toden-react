import type { CornersProblem, DocumentQuad, PixelRect, VisibleRegion } from '../lib/document-corners';
import type { FaceReading } from '../lib/face-in-document';

export interface CardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  /** The part of the frame the preview shows (object-cover hides the rest). */
  getVisibleRegion?: (frame: { width: number; height: number }) => VisibleRegion;
  /** The latest face reading while the camera faces the person (hooks/useFaceWatch.ts). */
  faceRef?: React.RefObject<FaceReading | null>;
  /**
   * True while a long document is framed upright (lib/document-turn.ts): the
   * search looks for the turned shape, and the photo is turned back to
   * landscape before it is handed over.
   */
  uprightDocument?: boolean;
}

export interface UseDocumentDetectionReturn {
  isCardDetected: boolean;
  isStable: boolean;
  /** The detected document's bounding box, in video pixels. */
  cardBounds: CardBounds | null;
  /** The video frame the bounds are measured in. */
  frameSize: { width: number; height: number } | null;
  /** Why no photo may be taken right now, or null when one may. */
  cornerProblem: CornersProblem | null;
  /** False when the detector cannot run here (see DETECTOR_START_TIMEOUT_MS). */
  detectorAvailable: boolean;
  capturedImage: string | null;
  /** The region of the frame the auto-capture kept, in video pixels. */
  captureBounds: PixelRect | null;
  /** The corners from the latest frame that passed the gate, else null. */
  getPassingQuad: () => DocumentQuad | null;
  reset: () => void;
}
