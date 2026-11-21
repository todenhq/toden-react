'use client';

import { recordJourneyEvent } from '../lib/step-log';
import { useRef, useState, useEffect, useCallback } from 'react';
import { CAPTURE_WIDTH, CAPTURE_HEIGHT, type VideoCaptureConstraints } from '../lib/capture-settings';
import { inspectCameraStream } from '../lib/integrity-signals';
import { acquireCamera, type FacingMode } from './camera-acquire';

export type { FacingMode };

export interface UseCameraOptions {
  facingMode?: FacingMode;
  enabled?: boolean;
  /**
   * Target capture resolution. Defaults to the liveness/selfie resolution
   * ({@link CAPTURE_WIDTH}×{@link CAPTURE_HEIGHT}); document capture passes a
   * higher resolution so the OCR still stays sharp.
   */
  resolution?: VideoCaptureConstraints;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
  permissionDenied: boolean;
  restart: (facingMode?: FacingMode) => void;
  stop: () => void;
}

function stopAllTracks(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

export function useCamera({
  facingMode = 'user',
  enabled = true,
  resolution = { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
}: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Hold the latest resolution in a ref so `startCamera` stays stable even
  // though callers pass a fresh object literal each render (which would
  // otherwise restart the camera on every render).
  const resolutionRef = useRef(resolution);
  resolutionRef.current = resolution;

  const startCamera = useCallback(async (mode: FacingMode, signal?: AbortSignal) => {
    setError(null);
    setPermissionDenied(false);
    setIsReady(false);

    // Stop any existing stream first
    stopAllTracks(streamRef.current);

    try {
      const mediaStream = await acquireCamera(mode, resolutionRef.current);

      // If the effect was cleaned up while we awaited, stop the new stream immediately
      if (signal?.aborted) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      // Injection heuristics (virtual cameras, bare emulated devices) — rides
      // the submit's device metadata. Best-effort, never blocks startup.
      inspectCameraStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // If our abort signal fired, the component cleaned up — bail out entirely
          if (signal?.aborted) return;
          // AbortError without our signal being aborted means the browser interrupted play()
          // because autoPlay already started it (concurrent call). The stream is still live —
          // fall through so we set isReady below.
          if (!(playErr instanceof DOMException && playErr.name === 'AbortError')) {
            throw playErr;
          }
        }
        if (!signal?.aborted) {
          setIsReady(true);
        }
      }
    } catch (err) {
      // Don't surface errors if the effect was already cleaned up
      if (signal?.aborted) return;

      const message = err instanceof Error ? err.message : 'Camera access failed';

      // On the journey too, for drop-off insights (lib/step-log.ts).
      recordCameraFailure(err);

      if (
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      ) {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (
        err instanceof DOMException &&
        err.name === 'NotFoundError'
      ) {
        setError('No camera found on this device.');
      } else {
        setError(message);
      }
    }
  }, []);

  const stop = useCallback(() => {
    stopAllTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const restart = useCallback(
    (mode?: FacingMode) => {
      startCamera(mode ?? facingMode);
    },
    [startCamera, facingMode],
  );

  // Start on mount / facingMode change
  useEffect(() => {
    const controller = new AbortController();
    if (enabled) {
      startCamera(facingMode, controller.signal);
    }
    return () => {
      controller.abort();
      stopAllTracks(streamRef.current);
      streamRef.current = null;
      // Clear the exposed state too — otherwise consumers keep a reference to a
      // now-dead stream (tracks ended). Re-using it (e.g. starting a
      // MediaRecorder on it) throws. The next startCamera repopulates these.
      setStream(null);
      setIsReady(false);
    };
  }, [facingMode, enabled, startCamera]);

  return { videoRef, stream, isReady, error, permissionDenied, restart, stop };
}

/**
 * PURE in effect: records why the camera did not start. Refused is
 * `camera_denied`; none found, in use or anything else is `camera_unavailable`.
 */
export function recordCameraFailure(err: unknown): void {
  const name = (err as { name?: unknown } | null)?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    recordJourneyEvent('camera_denied');
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    recordJourneyEvent('camera_unavailable', 'not_found');
  } else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    recordJourneyEvent('camera_unavailable', 'in_use');
  } else {
    recordJourneyEvent('camera_unavailable', 'other');
  }
}
