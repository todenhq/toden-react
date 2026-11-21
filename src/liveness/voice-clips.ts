// ---------------------------------------------------------------------------
// Toden voice clips for the spoken liveness prompts
//
// An organisation can pick a Toden voice per workflow. Toden pre-records one
// clip per voice, language and phrase and serves them from the KYC server
// (kyc-core docs/VOICE_GUIDANCE.md is the contract). This module fetches the
// manifest, preloads the chosen voice's clips and plays one when the text to
// speak is exactly a clip's text. Everything else, and every failure, is left
// to the device voice in speech.ts: nothing here throws or makes the flow wait.
//
// Clips are fetched with `fetch` and played through Web Audio rather than an
// <audio> element, so a customer site only needs the server in `connect-src`
// and no new `media-src` directive.
// ---------------------------------------------------------------------------

/** The manifest the KYC server answers at `{assetsUrl}/manifest.json`. */
export interface VoiceManifest {
  /** Changes whenever any clip changes; part of every clip URL. */
  version: string;
  voices: Record<string, { languages: string[] }>;
  /** Language, then phrase key, then the exact text of that clip. */
  phrases: Record<string, Record<string, string>>;
}

/** Which clips to load: the server's voice assets, a voice id and a BCP-47 language. */
export interface VoiceClipSource {
  /** e.g. `https://api.toden.co/api/v1/assets/voices`. */
  assetsUrl: string;
  voice: string;
  language: string;
}

/** The manifest gets this long before the device voice is kept for the session. */
const MANIFEST_TIMEOUT_MS = 3_000;

/**
 * The one normalising rule every Toden SDK uses to match spoken text to a clip:
 * NFKC, lower case, curly apostrophes made straight, every character that is
 * not a letter, a digit, an apostrophe or a space removed, spaces collapsed.
 * So "Hold still…", "Hold still." and "hold still" all match `Hold still`.
 */
export function normalisePhrase(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}' ]/gu, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** The primary subtag of a BCP-47 tag, lower case: `en-US` is `en`. */
export function primaryLanguage(tag: string): string {
  return tag.split(/[-_]/)[0].toLowerCase();
}

/**
 * Normalised text to phrase key for one voice and language, or null when the
 * manifest has no clips for that pair.
 */
export function phraseKeysByText(
  manifest: VoiceManifest,
  voice: string,
  language: string,
): Map<string, string> | null {
  const lang = primaryLanguage(language);
  const phrases = manifest.phrases?.[lang];
  if (!manifest.voices?.[voice]?.languages?.includes(lang) || !phrases) return null;
  const keys = new Map<string, string>();
  for (const [key, text] of Object.entries(phrases)) {
    if (typeof text === 'string') keys.set(normalisePhrase(text), key);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Session state. One set of clips at a time: loading a different voice or
// language drops the old set, and a load still in flight for it is ignored.
// ---------------------------------------------------------------------------

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;
let loadedSource: string | null = null;
let loadGeneration = 0;
let keysByText = new Map<string, string>();
const buffers = new Map<string, AudioBuffer>();
let playing: AudioBufferSourceNode | null = null;
/** A load is in flight for the current set: the manifest or some clips are still coming. */
let loading = false;
/** The current set's manifest has answered, so which texts have a clip is known. */
let manifestKnown = false;
/** Told whenever the current set changes: the manifest answered, a clip landed, the load ended. */
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

function audioContextClass(): AudioContextClass | null {
  const scope = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextClass };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

function ensureContext(): AudioContext | null {
  if (context) return context;
  const AudioContextCtor = audioContextClass();
  if (!AudioContextCtor) return null;
  try {
    context = new AudioContextCtor();
  } catch {
    context = null;
  }
  return context;
}

function ignoreRejection(result: unknown): void {
  if (result && typeof (result as Promise<unknown>).catch === 'function') {
    (result as Promise<unknown>).catch(() => undefined);
  }
}

/**
 * Let clips play. Call it from a user gesture (tap or click): browsers keep an
 * AudioContext silent until a gesture resumes it, and iOS Safari only unlocks
 * output once a sound has started inside one.
 */
export function unlockVoiceAudio(): void {
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    ignoreRejection(ctx.resume());
    const silence = ctx.createBufferSource();
    silence.buffer = ctx.createBuffer(1, 1, 22_050);
    silence.connect(ctx.destination);
    silence.start();
  } catch {
    // An audio stack that refuses leaves every phrase to the device voice.
  }
}

/** Whether clips can play now: an AudioContext exists and a gesture has started it. */
export function isVoiceAudioUnlocked(): boolean {
  return context?.state === 'running';
}

async function fetchManifest(assetsUrl: string): Promise<VoiceManifest | null> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), MANIFEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${assetsUrl}/manifest.json`, { signal: controller?.signal });
    if (!res.ok) return null;
    const manifest = (await res.json()) as VoiceManifest;
    return typeof manifest?.version === 'string' ? manifest : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchClip(url: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function clipUrl(source: VoiceClipSource, version: string, key: string): string {
  const segments = [version, source.voice, primaryLanguage(source.language), `${key}.mp3`];
  return `${source.assetsUrl}/${segments.map(encodeURIComponent).join('/')}`;
}

/**
 * Fetch the manifest and preload every clip of one voice and language, in the
 * background. Asking again for the same source does nothing, so the manifest
 * is fetched once a session. The promise always resolves; callers need not
 * wait on it. A phrase asked for while its clip is still coming waits a moment
 * for it (waitForClip); past that, the device voice speaks it.
 */
export async function loadVoiceClips(source: VoiceClipSource): Promise<void> {
  const sourceId = `${source.assetsUrl}|${source.voice}|${primaryLanguage(source.language)}`;
  if (sourceId === loadedSource) return;
  resetVoiceClips();
  loadedSource = sourceId;
  const generation = loadGeneration;
  loading = true;
  /** The load is over for this set, whatever came of it. */
  const settle = () => {
    if (generation !== loadGeneration) return;
    loading = false;
    notify();
  };

  const manifest = await fetchManifest(source.assetsUrl);
  if (generation !== loadGeneration) return;
  const keys = manifest ? phraseKeysByText(manifest, source.voice, source.language) : null;
  const ctx = keys ? ensureContext() : null;
  if (!manifest || !keys || !ctx) {
    settle();
    return;
  }
  keysByText = keys;
  manifestKnown = true;
  notify();

  await Promise.all(
    [...new Set(keys.values())].map(async (key) => {
      const buffer = await fetchClip(clipUrl(source, manifest.version, key), ctx);
      if (buffer && generation === loadGeneration) {
        buffers.set(key, buffer);
        notify();
      }
    }),
  );
  settle();
}

/**
 * Where the clip for `text` stands: `ready` (loaded), `loading` (a load is in
 * flight and the text has a clip, or the manifest has not answered yet), or
 * `none` (no clip is coming: no load, no clip for the text, or it failed).
 */
export function clipState(text: string): 'ready' | 'loading' | 'none' {
  const key = keysByText.get(normalisePhrase(text));
  if (key && buffers.has(key)) return 'ready';
  if (!loading) return 'none';
  return !manifestKnown || key ? 'loading' : 'none';
}

/**
 * Resolves true once the clip for `text` has loaded, or false as soon as it is
 * clear none is coming, or after `timeoutMs`. Resolves at once when the clip
 * is already loaded or not loading at all.
 */
export function waitForClip(text: string, timeoutMs: number): Promise<boolean> {
  const now = clipState(text);
  if (now !== 'loading') return Promise.resolve(now === 'ready');
  return new Promise((resolve) => {
    const done = (ready: boolean) => {
      clearTimeout(timer);
      listeners.delete(check);
      resolve(ready);
    };
    const check = () => {
      const state = clipState(text);
      if (state !== 'loading') done(state === 'ready');
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    listeners.add(check);
  });
}

/**
 * Play the clip whose text is `text`, stopping the clip already playing, and
 * call `onEnded` when it has played to its end. Returns false, and plays
 * nothing, when there is no loaded clip for the text, audio is not unlocked
 * yet, or playback fails: the caller then uses the device voice for this phrase.
 */
export function playVoiceClip(text: string, onEnded?: () => void): boolean {
  const key = keysByText.get(normalisePhrase(text));
  const buffer = key ? buffers.get(key) : undefined;
  if (!buffer || !context) return false;
  if (context.state !== 'running') {
    try {
      ignoreRejection(context.resume());
    } catch {
      // Nothing more to try; the device voice speaks this one.
    }
    return false;
  }
  try {
    stopVoiceClip();
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);
    // Only a clip that plays to its end reports it: stopVoiceClip() clears
    // `playing` first, so a clip cut off on purpose says nothing.
    node.onended = () => {
      if (playing !== node) return;
      playing = null;
      onEnded?.();
    };
    node.start();
    playing = node;
    return true;
  } catch {
    return false;
  }
}

/** Stop the clip playing, if any. */
export function stopVoiceClip(): void {
  const node = playing;
  playing = null;
  if (!node) return;
  try {
    node.stop();
    node.disconnect();
  } catch {
    // Already ended.
  }
}

/** Drop the loaded clips (a new voice or language, or none). Keeps the unlocked AudioContext. */
export function resetVoiceClips(): void {
  stopVoiceClip();
  loadGeneration += 1;
  loadedSource = null;
  keysByText = new Map();
  buffers.clear();
  loading = false;
  manifestKnown = false;
  notify();
}
