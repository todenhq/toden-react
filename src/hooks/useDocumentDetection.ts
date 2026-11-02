'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { quadPixelBounds } from '../lib/document-card-search';
import { boundsMoved, detectQuadInFrame } from '../lib/document-detect-frame';
import { cornersProblem, FULL_FRAME, type CornersProblem, type DocumentQuad, type PixelRect } from '../lib/document-corners';
import { captureDocumentQuad } from '../lib/video-crop';
import { faceBlocksDocument } from '../lib/face-in-document';
import type { CardBounds, UseDocumentDetectionOptions, UseDocumentDetectionReturn } from './document-detection-types';

// The camera loop behind document auto-capture. Each frame is squashed into a
// small canvas, searched for a card (lib/document-card-search.ts), and its four
// corners judged by the corner gate (lib/document-corners.ts). A photo is taken
// ONLY when all four corners are in the visible frame with room past them, and
// it keeps that room: the crop is the corners plus the bleed, so a passport's
// MRZ is never cut. There is deliberately no timed fallback that shoots
// without the corners: that is how a half-framed passport got through.

/** How many *consecutive* frames a candidate must survive before "detected". */
const DETECT_CONFIRM_FRAMES = 3;
/** How long the corners must pass, steadily, before we auto-capture. */
const STABILITY_DURATION_MS = 750;
/** Throttle detection to ~16 fps, plenty for guidance and gentle on the CPU. */
const MIN_PROCESS_INTERVAL_MS = 60;
/** No frame analysed by now means the detector cannot run here: the shutter
 *  then crops the guide instead, so nobody is stranded. */
const DETECTOR_START_TIMEOUT_MS = 4000;

export type { CardBounds, UseDocumentDetectionOptions, UseDocumentDetectionReturn } from './document-detection-types';

export function useDocumentDetection({
  videoRef,
  canvasRef,
  enabled = true,
  getVisibleRegion,
  faceRef,
  uprightDocument = false,
}: UseDocumentDetectionOptions): UseDocumentDetectionReturn {
  // Read per frame, so a resized preview never re-arms the detection loop.
  const visibleRef = useRef(getVisibleRegion);
  visibleRef.current = getVisibleRegion;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  // Read per frame too: turning the frame must not re-arm the loop either.
  const uprightRef = useRef(uprightDocument);
  uprightRef.current = uprightDocument;
  const [isCardDetected, setIsCardDetected] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const [cardBounds, setCardBounds] = useState<CardBounds | null>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [cornerProblem, setCornerProblem] = useState<CornersProblem | null>('no_document');
  const [detectorAvailable, setDetectorAvailable] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureBounds, setCaptureBounds] = useState<PixelRect | null>(null);

  const rafRef = useRef<number | null>(null);
  const confirmCountRef = useRef(0);
  const stableStartRef = useRef<number | null>(null);
  const lastBoundsRef = useRef<CardBounds | null>(null);
  const passingQuadRef = useRef<DocumentQuad | null>(null);
  const analysedRef = useRef(false);
  const failedRef = useRef(false);
  const hasCapturedRef = useRef(false);
  const lastProcessRef = useRef(0);

  /** True once the photo is taken; false when the frame could not be read. */
  const capture = useCallback(
    async (quad: DocumentQuad) => {
      const video = videoRef.current;
      if (!video || hasCapturedRef.current) return false;
      hasCapturedRef.current = true;
      const shot = await captureDocumentQuad(video, quad, { turnBack: uprightRef.current });
      if (!shot) return (hasCapturedRef.current = false);
      setCaptureBounds(shot.crop);
      setCapturedImage(shot.image);
      return true;
    },
    [videoRef],
  );

  /** Nothing usable this frame: forget the corners and the steadiness. */
  const lose = useCallback((problem: CornersProblem) => {
    stableStartRef.current = null;
    passingQuadRef.current = null;
    setIsStable(false);
    setCornerProblem(problem);
  }, []);

  const processFrame = useCallback(() => {
    const next = () => (rafRef.current = requestAnimationFrame(processFrame));
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const now = performance.now();
    const idle = !video || !canvas || video.readyState < video.HAVE_CURRENT_DATA || hasCapturedRef.current;
    // Throttled: guidance does not need every animation frame.
    if (idle || now - lastProcessRef.current < MIN_PROCESS_INTERVAL_MS) {
      next();
      return;
    }
    lastProcessRef.current = now;

    let quad: DocumentQuad | null = null;
    try {
      quad = detectQuadInFrame(video, canvas, uprightRef.current);
    } catch {
      // A hard failure (no canvas, a tainted frame): stop, and let the shutter
      // fall back to the guide crop rather than wait on corners that never come.
      failedRef.current = true;
      passingQuadRef.current = null;
      setDetectorAvailable(false);
      return;
    }
    analysedRef.current = true;
    setDetectorAvailable(true);

    if (!quad) {
      confirmCountRef.current = 0;
      setIsCardDetected(false);
      setCardBounds(null);
      lose('no_document');
      next();
      return;
    }

    confirmCountRef.current = Math.min(confirmCountRef.current + 1, DETECT_CONFIRM_FRAMES);
    if (confirmCountRef.current < DETECT_CONFIRM_FRAMES) {
      next();
      return;
    }

    const frame = { width: video.videoWidth, height: video.videoHeight };
    const bounds = quadPixelBounds(quad, frame);
    setIsCardDetected(true);
    setCardBounds(bounds);
    setFrameSize(frame);

    // A steady rectangle that is mostly a face is the person, not their ID.
    const problem =
      cornersProblem(quad, visibleRef.current?.(frame) ?? FULL_FRAME) ??
      (faceBlocksDocument(faceRef?.current, bounds, frame, now) ? 'face_not_document' : null);
    const last = lastBoundsRef.current;
    lastBoundsRef.current = bounds;
    if (problem) {
      lose(problem);
      next();
      return;
    }
    passingQuadRef.current = quad;
    setCornerProblem(null);

    if (!last || boundsMoved(bounds, last, frame)) {
      stableStartRef.current = null;
      setIsStable(false);
    } else if (stableStartRef.current === null) {
      stableStartRef.current = now;
    } else if (now - stableStartRef.current >= STABILITY_DURATION_MS) {
      setIsStable(true);
      // The loop ends with the capture, unless the frame could not be read.
      void capture(quad).then((taken) => taken || next());
      return;
    }
    next();
  }, [videoRef, canvasRef, capture, lose, faceRef]);

  useEffect(() => {
    if (!enabled) return;
    failedRef.current = false;
    rafRef.current = requestAnimationFrame(processFrame);
    const startTimer = setTimeout(() => {
      if (!analysedRef.current) setDetectorAvailable(false);
    }, DETECTOR_START_TIMEOUT_MS);
    return () => {
      clearTimeout(startTimer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, processFrame]);

  const reset = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    confirmCountRef.current = 0;
    stableStartRef.current = null;
    lastBoundsRef.current = null;
    passingQuadRef.current = null;
    analysedRef.current = false;
    hasCapturedRef.current = false;
    lastProcessRef.current = 0;
    setIsCardDetected(false);
    setIsStable(false);
    setCardBounds(null);
    setCornerProblem('no_document');
    setDetectorAvailable(!failedRef.current);
    setCapturedImage(null);
    setCaptureBounds(null);
    // Keep looking while the camera is still on (a capture refused for poor
    // light must be able to fire again), unless the detector cannot run here.
    if (enabledRef.current && !failedRef.current) {
      rafRef.current = requestAnimationFrame(processFrame);
    }
  }, [processFrame]);

  const getPassingQuad = useCallback(() => passingQuadRef.current, []);

  return {
    isCardDetected, isStable, cardBounds, frameSize, cornerProblem,
    detectorAvailable, capturedImage, captureBounds, getPassingQuad, reset,
  };
}
