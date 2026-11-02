'use client';

import { useEffect, useState } from 'react';
import { readLight, type FaceBox, type LightLevel } from '../lib/light-level';

export { LIGHT_THRESHOLDS, type LightLevel, type FaceBox } from '../lib/light-level';

const SAMPLE_W = 96;
const SAMPLE_H = 72;
const SAMPLE_INTERVAL_MS = 800;
// Camera needs ~1.5s to auto-expose before we trust readings
const WARMUP_MS = 1500;
// Must stay out-of-range for this many consecutive readings before flagging
const CONFIRM_READINGS = 2;
// A face box older than this is not where the face is any more.
const FACE_BOX_MAX_AGE_MS = 1000;

/** Where the face was last seen, written by the face tracker on every frame. */
export interface TrackedFace {
  box: FaceBox;
  at: number;
}

/**
 * Periodically samples the video feed and classifies the lighting as `ok`,
 * `dark`, or `bright`, judged on the face's skin when the tracker has a face
 * and on the whole frame otherwise (lib/light-level.ts). Uses a confirmation
 * gate (2 consecutive readings) to avoid flickering while the camera
 * auto-exposes. Returns `ok` when disabled.
 */
export function useLightLevel(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  faceRef?: React.RefObject<TrackedFace | null>,
): { level: LightLevel } {
  // Signed streak: negative = consecutive dark readings, positive = bright.
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStreak(0);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const warmupId = setTimeout(() => {
      intervalId = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < video.HAVE_CURRENT_DATA || video.paused) return;

        ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
        const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
        const tracked = faceRef?.current;
        const face = tracked && Date.now() - tracked.at <= FACE_BOX_MAX_AGE_MS ? tracked.box : null;
        const reading = readLight(data, SAMPLE_W, SAMPLE_H, face);
        // setState called in a timer callback — allowed by react-hooks/set-state-in-effect
        setStreak((prev) => {
          if (reading === 'dark') return Math.max(prev <= 0 ? prev - 1 : -1, -(CONFIRM_READINGS + 1));
          if (reading === 'bright') return Math.min(prev >= 0 ? prev + 1 : 1, CONFIRM_READINGS + 1);
          return 0;
        });
      }, SAMPLE_INTERVAL_MS);
    }, WARMUP_MS);

    return () => {
      clearTimeout(warmupId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [enabled, videoRef, faceRef]);

  let level: LightLevel = 'ok';
  if (enabled) {
    if (streak <= -CONFIRM_READINGS) level = 'dark';
    else if (streak >= CONFIRM_READINGS) level = 'bright';
  }
  return { level };
}
