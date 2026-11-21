// ---------------------------------------------------------------------------
// Spoken liveness instructions
//
// A Toden voice clip plays when the workflow picked a voice and a clip for the
// exact text is loaded (voice-clips.ts). Everything else is spoken by the
// device's speech engine, preferring a natural-sounding female voice.
//
// Chrome has multiple known bugs with speechSynthesis:
// 1. speak() requires user activation for the first call
// 2. cancel() followed by speak() silently fails
// 3. Synthesis gets stuck in "paused" state after cancel/tab switch
// This module works around all of them.
// ---------------------------------------------------------------------------

import type { VoiceGuidanceOption } from '../types/config';
import {
  clipState,
  isVoiceAudioUnlocked,
  loadVoiceClips,
  playVoiceClip,
  primaryLanguage,
  resetVoiceClips,
  stopVoiceClip,
  unlockVoiceAudio,
  waitForClip,
} from './voice-clips';

let preferredVoice: SpeechSynthesisVoice | null = null;
let voiceResolved = false;
let primed = false;

// ---------------------------------------------------------------------------
// Runtime voice-guidance configuration
//
// Set once per session from the SDK config (see configureSpeech). When disabled,
// speak()/primeSpeech() become no-ops so the liveness flow runs silently. The
// `language` selects the spoken voice/lang and the clip language; `voice` is a
// Toden voice id. The text itself mirrors the on-screen instruction.
// ---------------------------------------------------------------------------

let speechEnabled = true;
let speechLanguage = 'en-US';
/** The workflow's own Toden voice: who speaks when the applicant's country and its neighbours have none. */
let speechVoice: string | undefined;
/** The admin chose the device's own voice (`voice: 'device'`): no Toden voice speaks. */
let speechDeviceVoice = false;
/** How a voice is matched to the applicant's country (the workflow's `localVoice`, default `any`). */
let speechLocalVoice: 'female' | 'male' | 'any' | 'off' = 'any';
/** A neighbouring country's voice where the applicant's own has none. */
let speechLocalNeighbours = true;
/** The country of the document being verified, once the flow knows it (setSpeechApplicant). */
let speechCountry: string | undefined;
/** One per person: the flow's user reference when it has one, else one per page load. */
let speechSeed = Math.random().toString(36).slice(2);
/** The server's voice assets URL, known once the flow's API client exists (VerificationConfigContext). */
let voiceAssetsUrl: string | undefined;

/**
 * Whether Toden clips are wanted: always, from 4.4.0, unless the admin chose
 * the device's voice (product owner, 2026-11-21). A server with no clips, or a
 * phrase without one, still falls back to the device's voice.
 */
const wantsClips = (): boolean => !speechDeviceVoice;

/** The `voice` that means the device's own speech, chosen by the admin. */
export const DEVICE_VOICE_ID = 'device';

export interface ResolvedVoiceGuidance {
  enabled: boolean;
  language: string;
  /** The workflow's own Toden voice, or undefined for none. */
  voice: string | undefined;
  /** The admin chose the device's own voice: no Toden voice speaks. */
  deviceVoice: boolean;
  /** How a voice is matched to the applicant's country; `off` skips their country and its neighbours. */
  localVoice: 'female' | 'male' | 'any' | 'off';
  /** A neighbouring country's voice where their own has none. */
  localVoiceNeighbours: boolean;
}

/** Normalize the public `voiceGuidance` prop (boolean | object | undefined). */
export function resolveVoiceGuidance(option?: VoiceGuidanceOption): ResolvedVoiceGuidance {
  const object = option === undefined || typeof option === 'boolean' ? {} : option;
  const named = typeof object.voice === 'string' && object.voice.trim() ? object.voice.trim() : undefined;
  const deviceVoice = named === DEVICE_VOICE_ID;
  const local = object.localVoice;
  return {
    enabled: typeof option === 'boolean' ? option : object.enabled ?? true,
    language: object.language ?? 'en-US',
    voice: deviceVoice ? undefined : named,
    deviceVoice,
    localVoice: local === 'female' || local === 'male' || local === 'off' ? local : 'any',
    localVoiceNeighbours: object.localVoiceNeighbours !== false,
  };
}

/** Apply the resolved voice-guidance config for the rest of the session. */
export function configureSpeech(option?: VoiceGuidanceOption): void {
  const { enabled, language, voice, deviceVoice, localVoice, localVoiceNeighbours } = resolveVoiceGuidance(option);
  speechEnabled = enabled;
  // A different voice or language drops the clips loaded for the old one.
  const sameVoices =
    voice === speechVoice &&
    deviceVoice === speechDeviceVoice &&
    language === speechLanguage &&
    localVoice === speechLocalVoice &&
    localVoiceNeighbours === speechLocalNeighbours;
  if (!sameVoices) resetVoiceClips();
  speechVoice = voice;
  speechDeviceVoice = deviceVoice;
  speechLocalVoice = localVoice;
  speechLocalNeighbours = localVoiceNeighbours;
  // Changing language invalidates the cached voice pick.
  if (language !== speechLanguage) {
    speechLanguage = language;
    voiceResolved = false;
    preferredVoice = null;
  }
  if (!enabled) stopSpeaking();
  if (enabled && wantsClips()) armGestureUnlock();
  // A voice set while the liveness step is already open loads now.
  loadConfiguredClips();
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown'] as const;
let gestureUnlockArmed = false;

/**
 * Unlock Web Audio on the applicant's next tap or key press anywhere on the
 * page, not only on the liveness step's own buttons. Safari keeps an
 * AudioContext silent until it is started inside a gesture, while the device
 * voice works after any earlier tap, so a flow that reaches the camera without
 * one of those buttons (camera already allowed, primer skipped) would play
 * every prompt with the device voice. Listens until audio is running.
 */
function armGestureUnlock(): void {
  if (gestureUnlockArmed || typeof document === 'undefined') return;
  gestureUnlockArmed = true;
  const onGesture = () => {
    if (!speechEnabled || !wantsClips()) return;
    unlockVoiceAudio();
    if (isVoiceAudioUnlocked()) disarm();
  };
  const disarm = () => {
    for (const type of UNLOCK_EVENTS) document.removeEventListener(type, onGesture, true);
    gestureUnlockArmed = false;
  };
  for (const type of UNLOCK_EVENTS) document.addEventListener(type, onGesture, true);
}

/**
 * Start loading the Toden voice clips, in the background. Called as soon as
 * the flow's API client exists (VerificationConfigContext), so the clips load
 * while the person is still on the earlier steps, and again by the liveness
 * step (harmless: a load for the same voice happens once). Does nothing with
 * the device's voice chosen, with guidance off, or without the server's voice
 * assets URL.
 */
export function prepareVoiceClips(assetsUrl: string | undefined): void {
  if (assetsUrl !== undefined) voiceAssetsUrl = assetsUrl;
  loadConfiguredClips();
}

function loadConfiguredClips(): void {
  if (!speechEnabled || !wantsClips() || voiceAssetsUrl === undefined) return;
  void loadVoiceClips({
    assetsUrl: voiceAssetsUrl,
    voice: speechVoice,
    language: speechLanguage,
    local: {
      choice: speechLocalVoice,
      // With matching off the country changes nothing, so it is left out: a
      // country picked later then loads nothing again.
      country: speechLocalVoice === 'off' ? undefined : speechCountry,
      seed: speechSeed,
      neighbours: speechLocalNeighbours,
    },
  });
}

/**
 * Who the prompts are spoken to: the country of the document being verified
 * (the one picked in the flow, or the one the app passed) and something that
 * names the person for the whole session. The voice is chosen from these
 * (pickVoice). Called by the flow as the country becomes known.
 */
export function setSpeechApplicant(applicant: { country?: string | null; seed?: string | null }): void {
  const country = applicant.country?.trim().toUpperCase() || undefined;
  const seed = applicant.seed?.trim() || speechSeed;
  if (country === speechCountry && seed === speechSeed) return;
  speechCountry = country;
  speechSeed = seed;
  loadConfiguredClips();
}

/** Whether spoken guidance is currently enabled. */
export function isSpeechEnabled(): boolean {
  return speechEnabled;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

/** Names of the better-sounding device voices (Edge "Natural"/"Online", Chrome "Google", Apple "Premium"/"Enhanced"). */
const NATURAL_VOICE_KEYWORDS = ['natural', 'online', 'google', 'premium', 'enhanced'];

function resolveVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;

  const voices = s.getVoices();
  if (voices.length === 0) {
    voiceResolved = false;
    return null;
  }
  if (voiceResolved) return preferredVoice;

  const femaleKeywords = ['female', 'woman', 'samantha', 'karen', 'moira', 'fiona', 'victoria', 'zira', 'hazel'];
  // Prefer voices for the configured language (e.g. 'en', 'fr'); fall back to all.
  const langPrefix = primaryLanguage(speechLanguage);
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  // Within the language, the networked and premium voices sound far less
  // robotic than the default local ones, so they go first.
  const naturalVoices = langVoices.filter((v) => {
    const name = v.name.toLowerCase();
    return NATURAL_VOICE_KEYWORDS.some((kw) => name.includes(kw));
  });
  const candidates =
    naturalVoices.length > 0 ? naturalVoices : langVoices.length > 0 ? langVoices : voices;

  const female = candidates.find((v) => {
    const name = v.name.toLowerCase();
    return femaleKeywords.some((kw) => name.includes(kw));
  });
  if (female) { preferredVoice = female; voiceResolved = true; return female; }

  const googleFemale = candidates.find((v) =>
    v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('female'),
  );
  if (googleFemale) { preferredVoice = googleFemale; voiceResolved = true; return googleFemale; }

  if (candidates.length > 0) { preferredVoice = candidates[0]; voiceResolved = true; return candidates[0]; }

  // Fallback: any voice
  if (voices.length > 0) { preferredVoice = voices[0]; voiceResolved = true; return voices[0]; }

  voiceResolved = true;
  return null;
}

// Eagerly load voices
if (synth()) {
  synth()!.getVoices();
  if (synth()!.onvoiceschanged !== undefined) {
    synth()!.onvoiceschanged = () => { voiceResolved = false; resolveVoice(); };
  }
}

// Chrome resume workaround — periodically resume to prevent stuck state
let resumeInterval: ReturnType<typeof setInterval> | null = null;

function startResumeWorkaround(): void {
  stopResumeWorkaround();
  resumeInterval = setInterval(() => {
    const s = synth();
    if (s && s.speaking && !s.paused) {
      // Intentionally empty — the interval itself keeps Chrome from pausing
    } else if (s && s.paused) {
      s.resume();
    }
  }, 5000);
}

function stopResumeWorkaround(): void {
  if (resumeInterval) {
    clearInterval(resumeInterval);
    resumeInterval = null;
  }
}

let pendingText: string | null = null;
let speakTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Prime speech synthesis — must be called from a user gesture (click/tap).
 * After priming, all subsequent speak() calls work even from async contexts.
 */
export function primeSpeech(): void {
  if (!speechEnabled) return;
  if (wantsClips()) unlockVoiceAudio();
  const s = synth();
  if (!s || primed) return;

  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0;
  utterance.rate = 10;
  s.speak(utterance);
  primed = true;
}

// Turn-taking. A phrase is never cut off mid-word: one that arrives while
// another is being said waits for it to finish, then a short pause, and only the
// NEWEST waiting phrase is said (guidance that changed twice meanwhile skips the
// stale one in between). Cutting the last phrase off for every new one made
// the prompts run into each other ("Hold sti- Turn your head"), which a person
// following them can mistake for one garbled instruction.
//
// The pause is a breath, as between two things a person says to you: at a
// quarter of a second the prompts came back to back ("Hold still" "Turn your
// head" "Good.") and read as rushed, barked commands, though each clip alone
// is calm (user, 2026-11-17).
export const PAUSE_BETWEEN_PHRASES_MS = 700;
/**
 * How long a phrase waits for its Toden clip while the clips are still
 * loading, before the device voice says it. Without it, a slow connection had
 * the first prompt in the device voice and the rest in the Toden voice (user,
 * 2026-11-20). Only a phrase that has a clip on its way waits, and only while
 * audio can play it.
 */
export const CLIP_GRACE_MS = 2_000;
let clipGraceMs = CLIP_GRACE_MS;

/** Tests only: a shorter grace, so a slow clip can be waited out quickly. */
export function setClipGraceMs(ms: number): void {
  clipGraceMs = ms;
}
/** The phrase being said, clip or device voice, until its pause is over. */
let speakingText: string | null = null;
/** The latest phrase waiting for its turn. */
let waitingText: string | null = null;
/** Counts phrases, so a late end event from an earlier one is ignored. */
let turn = 0;
/** The pause after a phrase, or the watchdog that ends a phrase whose end never came. */
let turnTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Speak `text` once the phrase being said has finished: its Toden voice clip
 * when one is loaded, otherwise the device voice.
 */
export function speak(text: string): void {
  if (!speechEnabled) return;
  if (speakingText !== null) {
    waitingText = text === speakingText ? null : text;
    return;
  }
  startPhrase(text);
}

function startPhrase(text: string): void {
  speakingText = text;
  const thisTurn = ++turn;
  if (wantsClips() && isVoiceAudioUnlocked() && clipState(text) === 'loading') {
    // Its clip is on its way: give it a moment rather than say it twice over
    // in two voices. A phrase stopped or replaced meanwhile is dropped.
    void waitForClip(text, clipGraceMs).then(() => {
      if (thisTurn === turn && speakingText === text && speechEnabled) sayPhrase(text, thisTurn);
    });
    return;
  }
  sayPhrase(text, thisTurn);
}

/** Says the phrase now: its loaded Toden clip, else the device voice. */
function sayPhrase(text: string, thisTurn: number): void {
  const finished = () => finishPhrase(thisTurn);
  // An end event that never comes (a Chrome speech bug, a clip the browser
  // dropped) must not silence every prompt after it.
  setTurnTimer(finished, longestPhraseMs(text));
  if (wantsClips() && playVoiceClip(text, finished)) {
    pendingText = null;
    cancelDeviceSpeech();
    return;
  }
  stopVoiceClip();
  speakWithDeviceVoice(text, finished);
}

/** The phrase has been said: pause, then say the one waiting, if any. */
function finishPhrase(ofTurn: number): void {
  if (ofTurn !== turn || speakingText === null) return;
  setTurnTimer(() => {
    speakingText = null;
    const next = waitingText;
    waitingText = null;
    if (next !== null && speechEnabled) startPhrase(next);
  }, PAUSE_BETWEEN_PHRASES_MS);
}

/** PURE. Far longer than any prompt takes to say, at the device voice's slowest. */
function longestPhraseMs(text: string): number {
  return 2_000 + text.length * 120;
}

function setTurnTimer(run: () => void, ms: number): void {
  if (turnTimer) clearTimeout(turnTimer);
  turnTimer = setTimeout(() => {
    turnTimer = null;
    run();
  }, ms);
}

function speakWithDeviceVoice(text: string, finished: () => void): void {
  const s = synth();
  if (!s) {
    finished();
    return;
  }
  pendingText = text;

  // Unstick Chrome
  if (s.paused) s.resume();
  s.cancel();

  // Delay after cancel to avoid Chrome silent-fail bug
  if (speakTimer) clearTimeout(speakTimer);
  speakTimer = setTimeout(() => {
    speakTimer = null;
    const s2 = synth();
    if (!s2 || pendingText !== text) return; // stopped meanwhile

    // Unstick again just in case
    if (s2.paused) s2.resume();

    const voice = resolveVoice();
    const utterance = deviceUtterance(text, voice);
    utterance.onend = () => {
      stopResumeWorkaround();
      finished();
    };
    utterance.onerror = (ev) => {
      stopResumeWorkaround();
      // Retry once on 'interrupted' or 'canceled' — Chrome sometimes fires
      // these spuriously after a cancel() even with the delay.
      const s3 = synth();
      if ((ev.error === 'interrupted' || ev.error === 'canceled') && s3 && pendingText === text) {
        const retry = deviceUtterance(text, voice);
        retry.onend = () => {
          stopResumeWorkaround();
          finished();
        };
        retry.onerror = () => {
          stopResumeWorkaround();
          finished();
        };
        s3.speak(retry);
        startResumeWorkaround();
        return;
      }
      finished();
    };

    s2.speak(utterance);
    startResumeWorkaround();
  }, 150);
}

function deviceUtterance(text: string, voice: SpeechSynthesisVoice | null): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  // The device voice is the fallback where no Toden clip plays. Left alone it
  // is brisk and loud; a touch slower and quieter sits nearer the clips.
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  utterance.lang = speechLanguage;
  if (voice) utterance.voice = voice;
  return utterance;
}

/**
 * Stop any ongoing speech, and forget the phrase waiting for its turn.
 */
export function stopSpeaking(): void {
  if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
  if (turnTimer) { clearTimeout(turnTimer); turnTimer = null; }
  pendingText = null;
  speakingText = null;
  waitingText = null;
  turn += 1;
  stopVoiceClip();
  cancelDeviceSpeech();
}

function cancelDeviceSpeech(): void {
  stopResumeWorkaround();
  const s = synth();
  if (!s) return;
  s.cancel();
}
