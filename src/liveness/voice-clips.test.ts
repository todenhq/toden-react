import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ASSETS_URL,
  FakeAudioContext,
  MANIFEST,
  audio,
  fakeServer,
  playedClips,
} from '../__tests__/voice-test-doubles';
import { normalisePhrase, phraseKeysByText, primaryLanguage } from './voice-clips';

type VoiceClips = typeof import('./voice-clips');

/** A fresh module, so each test starts with no clips loaded and no AudioContext. */
async function freshClips(): Promise<VoiceClips> {
  vi.resetModules();
  return import('./voice-clips');
}

const LYRA = { assetsUrl: ASSETS_URL, voice: 'lyra', language: 'en-US' };

describe('normalisePhrase', () => {
  it.each([
    ['Hold still…', 'hold still'],
    ['Hold still.', 'hold still'],
    ['hold still', 'hold still'],
    ['  Hold \n  still  ', 'hold still'],
    ['Time’s up. Please try again.', "time's up please try again"],
    ['Too bright. Reduce the glare', 'too bright reduce the glare'],
    ['Ｈold still', 'hold still'],
  ])('%j matches %j', (text, expected) => {
    expect(normalisePhrase(text)).toBe(expected);
  });

  it('keeps letters beyond English and digits', () => {
    expect(normalisePhrase('Tournez la tête, 2 fois !')).toBe('tournez la tête 2 fois');
  });
});

describe('primaryLanguage', () => {
  it('is the primary subtag in lower case', () => {
    expect(primaryLanguage('en-US')).toBe('en');
    expect(primaryLanguage('EN_gb')).toBe('en');
    expect(primaryLanguage('fr')).toBe('fr');
  });
});

describe('phraseKeysByText', () => {
  it('maps the normalised text of every clip in the language to its key', () => {
    const keys = phraseKeysByText(MANIFEST, 'lyra', 'en-GB');
    expect(keys?.get('nod your head')).toBe('presence.challenge.nod');
    expect(keys?.get('hold still')).toBe('presence.position.holdStill');
    expect(keys?.get("time's up please try again")).toBe('presence.failed.timeout');
    expect(keys?.size).toBe(3);
  });

  it('is null for a voice the manifest does not hold', () => {
    expect(phraseKeysByText(MANIFEST, 'retired', 'en')).toBeNull();
  });

  it('is null for a language the voice has no clips in', () => {
    expect(phraseKeysByText(MANIFEST, 'lyra', 'fr-FR')).toBeNull();
  });
});

describe('loading and playing clips', () => {
  beforeEach(() => {
    audio.reset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preloads every clip of the voice and language from the manifest's version", async () => {
    const server = fakeServer();
    vi.stubGlobal('fetch', server.fetch);
    const clips = await freshClips();

    await clips.loadVoiceClips(LYRA);

    expect(server.urls()).toEqual(
      expect.arrayContaining([
        `${ASSETS_URL}/manifest.json`,
        `${ASSETS_URL}/3f9a1c2b/lyra/en/presence.challenge.nod.mp3`,
        `${ASSETS_URL}/3f9a1c2b/lyra/en/presence.position.holdStill.mp3`,
        `${ASSETS_URL}/3f9a1c2b/lyra/en/presence.failed.timeout.mp3`,
      ]),
    );
    expect(audio.contexts[0].decodeAudioData).toHaveBeenCalledTimes(3);
  });

  it('plays a loaded clip for the exact text, punctuation aside', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);

    expect(clips.playVoiceClip('Hold still…')).toBe(true);
    expect(playedClips()).toHaveLength(1);
  });

  it('starting a clip stops the one playing', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);

    clips.playVoiceClip('Nod your head');
    clips.playVoiceClip('Hold still');

    const [first, second] = playedClips();
    expect(first.stop).toHaveBeenCalled();
    expect(second.stop).not.toHaveBeenCalled();
  });

  it('plays nothing for text with no clip, or a reworded phrase', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);

    expect(clips.playVoiceClip('Wrong gesture')).toBe(false);
    expect(clips.playVoiceClip('Kindly nod your head')).toBe(false);
    expect(playedClips()).toHaveLength(0);
  });

  it('plays nothing for a clip that did not load', async () => {
    vi.stubGlobal('fetch', fakeServer({ missingClips: ['presence.challenge.nod'] }).fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);

    expect(clips.playVoiceClip('Nod your head')).toBe(false);
    expect(clips.playVoiceClip('Hold still')).toBe(true);
  });

  it('plays nothing before the clips have loaded', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    const loading = clips.loadVoiceClips(LYRA);

    expect(clips.playVoiceClip('Nod your head')).toBe(false);
    await loading;
  });

  it('a manifest 404 (switch off) loads no clips', async () => {
    const server = fakeServer({ manifestStatus: 404 });
    vi.stubGlobal('fetch', server.fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);

    expect(server.urls()).toEqual([`${ASSETS_URL}/manifest.json`]);
    expect(clips.playVoiceClip('Nod your head')).toBe(false);
  });

  it('says where a clip stands while loading, and that none is coming after a 404', async () => {
    let release!: () => void;
    const server = fakeServer({ holdClips: new Promise<void>((resolve) => (release = resolve)) });
    vi.stubGlobal('fetch', server.fetch);
    const clips = await freshClips();
    const loading = clips.loadVoiceClips(LYRA);
    expect(clips.clipState('Nod your head')).toBe('loading');
    await vi.waitFor(() => expect(server.urls().some((u) => u.endsWith('.mp3'))).toBe(true));
    expect(clips.clipState('A phrase with no clip')).toBe('none');
    const ready = clips.waitForClip('Nod your head', 5_000);
    release();
    expect(await ready).toBe(true);
    await loading;
    expect(clips.clipState('Nod your head')).toBe('ready');

    const off = fakeServer({ manifestStatus: 404 });
    vi.stubGlobal('fetch', off.fetch);
    const none = await freshClips();
    const pending = none.waitForClip('Nod your head', 5_000);
    await none.loadVoiceClips(LYRA);
    expect(await pending).toBe(false);
    expect(await none.waitForClip('Nod your head', 5_000)).toBe(false);
  });

  it('stops waiting for a slow clip after the time given', async () => {
    const server = fakeServer({ holdClips: new Promise<void>(() => undefined) });
    vi.stubGlobal('fetch', server.fetch);
    const clips = await freshClips();
    void clips.loadVoiceClips(LYRA);
    expect(await clips.waitForClip('Nod your head', 30)).toBe(false);
  });

  it('a manifest without the voice loads no clips', async () => {
    const server = fakeServer();
    vi.stubGlobal('fetch', server.fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips({ ...LYRA, voice: 'retired' });

    expect(server.urls()).toEqual([`${ASSETS_URL}/manifest.json`]);
  });

  it('a network failure never throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const clips = await freshClips();

    await expect(clips.loadVoiceClips(LYRA)).resolves.toBeUndefined();
    expect(clips.playVoiceClip('Nod your head')).toBe(false);
  });

  it('fetches the manifest once a session for the same voice', async () => {
    const server = fakeServer();
    vi.stubGlobal('fetch', server.fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);
    await clips.loadVoiceClips(LYRA);

    expect(server.urls().filter((url) => url.endsWith('manifest.json'))).toHaveLength(1);
  });

  it('a playback failure reports false so the device voice speaks', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);
    const ctx = audio.contexts[0];
    vi.spyOn(ctx, 'createBufferSource').mockImplementation(() => {
      throw new Error('InvalidStateError');
    });

    expect(clips.playVoiceClip('Nod your head')).toBe(false);
  });

  it('a suspended AudioContext is resumed and the phrase left to the device voice', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);
    const ctx = audio.contexts[0];
    ctx.state = 'suspended';

    expect(clips.playVoiceClip('Nod your head')).toBe(false);
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('unlocking from a gesture resumes the context and starts a silent sound', async () => {
    const clips = await freshClips();
    clips.unlockVoiceAudio();

    const ctx = audio.contexts[0];
    expect(ctx.resume).toHaveBeenCalled();
    expect(audio.sources[0].start).toHaveBeenCalled();
  });

  it('stopVoiceClip stops the clip playing', async () => {
    vi.stubGlobal('fetch', fakeServer().fetch);
    const clips = await freshClips();
    await clips.loadVoiceClips(LYRA);
    clips.playVoiceClip('Nod your head');

    clips.stopVoiceClip();

    expect(playedClips()[0].stop).toHaveBeenCalled();
  });
});
