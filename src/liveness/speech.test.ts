import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ASSETS_URL,
  FakeAudioContext,
  audio,
  fakeServer,
  playedClips,
  type FakeServer,
} from '../__tests__/voice-test-doubles';

type Speech = typeof import('./speech');

class FakeUtterance {
  rate = 1;
  pitch = 1;
  volume = 1;
  lang = '';
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: ((ev: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

function fakeSynth(voices: Array<{ name: string; lang: string }> = []) {
  return {
    speaking: false,
    paused: false,
    onvoiceschanged: null as unknown,
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
  };
}

let synth: ReturnType<typeof fakeSynth>;
let server: FakeServer;
let current: Speech | null = null;

/** The texts handed to the device voice (the priming utterance aside). */
const deviceSpoken = () =>
  synth.speak.mock.calls.map(([u]) => (u as FakeUtterance).text).filter((text) => text !== '');

/** A fresh speech module (and clip player), as on a new page. */
async function freshSpeech(voices?: Array<{ name: string; lang: string }>): Promise<Speech> {
  synth = fakeSynth(voices);
  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.resetModules();
  current = await import('./speech');
  return current;
}

/** Configure a voice, open the liveness step and wait for every clip to load. */
async function withLoadedVoice(speech: Speech, option = { voice: 'lyra' }): Promise<void> {
  speech.configureSpeech(option);
  speech.primeSpeech();
  speech.prepareVoiceClips(ASSETS_URL);
  await vi.waitFor(() => expect(audio.contexts[0]?.decodeAudioData).toHaveBeenCalledTimes(3));
  // The last decode resolves a tick after it is called.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  audio.reset();
  server = fakeServer();
  vi.stubGlobal('fetch', server.fetch);
  vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(() => {
  // A device phrase still waiting on its timer would otherwise speak into the
  // next test's window.
  current?.stopSpeaking();
  current = null;
  vi.unstubAllGlobals();
});

describe('resolveVoiceGuidance', () => {
  it('is on in en-US with no voice when omitted', async () => {
    const { resolveVoiceGuidance } = await freshSpeech();
    expect(resolveVoiceGuidance()).toEqual({ enabled: true, language: 'en-US', voice: undefined });
  });

  it('still accepts a bare boolean', async () => {
    const { resolveVoiceGuidance } = await freshSpeech();
    expect(resolveVoiceGuidance(false)).toEqual({ enabled: false, language: 'en-US', voice: undefined });
    expect(resolveVoiceGuidance(true)).toEqual({ enabled: true, language: 'en-US', voice: undefined });
  });

  it('reads the voice from the object form', async () => {
    const { resolveVoiceGuidance } = await freshSpeech();
    expect(resolveVoiceGuidance({ voice: 'lyra', language: 'en-GB' })).toEqual({
      enabled: true,
      language: 'en-GB',
      voice: 'lyra',
    });
  });

  it('treats a blank voice as none', async () => {
    const { resolveVoiceGuidance } = await freshSpeech();
    expect(resolveVoiceGuidance({ voice: '  ' }).voice).toBeUndefined();
  });
});

describe('speak with a Toden voice', () => {
  it('unlocks audio on any tap on the page, not only the liveness buttons', async () => {
    const page = new EventTarget();
    vi.stubGlobal('document', page);
    const speech = await freshSpeech();
    speech.configureSpeech({ voice: 'lyra' });
    // No primeSpeech(): the flow reached the camera without the Start button.
    speech.prepareVoiceClips(ASSETS_URL);
    await vi.waitFor(() => expect(audio.contexts[0]?.decodeAudioData).toHaveBeenCalledTimes(3));
    await new Promise((resolve) => setTimeout(resolve, 0));
    audio.contexts[0]!.state = 'suspended';

    speech.speak('Nod your head');
    expect(playedClips()).toHaveLength(0);
    // A new step: whatever the device voice was saying is dropped.
    speech.stopSpeaking();

    page.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(audio.contexts[0]!.state).toBe('running');
    speech.speak('Hold still');
    expect(playedClips()).toHaveLength(1);
  });

  it('plays the loaded clip and leaves the device voice silent', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Nod your head');

    expect(playedClips()).toHaveLength(1);
    expect(synth.cancel).toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(deviceSpoken()).toEqual([]);
  });

  it('falls back to the device voice for a phrase with no clip', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Wrong gesture');

    expect(playedClips()).toHaveLength(0);
    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Wrong gesture']));
  });

  it("falls back to the device voice for a workflow's own wording", async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Please give us a nod');

    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Please give us a nod']));
  });

  it('starts loading the voice as soon as the server is known, before the liveness step', async () => {
    const speech = await freshSpeech();
    // The flow's config provider hands over the server; the root sets the voice.
    speech.prepareVoiceClips(ASSETS_URL);
    expect(server.fetch).not.toHaveBeenCalled();
    speech.configureSpeech({ voice: 'lyra' });
    await vi.waitFor(() => expect(server.urls()).toContain(`${ASSETS_URL}/manifest.json`));
  });

  it('waits for a clip still loading, and says it in the Toden voice, not the device voice', async () => {
    let release!: () => void;
    server = fakeServer({ holdClips: new Promise<void>((resolve) => (release = resolve)) });
    vi.stubGlobal('fetch', server.fetch);
    const speech = await freshSpeech();
    speech.configureSpeech({ voice: 'lyra' });
    speech.primeSpeech();
    speech.prepareVoiceClips(ASSETS_URL);

    speech.speak('Nod your head');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(deviceSpoken()).toEqual([]);
    expect(playedClips()).toHaveLength(0);

    release();
    await vi.waitFor(() => expect(playedClips()).toHaveLength(1));
    expect(deviceSpoken()).toEqual([]);
  });

  it('gives up on a slow clip after the grace and uses the device voice', async () => {
    server = fakeServer({ holdClips: new Promise<void>(() => undefined) });
    vi.stubGlobal('fetch', server.fetch);
    const speech = await freshSpeech();
    speech.setClipGraceMs(50);
    speech.configureSpeech({ voice: 'lyra' });
    speech.primeSpeech();
    speech.prepareVoiceClips(ASSETS_URL);

    speech.speak('Nod your head');

    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
    expect(playedClips()).toHaveLength(0);
  });

  it('never waits without a Toden voice, or for a phrase with no clip once the manifest is in', async () => {
    let release!: () => void;
    server = fakeServer({ holdClips: new Promise<void>((resolve) => (release = resolve)) });
    vi.stubGlobal('fetch', server.fetch);
    const plain = await freshSpeech();
    plain.configureSpeech({ enabled: true });
    plain.prepareVoiceClips(ASSETS_URL);
    plain.speak('Nod your head');
    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
    plain.stopSpeaking();

    const speech = await freshSpeech();
    speech.configureSpeech({ voice: 'lyra' });
    speech.primeSpeech();
    speech.prepareVoiceClips(ASSETS_URL);
    await vi.waitFor(() => expect(audio.contexts.at(-1)?.decodeAudioData).toBeDefined());
    await vi.waitFor(() => expect(server.urls().some((u) => u.endsWith('.mp3'))).toBe(true));
    speech.speak('Look at the camera');
    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Look at the camera']));
    release();
  });

  it('falls back to the device voice when playback throws', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);
    vi.spyOn(audio.contexts[0], 'createBufferSource').mockImplementation(() => {
      throw new Error('InvalidStateError');
    });

    speech.speak('Nod your head');

    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
  });

  it('uses the device voice when the manifest answers 404', async () => {
    server = fakeServer({ manifestStatus: 404 });
    vi.stubGlobal('fetch', server.fetch);
    const speech = await freshSpeech();
    speech.configureSpeech({ voice: 'lyra' });
    speech.primeSpeech();
    speech.prepareVoiceClips(ASSETS_URL);
    await vi.waitFor(() => expect(server.fetch).toHaveBeenCalledTimes(1));

    speech.speak('Nod your head');

    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
    expect(server.urls()).toEqual([`${ASSETS_URL}/manifest.json`]);
  });

  it('lets the phrase being said finish, then says the next after a short pause', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Nod your head');
    speech.speak('Hold still');

    expect(playedClips()).toHaveLength(1);
    expect(playedClips()[0].stop).not.toHaveBeenCalled();
    playedClips()[0].onended?.();
    expect(playedClips()).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, speech.PAUSE_BETWEEN_PHRASES_MS + 100));
    expect(playedClips()).toHaveLength(2);
  });

  it('leaves a breath between two prompts, not a quarter of a second', async () => {
    const speech = await freshSpeech();
    expect(speech.PAUSE_BETWEEN_PHRASES_MS).toBeGreaterThanOrEqual(600);
    expect(speech.PAUSE_BETWEEN_PHRASES_MS).toBeLessThanOrEqual(1000);
  });

  it('says only the newest of the phrases that queued up meanwhile', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Nod your head');
    speech.speak('Hold still');
    speech.speak('Wrong gesture');
    playedClips()[0].onended?.();
    // The pause, then the device voice's own short start-up.
    await new Promise((resolve) => setTimeout(resolve, speech.PAUSE_BETWEEN_PHRASES_MS + 400));

    expect(playedClips()).toHaveLength(1);
    expect(deviceSpoken()).toEqual(['Wrong gesture']);
  });

  it('a device phrase waits for the clip being said too', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Nod your head');
    speech.speak('Wrong gesture');
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(playedClips()[0].stop).not.toHaveBeenCalled();
    expect(deviceSpoken()).toEqual([]);
  });

  it('forgets the waiting phrase when speech is stopped', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.speak('Nod your head');
    speech.speak('Hold still');
    speech.stopSpeaking();
    playedClips()[0].onended?.();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(playedClips()).toHaveLength(1);
  });

  it('stopSpeaking stops the clip too', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);
    speech.speak('Nod your head');

    speech.stopSpeaking();

    expect(playedClips()[0].stop).toHaveBeenCalled();
  });

  it('switching voice off drops the loaded clips', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.configureSpeech({ enabled: true });
    speech.speak('Nod your head');

    expect(playedClips()).toHaveLength(0);
    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
  });

  it('says nothing at all with guidance off', async () => {
    const speech = await freshSpeech();
    await withLoadedVoice(speech);

    speech.configureSpeech({ enabled: false, voice: 'lyra' });
    speech.speak('Nod your head');

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(playedClips()).toHaveLength(0);
    expect(deviceSpoken()).toEqual([]);
  });
});

describe('without a Toden voice', () => {
  it.each([[undefined], [true], [{ enabled: true, language: 'en-GB' }]])(
    'never fetches the manifest for %j',
    async (option) => {
      const speech = await freshSpeech();
      speech.configureSpeech(option);
      speech.primeSpeech();
      speech.prepareVoiceClips(ASSETS_URL);
      speech.speak('Nod your head');

      await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
      expect(server.fetch).not.toHaveBeenCalled();
      expect(audio.contexts).toHaveLength(0);
    },
  );
});

describe('the device voice', () => {
  it('prefers a natural-sounding voice in the language, at a natural pitch', async () => {
    const speech = await freshSpeech([
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Microsoft Libby Online (Natural) - English (United Kingdom)', lang: 'en-GB' },
      { name: 'Google français', lang: 'fr-FR' },
    ]);
    speech.configureSpeech(true);

    speech.speak('Nod your head');

    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
    const utterance = synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance & { voice: { name: string } };
    expect(utterance.voice.name).toContain('Libby Online (Natural)');
    expect(utterance.pitch).toBe(1);
  });

  it('keeps the female pick when no natural voice is installed', async () => {
    const speech = await freshSpeech([
      { name: 'Daniel', lang: 'en-GB' },
      { name: 'Samantha', lang: 'en-US' },
    ]);
    speech.configureSpeech(true);

    speech.speak('Nod your head');

    await vi.waitFor(() => expect(deviceSpoken()).toEqual(['Nod your head']));
    const utterance = synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance & { voice: { name: string } };
    expect(utterance.voice.name).toBe('Samantha');
  });
});
