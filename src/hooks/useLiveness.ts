'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { FaceWindow } from '../lib/liveness-cutout';
import { createFaceMesh, type FaceMeshHandle } from '../liveness/face-mesh';
import { DEFAULT_DIRECTION_COUNT, pickChallenges, pickFallbackGestures, planChallenges, ChallengeTracker, type ChallengeEntry } from '../liveness/challenge-manager';
import { flashOutcome, FLASH_RETRY_GUIDANCE } from '../liveness/flash-outcome';
import {
  detectNod,
  detectHeadTurn,
  detectBlink,
  createBlinkState,
  detectSmile,
  checkFacePosition,
  DIRECTION_HOLD_FRAMES,
  facing,
  headTilt,
  oppositeDirection,
  type BlinkState,
} from '../liveness/gesture-detector';
import {
  challengeInstruction,
  HOLD_FRAMES,
  type LivenessState,
  type LivenessConfig,
  type NormalizedLandmark,
} from '../liveness/types';
import { useText, type TextFn } from '../i18n';
import { flashSequenceNamed, generateFlashSequence, runFlashSequence } from '../liveness/flash-detector';
import { holdCameraSteady } from '../lib/camera-lock';
import { recordLivenessSignals, recordPromptTimes } from '../lib/integrity-signals';
import { recordingStart } from '../liveness/flash-timeline';
import { PromptTimeline } from '../liveness/prompt-timeline';
import { ResponseWatch } from '../liveness/response-watch';
import { speak, stopSpeaking } from '../liveness/speech';
import type { LightLevel, TrackedFace } from './useLightLevel';
import { faceBoxOf } from '../lib/light-level';
import { SelfieCandidates, type SelfieVerdict } from '../lib/selfie-candidates';
import { planGate, type DirectionPlan, type PlanRequest } from '../liveness/direction-plan';
import type { SelfieScene } from '../lib/selfie-review';
import {
  CAPTURE_FRAMERATE,
  LIVENESS_VIDEO_BITRATE,
  SELFIE_IMAGE_QUALITY,
  createVideoRecorder,
  logCaptureSize,
} from '../lib/capture-settings';
import { readyPauseShare, readyPauseStep } from '../liveness/ready-pause';
import { isDirectionChallenge } from '../liveness/types';
import { recordJourneyEvent } from '../lib/step-log';

/** A head held the wrong way this long (about a second) is shown the way again. */
const WRONG_WAY_FRAMES = 30;

// The guidance shown (and spoken) when a second face enters the frame is the
// catalogue text `presence.position.multipleFaces`.
// Sentinel stored in `warning` during a challenge when >1 face is present.
const MULTI_FACE_WARNING = 'multiple_faces';

function lightingGuidance(level: LightLevel, t: TextFn): string | null {
  if (level === 'dark') return t('presence.lighting.tooDark');
  if (level === 'bright') return t('presence.lighting.tooBright');
  return null;
}

// Draw the current video frame into the buffer canvas, mirrored to match the
// selfie capture (useImageCapture is mounted with mirror:true). Reuses the
// canvas across frames. Used to snapshot the exact frame FaceMesh analyzes so
// the auto-captured selfie can't be a later, faceless frame.
function drawAnalyzedFrame(
  video: HTMLVideoElement,
  ref: React.MutableRefObject<HTMLCanvasElement | null>,
): void {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  let canvas = ref.current;
  if (!canvas) {
    canvas = document.createElement('canvas');
    ref.current = canvas;
  }
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(-1, 0, 0, 1, w, 0); // horizontal mirror
  ctx.drawImage(video, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset for the next drawImage
}

// ---------------------------------------------------------------------------
// Public return type
// ---------------------------------------------------------------------------

export interface UseLivenessReturn {
  state: LivenessState;
  challenges: readonly ChallengeEntry[];
  isFaceDetected: boolean;
  /** Short video blob recorded during the liveness session */
  videoBlob: Blob | null;
  /**
   * CSS color for the fullscreen flash overlay while the screen-reflection
   * challenge runs; null when no flash is being shown.
   */
  flashColor: string | null;
  /** A flash SEQUENCE is running (true across the gaps between colours). */
  flashing: boolean;
  retry: () => void;
  /**
   * How far through the WHOLE test the user is, 0..1: positioning, each
   * challenge, the capture, in equal segments, each measured by what actually
   * gates it. Reaches 1 at the shutter. Drawn by CaptureRing.
   *
   * A ref rather than state on purpose: it moves every frame of the detector
   * loop, and the phase is set only on transitions precisely so that loop does
   * not re-render the step. Read it in an animation frame; never in render.
   */
  livenessProgressRef: React.MutableRefObject<number>;
  /**
   * When the person last did anything with their face during a gesture step,
   * on the performance clock (0 for never). A ref for the same reason: read
   * it on a timer, never in render.
   */
  respondedAtRef: React.MutableRefObject<number>;
  /** Counts each time the person has gone the wrong way on a head direction:
   *  the narrator shows the way again when it changes. Never a failure. */
  wrongWayCount: number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface UseLivenessOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  config?: Partial<LivenessConfig>;
  captureFrame: () => string | null;
  compressImage: (base64: string) => Promise<string>;
  /**
   * Current lighting quality. When not `'ok'` the flow discourages capture —
   * it won't start the first challenge or auto-capture the selfie, and shows
   * lighting guidance instead. Defaults to `'ok'` when omitted.
   */
  lightLevel?: LightLevel;
  /**
   * Full screen only: how much of the camera frame the face window shows
   * (lib/liveness-cutout). With one set, the face is judged against the window
   * rather than the frame. A ref: it changes with layout, never with a frame.
   */
  faceWindowRef?: React.RefObject<FaceWindow | null>;
  /**
   * Written with where the face is on every frame, so the light check can
   * judge the face's skin rather than the room behind it (lib/light-level).
   */
  faceRef?: React.MutableRefObject<TrackedFace | null>;
  /**
   * Asks Core for the gestures of one attempt, head directions or classic
   * (liveness/direction-plan.ts). Called once per attempt with gestures; null
   * or a failure leaves the SDK's own pick in place, with no plan named.
   */
  requestDirectionPlan?: (plan: PlanRequest) => Promise<DirectionPlan | null>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Frames of a steady, well-lit face before the shutter fires (~0.5s at 30fps).
 *
 * Named because it is no longer only a threshold: the capture ring divides by
 * it, so the arc a user watches fill IS this counter. Change it and the ring
 * follows.
 */
const CAPTURE_STABLE_FRAMES = 15;

/** After this long on the final capture, the run's best front-on frame is used. */
const CAPTURE_WAIT_MS = 4000;

/** Frames of a centred, well-placed face before the first challenge starts (~0.8s). */
const POSITION_STABLE_FRAMES = 25;
/** The share of the positioning part of the line the steady frames fill; the
 *  pause fills the rest. */
const POSITION_FRAMES_SHARE = 0.6;

/**
 * How far into its segment the ring may grow on a challenge's clock alone.
 * A gesture either lands or it does not, so the only honest continuous
 * measure of a challenge is time; but time running out is not progress, so the
 * clock never fills the segment — the gesture landing does that.
 */
const CHALLENGE_SEGMENT_CAP = 0.85;

export function useLiveness({
  videoRef,
  cameraReady,
  config,
  captureFrame,
  compressImage,
  lightLevel = 'ok',
  faceWindowRef,
  faceRef,
  requestDirectionPlan,
}: UseLivenessOptions): UseLivenessReturn {
  const [state, setState] = useState<LivenessState>({ phase: 'loading' });
  // The workflow's copy, read through a ref: the detector loop and setPhase are
  // stable callbacks, and the texts must not restart them.
  const t = useText();
  const tRef = useRef(t);
  tRef.current = t;
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [challenges, setChallenges] = useState<readonly ChallengeEntry[]>([]);
  // When each prompt appeared and passed, for the claim (prompt-timeline.ts).
  const promptsRef = useRef(new PromptTimeline());
  // Incremented by retry() to re-trigger the FaceMesh initialization effect
  const [retryCount, setRetryCount] = useState(0);

  // Use a ref for phase so the Face Mesh callback always reads the latest value
  const phaseRef = useRef<LivenessState['phase']>('loading');

  const faceMeshRef = useRef<FaceMeshHandle | null>(null);
  const trackerRef = useRef<ChallengeTracker | null>(null);
  // Core's head-direction plan for the current attempt (liveness/direction-plan.ts).
  const planRef = useRef<{ status: 'none' | 'pending' | 'ready' | 'failed'; askedAt: number }>({ status: 'none', askedAt: 0 });
  /** The flash colours Core picked for this attempt, once its plan arrives. */
  const planFlashRef = useRef<string[] | null>(null);
  const planAttemptRef = useRef(0);
  const challengeStartedRef = useRef(false);
  const requestDirectionPlanRef = useRef(requestDirectionPlan);
  requestDirectionPlanRef.current = requestDirectionPlan;
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);

  // Gesture detection history buffers
  const nodHistoryRef = useRef<number[]>([]);
  // Passive Liveness: steady frames counted toward the hold prompt.
  const holdFramesRef = useRef<number>(0);
  const blinkStateRef = useRef<BlinkState>(createBlinkState());
  const positionStableRef = useRef<number>(0);
  /** When the face first held in place, on the performance clock: the ready
   *  pause runs from here (liveness/ready-pause.ts). Null while it is not in place. */
  const readyAtRef = useRef<number | null>(null);
  // 0..1 across the WHOLE test, read by the ring on the frame. A REF so the
  // detector loop can update it every frame without re-rendering the step (the
  // phase itself is set only on transitions, deliberately, for the same reason).
  const livenessProgressRef = useRef<number>(0);
  // When the person last did anything with their face during a gesture step,
  // on the performance clock (0 for never). Read by the gesture narrator,
  // which comes back to show a gesture only to someone who has stopped
  // responding. A REF for the same reason as the progress above.
  const responseWatchRef = useRef(new ResponseWatch());
  const respondedAtRef = useRef<number>(0);
  /** Where the person's nose tip rests (gesture-detector/directions.ts), taken
   *  as they hold still before the first gesture: looking up and down are
   *  measured against it. */
  const restTiltRef = useRef<number | null>(null);
  /** Frames in a row the head has faced the asked-for direction, and the wrong one. */
  const directionFramesRef = useRef(0);
  const wrongWayFramesRef = useRef(0);
  const [wrongWayCount, setWrongWayCount] = useState(0);
  // When the running challenge's clock started, and how long it has. The
  // challenge segment of the ring grows on this clock.
  const challengeClockRef = useRef<{ startedAt: number; seconds: number } | null>(null);
  // Last guidance shown during the capturing phase — so we only re-render when
  // it actually changes (the phase runs every frame).
  const capturingGuidanceRef = useRef<string | null>(null);

  // Cooldown: skip detection for N frames after a new challenge starts
  // This prevents the next gesture from passing on residual face state
  // (e.g. still smiling, head still turned) from the previous gesture.
  const cooldownFramesRef = useRef<number>(0);

  // Challenge timeout
  const challengeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flash (screen-reflection) challenge
  const [flashColor, setFlashColor] = useState<string | null>(null);
  // Whether a flash SEQUENCE is running, as state rather than the ref below.
  // `flashColor` alone cannot answer this — it is null in the gaps between
  // colours — and callers need to know the sequence is under way, not which
  // colour is on screen right now.
  const [flashing, setFlashing] = useState(false);
  const flashSessionRef = useRef(0); // bumped on retry/unmount to abort a running sequence
  const flashRunningRef = useRef(false);
  // Unmeasurable flashes retried so far this run (flash-outcome.ts).
  const flashRetriesRef = useRef(0);
  // Consecutive no-face frames during the flash → abort (the user pulled away).
  const flashNoFaceFramesRef = useRef(0);

  // Snapshot of the exact video frame FaceMesh last analyzed, taken at send-time
  // in the detection loop. The selfie is captured from THIS frame — the one that
  // confirmed a centered face — instead of a later frame that (after FaceMesh's
  // processing latency) may already be faceless, which produced blank selfies.
  const analyzedFrameRef = useRef<HTMLCanvasElement | null>(null);

  // Face-continuity guard: a real face can't teleport between consecutive
  // frames — landmark jumps (position/scale) flag face swaps & spliced feeds.
  const prevFaceSigRef = useRef<{ x: number; y: number; iod: number } | null>(null);
  const faceGlitchesRef = useRef(0);

  // The selfie is CHOSEN, not snapped (lib/selfie-pick.ts): frames are scored
  // all through the live run and the best front-on one is kept, cut to the
  // standard frame. `snapFreshRef` says the result in hand is for a frame the
  // loop snapshotted; `sendCountRef` thins those snapshots during gestures.
  const selfiesRef = useRef(new SelfieCandidates());
  const snapFreshRef = useRef(false);
  const sendCountRef = useRef(0);
  // The final capture: when it began (the best frame so far is used if no
  // better one comes), and no-face frames in a row (the run breaks on a gap).
  const capturingSinceRef = useRef(0);
  const capturingNoFaceRef = useRef(0);

  // Video recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // Keep captureFrame and compressImage in refs so callbacks don't go stale
  const captureFrameRef = useRef(captureFrame);
  captureFrameRef.current = captureFrame;
  const compressImageRef = useRef(compressImage);
  compressImageRef.current = compressImage;

  // Live lighting quality, read inside the Face Mesh callback.
  const lightLevelRef = useRef(lightLevel);
  lightLevelRef.current = lightLevel;

  // True while a challenge is paused because >1 face is in frame — used to
  // restart the challenge timer when the frame returns to a single face.
  const multiFacePausedRef = useRef(false);

  // Aspect ratio (width / height) of the frames FaceMesh is analyzing. Phones
  // hand us a PORTRAIT stream (e.g. 480x640) where desktops hand us a landscape
  // one (640x480), and MediaPipe normalizes x by width and y by height — so any
  // detector comparing a vertical span against a horizontal one has to divide
  // the distortion back out. 1 (square) is the safe fallback before metadata
  // lands, which only makes detection momentarily stricter, never looser.
  const frameAspect = useCallback((): number => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return 1;
    return video.videoWidth / video.videoHeight;
  }, [videoRef]);

  // What the face is judged against: the full-screen window when the step
  // reported one, otherwise (undefined) the whole frame.
  const positionFrame = useCallback(
    (moving = false) => {
      const window = faceWindowRef?.current;
      return window ? { window, moving } : undefined;
    },
    [faceWindowRef],
  );

  // -----------------------------------------------------------------------
  // Helper: update state and phase ref together
  // -----------------------------------------------------------------------

  // Track the last spoken text to avoid repeating the same guidance
  const lastSpokenRef = useRef<string>('');

  const setPhase = useCallback((next: LivenessState) => {
    phaseRef.current = next.phase;
    setState(next);
    // A failed attempt goes on the journey (drop-off insights, lib/step-log.ts).
    if (next.phase === 'failed') {
      const detail = livenessFailureDetail(next.reason, trackerRef.current?.current?.config.type);
      if (detail) recordJourneyEvent('liveness_failed', detail);
    }

    // Trigger speech for key transitions
    let textToSpeak = '';
    switch (next.phase) {
      case 'positioning':
        textToSpeak = next.guidance;
        break;
      case 'challenge':
        if (next.warning === MULTI_FACE_WARNING) {
          textToSpeak = tRef.current('presence.position.multipleFaces');
        } else if (next.warning && next.warning !== 'wrong_gesture') {
          textToSpeak = next.warning;
        } else if (!next.warning) {
          textToSpeak = challengeInstruction(next.challenge.type, tRef.current);
        }
        break;
      case 'capturing':
        textToSpeak = next.guidance ?? tRef.current('presence.position.holdStill');
        break;
      case 'challenge_passed':
        textToSpeak = tRef.current('presence.challenge.passed');
        break;
      case 'complete':
        textToSpeak = tRef.current('presence.capture.complete');
        break;
      case 'failed':
        if (next.reason === 'timeout') textToSpeak = tRef.current('presence.failed.timeout');
        else if (next.reason === 'face_lost') textToSpeak = tRef.current('presence.failed.faceLost');
        break;
    }

    if (textToSpeak && textToSpeak !== lastSpokenRef.current) {
      lastSpokenRef.current = textToSpeak;
      speak(textToSpeak);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Initialize: pick challenges
  // -----------------------------------------------------------------------

  const initTracker = useCallback(() => {
    const picked = pickChallenges(config);
    // Which prompts ran rides the claim, so the server knows whether a turn
    // was asked for (its shape-from-movement verdict depends on it).
    recordLivenessSignals({ mode: config?.mode ?? 'gestures', challenges: picked.map((c) => c.type), directionPlanId: undefined });
    const tracker = new ChallengeTracker(picked);
    trackerRef.current = tracker;
    challengeStartedRef.current = false;
    // Core picks the gestures, head directions or classic, one plan per
    // attempt. The pick above stands in until it arrives, and is replaced if
    // the first instruction has not been given yet; the first instruction
    // waits a moment for it.
    const attempt = ++planAttemptRef.current;
    const mode = config?.mode ?? 'gestures';
    const asksGestures = mode === 'gestures' || mode === 'both';
    const showsFlash = mode === 'flash' || mode === 'both';
    // Core also picks the flash colours (2026-11-19): a flash-only check asks
    // for no gestures, only colours.
    // Within Core's 2 to 5, as the SDK's own pick: a count outside it was refused and left the SDK picking.
    const flashCount = showsFlash ? Math.min(5, Math.max(2, Math.round(config?.flashSequenceLength ?? 4))) : undefined;
    const request: PlanRequest = !asksGestures
      ? { set: 'none', count: 0, flash: flashCount }
      : config?.gestureSet === 'directions'
        ? { set: 'directions', count: config.directionCount ?? DEFAULT_DIRECTION_COUNT, flash: flashCount }
        : { set: 'classic', count: config?.challengeCount ?? 2, pool: config?.challengePool, flash: flashCount };
    planFlashRef.current = null;
    if (requestDirectionPlanRef.current) {
      planRef.current = { status: 'pending', askedAt: performance.now() };
      requestDirectionPlanRef.current(request)
        .catch(() => null)
        .then((plan) => {
          if (!mountedRef.current || attempt !== planAttemptRef.current) return;
          if (!plan || challengeStartedRef.current) {
            planRef.current = { status: 'failed', askedAt: planRef.current.askedAt };
            return;
          }
          planFlashRef.current = plan.flash.length > 0 ? plan.flash : null;
          if (asksGestures) {
            const planned = planChallenges(plan.prompts, config);
            const next = new ChallengeTracker(planned);
            trackerRef.current = next;
            setChallenges([...next.all]);
            recordLivenessSignals({ mode: config?.mode ?? 'gestures', challenges: planned.map((c) => c.type), directionPlanId: plan.planId });
          } else {
            recordLivenessSignals({ mode: config?.mode ?? 'gestures', challenges: trackerRef.current?.all.map((e) => e.config.type) ?? [], directionPlanId: plan.planId });
          }
          planRef.current = { status: 'ready', askedAt: planRef.current.askedAt };
        });
    } else {
      planRef.current = { status: 'none', askedAt: 0 };
    }
    promptsRef.current.reset();
    recordPromptTimes(undefined);
    flashRetriesRef.current = 0;
    livenessProgressRef.current = 0;
    setChallenges([...tracker.all]);
    return tracker;
  }, [config]);

  // -----------------------------------------------------------------------
  // Video recording helpers
  // -----------------------------------------------------------------------

  const startRecording = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Get the stream from the video element
    const stream = (video as HTMLVideoElement & { captureStream?: (fps?: number) => MediaStream }).captureStream?.(CAPTURE_FRAMERATE);
    if (!stream) return;

    const created = createVideoRecorder(stream, LIVENESS_VIDEO_BITRATE);
    if (!created) return; // Browser doesn't support recording
    const { recorder, mimeType } = created;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        logCaptureSize('liveness video (capture-stream)', blob);
        setVideoBlob(blob);
      }
    };

    try {
      recorder.start(500); // collect chunks every 500ms
    } catch {
      return; // stream unusable — skip recording rather than crash
    }
    mediaRecorderRef.current = recorder;
  }, [videoRef]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  // -----------------------------------------------------------------------
  // Challenge timeout timer
  // -----------------------------------------------------------------------

  const clearChallengeTimer = useCallback(() => {
    if (challengeTimerRef.current) {
      clearTimeout(challengeTimerRef.current);
      challengeTimerRef.current = null;
    }
  }, []);

  const startChallengeTimer = useCallback(
    (seconds: number) => {
      clearChallengeTimer();
      // Every prompt starts here, and a resumed one keeps its first time.
      const prompt = trackerRef.current?.current?.config.type;
      if (prompt) promptsRef.current.shown(prompt, performance.now());
      challengeClockRef.current = { startedAt: performance.now(), seconds };
      challengeTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        stopRecording();
        setPhase({ phase: 'failed', reason: 'timeout' });
      }, seconds * 1000);
    },
    [clearChallengeTimer, setPhase, stopRecording],
  );

  // -----------------------------------------------------------------------
  // Auto-capture selfie
  // -----------------------------------------------------------------------

  const doCapture = useCallback(async () => {
    // Close the ring. The counter reaches the shutter and the phase changes in
    // the same frame, so without this the arc is simply removed from the screen
    // at wherever it had got to — the user watches it build and never once sees
    // it finish, which is the whole point of a ring.
    livenessProgressRef.current = 1;
    stopRecording();

    // Capture from the exact frame FaceMesh confirmed a centered face on
    // (snapshotted at send-time), so the selfie matches the landmarks even if
    // the camera has since moved on — no blank/faceless capture. Fall back to
    // the live frame only if the snapshot is somehow unavailable.
    let base64: string | null = null;
    // The best front-on frame of the run, already cut to the standard frame.
    const chosen = selfiesRef.current.bestCanvas;
    // The frame the selfie was cut from, for the review. The fallbacks below
    // are whole frames themselves and need none.
    let selfieScene: SelfieScene | null = null;
    if (chosen) {
      try {
        base64 = chosen.toDataURL('image/jpeg', SELFIE_IMAGE_QUALITY);
        const scene = selfiesRef.current.bestScene;
        if (scene) {
          selfieScene = {
            image: scene.canvas.toDataURL('image/jpeg', SELFIE_IMAGE_QUALITY),
            width: scene.canvas.width,
            height: scene.canvas.height,
            face: scene.face,
          };
        }
      } catch {
        base64 = null;
      }
    }
    const snap = analyzedFrameRef.current;
    if (!base64 && snap && snap.width > 0 && snap.height > 0) {
      try {
        base64 = snap.toDataURL('image/jpeg', SELFIE_IMAGE_QUALITY);
      } catch {
        base64 = null;
      }
    }
    if (!base64) base64 = captureFrameRef.current();
    if (!base64) {
      setPhase({ phase: 'failed', reason: 'face_lost' });
      return;
    }

    const compressed = await compressImageRef.current(base64);
    if (!mountedRef.current) return;

    logCaptureSize('selfie still', compressed);
    setPhase({ phase: 'complete', selfieBase64: compressed, selfieScene });
  }, [setPhase, stopRecording]);

  // -----------------------------------------------------------------------
  // Process a frame of landmarks
  // This is stored in a ref so the Face Mesh onResults callback
  // always calls the latest version without needing to re-create it.
  // -----------------------------------------------------------------------

  const processLandmarksRef = useRef<(landmarks: NormalizedLandmark[] | null, faceCount: number) => void>(() => {});

  // Shared "current challenge passed" path — used by gesture detection AND the
  // flash-sequence completion. Advances to the next challenge or capture.
  const passCurrentChallenge = () => {
    const tracker = trackerRef.current;
    if (!tracker?.current) return;
    clearChallengeTimer();
    promptsRef.current.passed(performance.now());
    recordPromptTimes(promptsRef.current.report(recordingStart()));
    tracker.markCurrentPassed();
    setChallenges([...tracker.all]);
    setPhase({ phase: 'challenge_passed', index: tracker.currentIndex });

    // After a delay (800ms flash + 1000ms cooldown), advance to next challenge or capture
    setTimeout(() => {
      if (!mountedRef.current) return;

      // Reset detection buffers for next challenge
      nodHistoryRef.current = [];
      holdFramesRef.current = 0;
      blinkStateRef.current = createBlinkState();
      prevFaceSigRef.current = null;

      const hasMore = tracker.advance();
      setChallenges([...tracker.all]);

      if (hasMore) {
        const next = tracker.current!;
        // 30 frames (~1s) cooldown so residual face state doesn't
        // instantly pass the next gesture
        cooldownFramesRef.current = 30;
        setPhase({
          phase: 'challenge',
          index: tracker.currentIndex,
          challenge: next.config,
          timeRemaining: next.config.timeoutSeconds,
        });
        startChallengeTimer(next.config.timeoutSeconds);
        maybeStartFlash();
      } else {
        // All challenges passed — wait for steady face then capture
        positionStableRef.current = 0;
        capturingGuidanceRef.current = null;
        capturingSinceRef.current = performance.now();
        capturingNoFaceRef.current = 0;
        setPhase({ phase: 'capturing' });
      }
    }, 1800);
  };

  // Start the flash (screen-reflection) sequence when the ACTIVE challenge is
  // the flash challenge. Runs on its own timeline (not landmark-driven); the
  // challenge timeout still applies as the outer deadline.
  const maybeStartFlash = () => {
    const tracker = trackerRef.current;
    const entry = tracker?.current;
    const video = videoRef.current;
    if (!entry || entry.config.type !== 'flash' || flashRunningRef.current || !video) return;

    flashRunningRef.current = true;
    setFlashing(true);
    const session = flashSessionRef.current;
    const isActive = () =>
      mountedRef.current && flashSessionRef.current === session && phaseRef.current === 'challenge';

    // Exposure and white balance are held still for the sequence, where the
    // browser allows it (lib/camera-lock.ts), and handed back however it ends.
    let release = () => {};
    holdCameraSteady(video)
      .then((handBack) => {
        release = handBack;
        // Core's colours when its plan came in time; the SDK's own pick otherwise (recorded as unplanned).
        const planned = planFlashRef.current ? flashSequenceNamed(planFlashRef.current) : null;
        return runFlashSequence(video, setFlashColor, isActive, planned ?? generateFlashSequence(config?.flashSequenceLength));
      })
      .finally(() => release())
      .then((result) => {
        flashRunningRef.current = false;
        setFlashing(false);
        const mode = config?.mode ?? 'gestures';
        const outcome = flashOutcome(result, mode, flashRetriesRef.current);
        recordLivenessSignals({
          // A flash-only check that fell back to gestures ran both.
          mode: outcome === 'fallback_gestures' ? 'both' : mode,
          flash: {
            passed: result.passed,
            score: result.score,
            matched: result.matched,
            total: result.total,
            inconclusive: result.inconclusive,
            sequence: result.sequence,
            ...(result.onsets ? { onsets: result.onsets } : {}),
          },
        });
        if (!isActive()) return;
        if (outcome === 'retry') {
          // Unmeasurable: ask the person to move out of bright light, then run
          // a fresh sequence on the same challenge with a fresh clock.
          flashRetriesRef.current++;
          const entry = trackerRef.current?.current;
          if (!entry) return;
          setPhase({
            phase: 'challenge',
            index: trackerRef.current!.currentIndex,
            challenge: entry.config,
            timeRemaining: entry.config.timeoutSeconds,
            warning: FLASH_RETRY_GUIDANCE,
          });
          startChallengeTimer(entry.config.timeoutSeconds);
          setTimeout(() => {
            if (isActive()) maybeStartFlash();
          }, 1500);
          return;
        }
        if (outcome === 'fallback_gestures') {
          // Still unmeasurable on a flash-only check: prove liveness with
          // gestures instead of passing on a flash nobody could measure.
          const fallback = pickFallbackGestures(config ?? {});
          trackerRef.current?.append(fallback);
          // The claim lists every prompt that ran, the fallback gestures included.
          recordLivenessSignals({ mode: 'both', challenges: ['flash', ...fallback.map((c) => c.type)] });
          passCurrentChallenge();
          return;
        }
        if (outcome === 'pass' || outcome === 'accept_gestures') {
          passCurrentChallenge();
        } else {
          clearChallengeTimer();
          stopRecording();
          trackerRef.current?.markCurrentFailed();
          setChallenges([...(trackerRef.current?.all ?? [])]);
          setPhase({ phase: 'failed', reason: 'flash_failed' });
        }
      })
      .catch(() => {
        flashRunningRef.current = false;
        setFlashing(false);
        setFlashColor(null);
      });
  };

  // -----------------------------------------------------------------------
  // Progress across the WHOLE test, for the ring on the frame
  // -----------------------------------------------------------------------
  //
  // Equal segments: positioning, each challenge, the capture. Each is measured
  // by the thing actually gating it — steady frames toward the positioning
  // threshold, the challenge's clock, steady frames toward the shutter — so the
  // line moves at the pace the test is really moving at, and a gesture landing
  // is a visible jump to the start of the next segment. `complete` is 1, and
  // it is the ONLY thing that closes the ring: the capture segment is capped
  // on its counter like a challenge on its clock, because a ring that closed
  // before the still was in hand announced a photo not yet taken.
  //
  // Computed BEFORE the no-face early return below: a challenge's clock keeps
  // running while the face is briefly lost, so its segment should too.
  const updateLivenessProgress = () => {
    const tracker = trackerRef.current;
    const challengeCount = tracker?.totalCount ?? config?.challengeCount ?? 2;
    const seg = 1 / (challengeCount + 2);
    let value = 0;
    switch (phaseRef.current) {
      case 'positioning':
        {
          const frames = Math.min(1, positionStableRef.current / POSITION_STABLE_FRAMES);
          const readyAt = readyAtRef.current;
          const paused = readyPauseShare(readyAt, performance.now());
          value = seg * (POSITION_FRAMES_SHARE * frames + (1 - POSITION_FRAMES_SHARE) * paused);
        }
        break;
      case 'challenge': {
        const clock = challengeClockRef.current;
        const onClock = clock ? (performance.now() - clock.startedAt) / 1000 / clock.seconds : 0;
        value = seg * (1 + (tracker?.currentIndex ?? 0) + Math.min(CHALLENGE_SEGMENT_CAP, onClock));
        break;
      }
      case 'challenge_passed':
        value = seg * (2 + (tracker?.currentIndex ?? 0));
        break;
      case 'capturing':
        value =
          seg *
          (1 +
            challengeCount +
            Math.min(CHALLENGE_SEGMENT_CAP, positionStableRef.current / CAPTURE_STABLE_FRAMES));
        break;
      case 'complete':
        value = 1;
        break;
    }
    livenessProgressRef.current = value;
  };

  // Face-continuity guard: consecutive-frame landmark jumps (face center
  // teleporting / face size snapping) are physically impossible for a live
  // face and typical of face swaps or spliced feeds. Three strikes fails. Any
  // jump also drops the selfie chosen so far: it must come from one face.
  // True when the run has just failed.
  const continuityBroken = (landmarks: NormalizedLandmark[]): boolean => {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    if (!nose || !leftEye || !rightEye || cooldownFramesRef.current !== 0) return false;
    const iod = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const prev = prevFaceSigRef.current;
    prevFaceSigRef.current = { x: nose.x, y: nose.y, iod };
    if (!prev || iod <= 0 || prev.iod <= 0) return false;
    const jumped =
      Math.abs(nose.x - prev.x) > 0.18 ||
      Math.abs(nose.y - prev.y) > 0.18 ||
      iod / prev.iod > 1.5 ||
      iod / prev.iod < 0.66;
    if (!jumped) return false;
    selfiesRef.current.clear();
    faceGlitchesRef.current++;
    recordLivenessSignals({ mode: config?.mode ?? 'gestures', faceGlitches: faceGlitchesRef.current });
    if (faceGlitchesRef.current < 3) return false;
    clearChallengeTimer();
    stopRecording();
    setPhase({ phase: 'failed', reason: 'face_swap' });
    return true;
  };

  processLandmarksRef.current = (landmarks: NormalizedLandmark[] | null, faceCount: number) => {
    if (!mountedRef.current) return;
    if (faceRef) {
      const box = faceBoxOf(landmarks);
      faceRef.current = box ? { box, at: Date.now() } : null;
    }
    updateLivenessProgress();

    const tracker = trackerRef.current;
    const phase = phaseRef.current;

    // No face detected
    if (!landmarks) {
      setIsFaceDetected(false);
      if (phase === 'positioning' || phase === 'loading') {
        positionStableRef.current = 0;
      } else if (phase === 'challenge' && tracker?.current?.config.type === 'flash') {
        // Face pulled away DURING the flash — abort after a short grace. The
        // colour flashes can briefly disturb face tracking, so a genuine
        // removal must persist for several frames before we fail it.
        flashNoFaceFramesRef.current++;
        if (flashNoFaceFramesRef.current > 15) {
          flashNoFaceFramesRef.current = 0;
          flashSessionRef.current++; // abort the running flash sequence
          setFlashColor(null);
          clearChallengeTimer();
          stopRecording();
          tracker.markCurrentFailed();
          setChallenges([...tracker.all]);
          setPhase({ phase: 'failed', reason: 'face_lost' });
        }
      } else if (phase === 'capturing') {
        // Face left while waiting to auto-capture — reset progress so we never
        // snap a blank selfie the moment the face reappears. Gone for ~1s, the
        // run is broken: the selfie must come from the same live run as the
        // gestures, not from whatever is held up after a gap.
        positionStableRef.current = 0;
        capturingNoFaceRef.current++;
        if (capturingNoFaceRef.current > 30) {
          selfiesRef.current.clear();
          stopRecording();
          setPhase({ phase: 'failed', reason: 'face_lost' });
        }
      }
      return;
    }
    capturingNoFaceRef.current = 0;

    setIsFaceDetected(true);
    flashNoFaceFramesRef.current = 0;

    // --- Multiple faces: pause and ask for a single face -------------------
    // More than one face is both a quality and a spoofing concern, so we never
    // run detection or auto-capture while a second person is in frame.
    if (faceCount > 1) {
      if (phase === 'loading' || phase === 'positioning') {
        positionStableRef.current = 0;
        setPhase({ phase: 'positioning', guidance: tRef.current('presence.position.multipleFaces') });
      } else if (phase === 'challenge' && tracker?.current) {
        // Pause the challenge timer so a second face can't run out the clock.
        if (!multiFacePausedRef.current) {
          multiFacePausedRef.current = true;
          clearChallengeTimer();
        }
        setPhase({
          phase: 'challenge',
          index: tracker.currentIndex,
          challenge: tracker.current.config,
          timeRemaining: tracker.current.config.timeoutSeconds,
          warning: MULTI_FACE_WARNING,
        });
      } else if (phase === 'capturing') {
        positionStableRef.current = 0;
      }
      return;
    }

    // Offer the frame the loop snapshotted for these landmarks as the selfie.
    let selfieVerdict: SelfieVerdict | null = null;
    if (snapFreshRef.current && (phase === 'challenge' || phase === 'capturing') && analyzedFrameRef.current) {
      selfieVerdict = selfiesRef.current.consider(analyzedFrameRef.current, landmarks);
    }
    snapFreshRef.current = false;

    // Single face again — resume a paused challenge by restarting its timer.
    if (multiFacePausedRef.current) {
      multiFacePausedRef.current = false;
      if (phase === 'challenge' && tracker?.current) {
        cooldownFramesRef.current = 15; // brief grace so the face re-settles
        startChallengeTimer(tracker.current.config.timeoutSeconds);
      }
    }

    // --- Positioning phase: check face is centered and stable ---
    if (phase === 'loading' || phase === 'positioning') {
      // Block starting challenges in poor light — guide the user to fix it.
      const light = lightingGuidance(lightLevelRef.current, tRef.current);
      if (light) {
        readyAtRef.current = null;
        positionStableRef.current = Math.max(0, positionStableRef.current - 5);
        setPhase({ phase: 'positioning', guidance: light });
        return;
      }

      const pos = checkFacePosition(landmarks, tRef.current, positionFrame());

      if (pos.isCentered && pos.isCorrectDistance) {
        positionStableRef.current++;
        if (positionStableRef.current > POSITION_STABLE_FRAMES && tracker) {
          // In place: hold for the ready pause (liveness/ready-pause.ts)
          // before asking for anything.
          const ready = readyPauseStep(readyAtRef.current, performance.now());
          readyAtRef.current = ready.readyAt;
          if (!ready.go) {
            setPhase({ phase: 'positioning', guidance: tRef.current('presence.position.holdStill') });
            return;
          }
          // Core's head directions are on their way: a moment more of the
          // ready pause rather than an order the SDK picked itself.
          if (planGate(planRef.current, performance.now()) === 'wait') {
            setPhase({ phase: 'positioning', guidance: tRef.current('presence.position.holdStill') });
            return;
          }
          // Held still and facing the camera: this is the person at rest.
          restTiltRef.current = headTilt(landmarks);
          // The plan may have replaced the tracker since this frame began.
          const started = trackerRef.current ?? tracker;
          const current = started.current;
          if (current) {
            challengeStartedRef.current = true;
            // Start recording when first challenge begins
            startRecording();
            cooldownFramesRef.current = 15; // ~0.5s grace period
            setPhase({
              phase: 'challenge',
              index: started.currentIndex,
              challenge: current.config,
              timeRemaining: current.config.timeoutSeconds,
            });
            setChallenges([...started.all]);
            startChallengeTimer(current.config.timeoutSeconds);
            maybeStartFlash(); // flash-only mode: the first challenge IS the flash
          }
        } else {
          readyAtRef.current = null;
          setPhase({ phase: 'positioning', guidance: tRef.current('presence.position.holdStill') });
        }
      } else {
        readyAtRef.current = null;
        // Decrease instead of resetting to 0 — brief wobbles don't lose all progress
        positionStableRef.current = Math.max(0, positionStableRef.current - 5);
        setPhase({
          phase: 'positioning',
          guidance: pos.guidance ?? tRef.current('presence.position.placeFace'),
        });
      }
      return;
    }

    // --- Challenge phase: gesture detection + position monitoring ---
    if (phase === 'challenge' && tracker) {
      const current = tracker.current;
      if (!current) return;

      // Flash challenge runs on its own timeline (maybeStartFlash) — no
      // gesture detection, and no position warnings while the overlay covers
      // the screen. The face-continuity guard below is also skipped: the
      // color flashes legitimately disturb the landmark tracking.
      if (current.config.type === 'flash') return;

      if (continuityBroken(landmarks)) return;

      responseWatchRef.current.seen(landmarks, performance.now());
      respondedAtRef.current = responseWatchRef.current.respondedAt;

      // Check if user has moved out of position
      const pos = checkFacePosition(
        landmarks,
        tRef.current,
        positionFrame(
          current.config.type === 'turn' || current.config.type === 'nod' || isDirectionChallenge(current.config.type),
        ),
      );
      if (!pos.isCentered || !pos.isCorrectDistance) {
        holdFramesRef.current = 0; // the hold restarts once the face is back
        setPhase({
          phase: 'challenge',
          index: tracker.currentIndex,
          challenge: current.config,
          timeRemaining: current.config.timeoutSeconds,
          warning: pos.guidance ?? tRef.current('presence.position.comeBack'),
        });
        return;
      }

      // Skip detection during cooldown period (user returning to neutral)
      if (cooldownFramesRef.current > 0) {
        cooldownFramesRef.current--;
        return;
      }

      let detected = false;

      // Detect wrong gestures for red-border feedback
      let wrongGesture = false;
      const expectedType = current.config.type;

      switch (expectedType) {
        case 'nod':
          detected = detectNod(landmarks, nodHistoryRef.current);
          if (!detected) {
            wrongGesture = detectHeadTurn(landmarks) !== 'center' || detectSmile(landmarks);
          }
          break;
        case 'turn':
          detected = detectHeadTurn(landmarks) !== 'center';
          break;
        case 'blink':
          // The EAR mixes a vertical span (normalized by frame height) with a
          // horizontal one (normalized by frame width), so it must be corrected
          // by the frame's aspect ratio — otherwise a portrait phone feed reads
          // ~1.8x lower than a landscape desktop feed and never clears the bar.
          detected = detectBlink(landmarks, blinkStateRef.current, frameAspect());
          if (!detected) {
            wrongGesture = detectSmile(landmarks) || detectHeadTurn(landmarks) !== 'center';
          }
          break;
        case 'smile':
          detected = detectSmile(landmarks);
          if (!detected) {
            wrongGesture = detectHeadTurn(landmarks) !== 'center';
          }
          break;
        case 'hold':
          holdFramesRef.current += 1;
          detected = holdFramesRef.current >= HOLD_FRAMES;
          break;
        case 'turnLeft':
        case 'turnRight':
        case 'lookUp':
        case 'lookDown': {
          // The wrong way is never a failure and never a red warning: it does
          // not count, and after a second of it the narrator shows the way again.
          const way = facing(landmarks, restTiltRef.current ?? headTilt(landmarks));
          if (way === expectedType) {
            wrongWayFramesRef.current = 0;
            directionFramesRef.current += 1;
            detected = directionFramesRef.current >= DIRECTION_HOLD_FRAMES;
          } else {
            directionFramesRef.current = 0;
            if (way === oppositeDirection(expectedType)) {
              wrongWayFramesRef.current += 1;
              if (wrongWayFramesRef.current === WRONG_WAY_FRAMES) setWrongWayCount((n) => n + 1);
            } else {
              wrongWayFramesRef.current = 0;
            }
          }
          if (detected) {
            directionFramesRef.current = 0;
            wrongWayFramesRef.current = 0;
          }
          break;
        }
      }

      if (detected) {
        passCurrentChallenge();
      } else if (wrongGesture) {
        // Flash a warning for wrong gesture
        setPhase({
          phase: 'challenge',
          index: tracker.currentIndex,
          challenge: current.config,
          timeRemaining: current.config.timeoutSeconds,
          warning: 'wrong_gesture',
        });
      } else {
        // Clear any previous warning
        setPhase({
          phase: 'challenge',
          index: tracker.currentIndex,
          challenge: current.config,
          timeRemaining: current.config.timeoutSeconds,
        });
      }
    }

    // --- Capturing phase: wait for steady face before taking selfie ---
    if (phase === 'capturing') {
      // Don't auto-capture the selfie while lighting is poor.
      const light = lightingGuidance(lightLevelRef.current, tRef.current);
      if (light) {
        positionStableRef.current = 0;
        setPhase({ phase: 'capturing', guidance: light });
        return;
      }
      if (continuityBroken(landmarks)) return;
      // The best frame so far stands in once the person has had a fair chance
      // to give a better one, rather than holding them on the step.
      if (selfiesRef.current.bestCanvas && performance.now() - capturingSinceRef.current > CAPTURE_WAIT_MS) {
        doCapture();
        return;
      }
      const pos = checkFacePosition(landmarks, tRef.current, positionFrame());
      // A frame counts toward the shutter only if it could be the selfie:
      // facing the camera, eyes open, close enough for the standard frame.
      const usable = selfieVerdict === 'kept' || selfieVerdict === 'worse';
      if (pos.isCentered && pos.isCorrectDistance && usable) {
        positionStableRef.current++;
        // Need ~15 stable frames (~0.5s) for a clear photo
        if (positionStableRef.current > CAPTURE_STABLE_FRAMES) {
          doCapture();
        } else if (capturingGuidanceRef.current) {
          // Was showing "move closer" etc.; face is good now → back to hold-still.
          capturingGuidanceRef.current = null;
          setPhase({ phase: 'capturing' });
        }
      } else {
        positionStableRef.current = Math.max(0, positionStableRef.current - 3);
        // Surface WHY we're not capturing (too far / off-centre / turned)
        // instead of a silent "hold still" the user can't act on.
        const guidance =
          pos.guidance ??
          (selfieVerdict === 'turned'
            ? tRef.current('presence.position.lookStraight')
            : selfieVerdict === 'far'
              ? tRef.current('presence.position.moveCloser')
              : tRef.current('presence.position.holdStill'));
        if (capturingGuidanceRef.current !== guidance) {
          capturingGuidanceRef.current = guidance;
          setPhase({ phase: 'capturing', guidance });
        }
      }
    }
  };

  // -----------------------------------------------------------------------
  // rAF loop: send frames to Face Mesh
  // -----------------------------------------------------------------------

  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const mesh = faceMeshRef.current;

    if (!video || !mesh || !mountedRef.current) return;
    if (video.readyState < video.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    if (!processingRef.current) {
      processingRef.current = true;
      // While waiting to auto-capture, snapshot the EXACT frame we're about to
      // analyze. doCapture reads this back, so the selfie is the frame whose
      // landmarks confirmed a centered face — not a later, post-latency frame
      // that may already be blank.
      // During the gestures too, every third frame, so the selfie can be
      // chosen from the whole live run (selfie-candidates.ts).
      const phaseNow = phaseRef.current;
      sendCountRef.current++;
      const snapNow =
        phaseNow === 'capturing' ||
        (phaseNow === 'challenge' &&
          trackerRef.current?.current?.config.type !== 'flash' &&
          sendCountRef.current % 3 === 0);
      if (snapNow) drawAnalyzedFrame(video, analyzedFrameRef);
      snapFreshRef.current = snapNow;
      mesh
        .send(video)
        .catch(() => {
          // Frame processing can fail occasionally — skip
        })
        .finally(() => {
          processingRef.current = false;
        });
    }

    rafRef.current = requestAnimationFrame(runDetectionLoop);
  }, [videoRef]);

  // -----------------------------------------------------------------------
  // Initialize Face Mesh immediately on mount / retry.
  // We deliberately do NOT gate this on cameraReady — if primeFaceMesh()
  // already finished, createFaceMesh() returns instantly so the user
  // never sees a face-mesh loading delay when the liveness step opens.
  // The detection loop only starts once BOTH conditions are met:
  //   1. face mesh is loaded  (tracked by faceMeshRef)
  //   2. camera is ready      (tracked by cameraReadyRef)
  // -----------------------------------------------------------------------

  const cameraReadyRef = useRef(false);

  // Starts the detection loop if both face mesh and camera are ready.
  // Guards against double-starts with rafRef.
  const beginDetection = useCallback(() => {
    if (!faceMeshRef.current || !cameraReadyRef.current || !mountedRef.current) return;
    if (rafRef.current !== 0) return; // loop already running
    setPhase({ phase: 'positioning', guidance: tRef.current('presence.position.placeFace') });
    runDetectionLoop();
  }, [runDetectionLoop, setPhase]);

  // Effect A — initialize face mesh as soon as possible (retryCount re-triggers on retry)
  useEffect(() => {
    let cancelled = false;

    initTracker();

    createFaceMesh((landmarks, faceCount) => {
      if (!cancelled) processLandmarksRef.current(landmarks, faceCount);
    })
      .then((handle) => {
        if (cancelled) { handle.close(); return; }
        faceMeshRef.current = handle;
        beginDetection(); // start immediately if camera is already open
      })
      .catch(() => {
        if (!cancelled) setPhase({ phase: 'failed', reason: 'load_error' });
      });

    return () => {
      cancelled = true;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
      faceMeshRef.current?.close();
      faceMeshRef.current = null;
      clearChallengeTimer();
      flashSessionRef.current++; // abort any in-flight flash sequence
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // Effect B — when camera becomes ready, start detection if mesh is already loaded
  useEffect(() => {
    cameraReadyRef.current = cameraReady;
    if (cameraReady) beginDetection();
  }, [cameraReady, beginDetection]);

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Retry
  // -----------------------------------------------------------------------

  const retry = useCallback(() => {
    clearChallengeTimer();
    stopRecording();
    stopSpeaking();
    lastSpokenRef.current = '';
    setVideoBlob(null);
    nodHistoryRef.current = [];
    holdFramesRef.current = 0;
    blinkStateRef.current = createBlinkState();
    positionStableRef.current = 0;
    processingRef.current = false;
    cooldownFramesRef.current = 0;
    multiFacePausedRef.current = false;
    // Abort any in-flight flash sequence and clear the overlay + guards.
    flashSessionRef.current++;
    flashRunningRef.current = false;
    setFlashing(false);
    setFlashColor(null);
    prevFaceSigRef.current = null;
    faceGlitchesRef.current = 0;
    selfiesRef.current.clear();
    snapFreshRef.current = false;

    // Cancel and close any existing FaceMesh instance so the effect re-initialises cleanly
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    faceMeshRef.current?.close();
    faceMeshRef.current = null;

    initTracker();
    setPhase({ phase: 'loading' });
    // Bumping retryCount re-triggers the useEffect that loads FaceMesh
    setRetryCount((c) => c + 1);
  }, [clearChallengeTimer, stopRecording, initTracker, setPhase]);

  return {
    state,
    challenges,
    isFaceDetected,
    videoBlob,
    flashColor,
    flashing,
    retry,
    livenessProgressRef,
    respondedAtRef,
    wrongWayCount,
  };
}

/** The prompts a timeout means the head movement was not seen for. */
const HEAD_MOVES: ReadonlySet<string> = new Set(['turn', 'nod', 'turnLeft', 'turnRight', 'lookUp', 'lookDown']);

/**
 * PURE. A failed liveness attempt in the journey's closed words, or null when
 * it is not an attempt that failed (the camera or the model not loading are
 * recorded elsewhere). A timeout on a head movement is `turn_not_seen`.
 */
export function livenessFailureDetail(
  reason: 'timeout' | 'face_lost' | 'no_camera' | 'load_error' | 'flash_failed' | 'face_swap',
  prompt: string | undefined,
): string | null {
  switch (reason) {
    case 'timeout':
      return prompt && HEAD_MOVES.has(prompt) ? 'turn_not_seen' : 'timeout';
    case 'face_lost':
      return 'no_face';
    case 'face_swap':
      return 'face_changed';
    case 'flash_failed':
      return 'other';
    default:
      return null;
  }
}
