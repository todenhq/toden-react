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
  voices: Record<string, ManifestVoice>;
  /**
   * Whose voices may speak to a country Toden has no voice from, best first
   * (Toden's own list; absent from a server older than it).
   */
  neighbours?: Record<string, string[]>;
  /** The country whose voices speak when nothing nearer does (US); absent from an older server. */
  fallbackCountry?: string;
  /** Language, then phrase key, then the exact text of that clip. */
  phrases: Record<string, Record<string, string>>;
}

/** One voice in the manifest. A server older than local voices sends `languages` alone. */
export interface ManifestVoice {
  languages: string[];
  gender?: 'female' | 'male';
  /** ISO 3166-1 alpha-2; absent where the accent is not one country's. */
  country?: string;
  /** False for a voice Toden no longer offers: playable where named, never chosen for anyone. */
  offered?: boolean;
}

/** Who the prompts are for, and how a voice is matched to them (the workflow's `localVoice`). */
export interface LocalVoiceRequest {
  /** A gender, either, or `off`: their own country and its neighbours are skipped. */
  choice: 'female' | 'male' | 'any' | 'off';
  /** The country of the document being verified, ISO-2; unknown until one is picked. */
  country?: string | null;
  /** The same for one person all session, so their voice does not change part way. */
  seed: string;
  /** A neighbouring country's voice where the applicant's own has none. Default true. */
  neighbours?: boolean;
}

/** Which clips to load: the server's voice assets, a BCP-47 language, and the voice. */
export interface VoiceClipSource {
  /** e.g. `https://api.toden.co/api/v1/assets/voices`. */
  assetsUrl: string;
  /** The workflow's own Toden voice; with `local`, the voice for everyone it has no local voice for. */
  voice?: string;
  language: string;
  local?: LocalVoiceRequest;
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

/** FNV-1a, 32 bit: one person's seed to a number that is the same on every run and every Toden SDK. */
export function voiceSeedNumber(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The voice that speaks for this person (kyc-core docs/VOICE_GUIDANCE.md, "Who
 * speaks, from SDK 4.4.0"), or null for the device's voice. In order:
 *
 *  1. their own country's offered voices with clips in the language, of the
 *     gender asked for, or, when it has none of that gender, any of them (the
 *     accent comes first);
 *  2. a neighbouring country's, from Toden's own list in the manifest: the
 *     first neighbour with a voice of the gender asked for, else the first
 *     with any (the accent is borrowed either way, so the gender decides);
 *  3. the workflow's own `voice`;
 *  4. an American voice (the manifest's `fallbackCountry`), of the gender asked for.
 *
 * `off` skips 1 and 2. Several voices are told apart by the person's seed, so
 * they keep one voice all session. Without `local` only 3 applies (the device
 * voice, never chosen here, is decided by the caller).
 */
export function pickVoice(manifest: VoiceManifest, source: Pick<VoiceClipSource, 'voice' | 'language' | 'local'>): string | null {
  const lang = primaryLanguage(source.language);
  const voices = manifest.voices ?? {};
  const speaks = (id: string) => voices[id]?.languages?.includes(lang) === true;
  const workflowVoice = source.voice && speaks(source.voice) ? source.voice : null;
  const local = source.local;
  if (!local) return workflowVoice;

  const from = (code: string) =>
    Object.keys(voices)
      .filter((id) => voices[id]!.country === code.toUpperCase() && voices[id]!.offered !== false && speaks(id))
      .sort();
  const gender = local.choice === 'off' ? 'any' : local.choice;
  const ofGender = (ids: string[]) => (gender === 'any' ? ids : ids.filter((id) => voices[id]!.gender === gender));
  const preferred = (ids: string[]) => (ofGender(ids).length > 0 ? ofGender(ids) : ids);
  const one = (ids: string[]) => ids[voiceSeedNumber(local.seed) % ids.length]!;

  const country = local.country?.trim().toUpperCase();
  if (local.choice !== 'off' && country) {
    const own = from(country);
    if (own.length > 0) return one(preferred(own));
    if (local.neighbours !== false) {
      const nearby = (manifest.neighbours?.[country] ?? []).map(from);
      const matching = nearby.map(ofGender).find((ids) => ids.length > 0) ?? nearby.find((ids) => ids.length > 0);
      if (matching) return one(matching);
    }
  }
  if (workflowVoice) return workflowVoice;
  const fallback = manifest.fallbackCountry ? from(manifest.fallbackCountry) : [];
  return fallback.length > 0 ? one(preferred(fallback)) : null;
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

function clipUrl(source: VoiceClipSource, voice: string, version: string, key: string): string {
  const segments = [version, voice, primaryLanguage(source.language), `${key}.mp3`];
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
  const local = source.local
    ? `${source.local.choice}:${source.local.country?.toUpperCase() ?? ''}:${source.local.seed}:${source.local.neighbours !== false}`
    : '';
  const sourceId = `${source.assetsUrl}|${source.voice ?? ''}|${primaryLanguage(source.language)}|${local}`;
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
  // Only now is it known who speaks: the manifest says which voices are whose.
  const voice = manifest ? pickVoice(manifest, source) : null;
  const keys = manifest && voice ? phraseKeysByText(manifest, voice, source.language) : null;
  const ctx = keys ? ensureContext() : null;
  if (!manifest || !voice || !keys || !ctx) {
    settle();
    return;
  }
  keysByText = keys;
  manifestKnown = true;
  notify();

  await Promise.all(
    [...new Set(keys.values())].map(async (key) => {
      const buffer = await fetchClip(clipUrl(source, voice, manifest.version, key), ctx);
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
