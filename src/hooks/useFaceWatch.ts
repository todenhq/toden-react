import { useEffect, useRef } from 'react';
import { createFaceMesh, type FaceMeshHandle } from '../liveness/face-mesh';
import { faceBoxFromLandmarks, type FaceReading } from '../lib/face-in-document';

/** A few readings a second is enough to tell a face from a document. */
const FACE_WATCH_INTERVAL_MS = 250;

/**
 * Watches the camera for a face while `active`, using the face model the
 * liveness step already loads (lib/face-in-document.ts explains why). The
 * latest reading is kept in a ref so the document detector can read it every
 * frame without re-rendering. Best-effort: if the model cannot start, nothing
 * is refused and capture works as before.
 */
export function useFaceWatch(opts: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
}): React.RefObject<FaceReading | null> {
  const { videoRef, active } = opts;
  const readingRef = useRef<FaceReading | null>(null);

  useEffect(() => {
    if (!active) {
      readingRef.current = null;
      return undefined;
    }
    let handle: FaceMeshHandle | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (handle && video && video.readyState >= video.HAVE_CURRENT_DATA) {
        try {
          await handle.send(video);
        } catch {
          /* a dropped frame decides nothing */
        }
      }
      if (!stopped) timer = setTimeout(tick, FACE_WATCH_INTERVAL_MS);
    };

    createFaceMesh((landmarks) => {
      readingRef.current = { box: faceBoxFromLandmarks(landmarks), at: performance.now() };
    })
      .then((h) => {
        if (stopped) {
          h.close();
          return;
        }
        handle = h;
        void tick();
      })
      .catch(() => {
        /* no face model here: capture works as before */
      });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      handle?.close();
      readingRef.current = null;
    };
  }, [active, videoRef]);

  return readingRef;
}
