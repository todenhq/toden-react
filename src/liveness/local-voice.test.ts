import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ASSETS_URL, FakeAudioContext, MANIFEST, audio, fakeServer } from '../__tests__/voice-test-doubles';
import { pickVoice, voiceSeedNumber, type VoiceManifest } from './voice-clips';

// "Nigerians get a Nigerian voice, Kenyans get a Kenyan voice" (user,
// 2026-11-21): a workflow's `localVoice` gives the applicant a Toden voice from
// the country of the document they are verifying, chosen from what the
// manifest says about each voice (kyc-core docs/VOICE_GUIDANCE.md).

const voice = (country: string | undefined, gender: 'female' | 'male', extra: object = {}) => ({
  languages: ['en'],
  gender,
  ...(country ? { country } : {}),
  offered: true,
  ...extra,
});

const BOOK: VoiceManifest = {
  ...MANIFEST,
  voices: {
    tolani: voice('NG', 'female'),
    chinedu: voice('NG', 'male'),
    rose: voice('NG', 'female'),
    obinna: voice('NG', 'male'),
    keith: voice('KE', 'male'),
    maryanne: voice('KE', 'female'),
    nakato: voice('UG', 'female'),
    lyra: voice('GB', 'female'),
    marlon: voice(undefined, 'male'),
  },
};

const pick = (choice: 'female' | 'male' | 'any', country: string | null, seed = 'person-1') =>
  pickVoice(BOOK, { voice: 'lyra', language: 'en-US', local: { choice, country, seed } });

describe('a voice from the applicant\'s own country', () => {
  it('gives a Kenyan a Kenyan voice and a Nigerian a Nigerian one, of the gender asked for', () => {
    expect(pick('female', 'KE')).toBe('maryanne');
    expect(pick('male', 'KE')).toBe('keith');
    expect(['tolani', 'rose']).toContain(pick('female', 'NG'));
    expect(['chinedu', 'obinna']).toContain(pick('male', 'NG'));
  });

  it('reads the country however it is written', () => {
    expect(pick('female', 'ke')).toBe('maryanne');
    expect(pick('female', ' KE ')).toBe('maryanne');
  });

  it('keeps one person on one voice, and spreads people across a country\'s voices', () => {
    expect(pick('any', 'NG', 'person-1')).toBe(pick('any', 'NG', 'person-1'));
    const heard = new Set(Array.from({ length: 200 }, (_, n) => pick('any', 'NG', `person-${n}`)));
    expect(heard).toEqual(new Set(['tolani', 'chinedu', 'rose', 'obinna']));
  });

  it('keeps the accent when the country has no voice of that gender', () => {
    // Uganda has one voice, a woman: asked for a man, the applicant still hears a Ugandan.
    expect(pick('male', 'UG')).toBe('nakato');
  });

  it('falls back to the workflow\'s own voice where Toden has none from that country', () => {
    expect(pick('any', 'SN')).toBe('lyra');
    expect(pick('female', 'FR')).toBe('lyra');
  });

  it('uses the workflow\'s own voice until a country is known', () => {
    expect(pick('any', null)).toBe('lyra');
    expect(pickVoice(BOOK, { voice: 'lyra', language: 'en-US' })).toBe('lyra');
  });

  it('leaves the device voice where there is neither a local voice nor one of the workflow\'s own', () => {
    expect(pickVoice(BOOK, { language: 'en-US', local: { choice: 'any', country: 'SN', seed: 'person-1' } })).toBeNull();
    expect(pickVoice(BOOK, { voice: 'nobody', language: 'en-US' })).toBeNull();
  });

  it('never gives a voice that has no clips in the language, or one Toden no longer offers', () => {
    expect(pickVoice(BOOK, { voice: 'lyra', language: 'fr-FR', local: { choice: 'any', country: 'KE', seed: 's' } })).toBeNull();
    const withdrawn: VoiceManifest = { ...BOOK, voices: { ...BOOK.voices, maryanne: voice('KE', 'female', { offered: false }) } };
    expect(pickVoice(withdrawn, { voice: 'lyra', language: 'en', local: { choice: 'female', country: 'KE', seed: 's' } })).toBe('keith');
  });

  it('an accent that is not one country\'s is never anybody\'s local voice', () => {
    for (const country of ['JM', 'TT', 'BB']) expect(pick('male', country)).toBe('lyra');
  });

  it('chooses nothing from a server that does not say whose each voice is', () => {
    // Older Core: `languages` alone. Everyone hears the workflow's own voice, as before.
    expect(pickVoice(MANIFEST, { voice: 'lyra', language: 'en', local: { choice: 'any', country: 'GB', seed: 's' } })).toBe('lyra');
  });

  it('numbers a seed the same way every time, as every Toden SDK does (FNV-1a)', () => {
    expect(voiceSeedNumber('')).toBe(0x811c9dc5);
    expect(voiceSeedNumber('a')).toBe(0xe40c292c);
    expect(voiceSeedNumber('person-1')).toBe(voiceSeedNumber('person-1'));
  });
});

// A country Toden has no voice from may hear a neighbour's, from Toden's own list.
describe('a neighbouring voice', () => {
  const NEAR: VoiceManifest = { ...BOOK, neighbours: { TZ: ['KE', 'UG'], RW: ['UG', 'KE'], BW: ['ZA'] } };
  const near = (choice: 'female' | 'male' | 'any', country: string, neighbours?: boolean) =>
    pickVoice(NEAR, { voice: 'lyra', language: 'en-US', local: { choice, country, seed: 'person-1', neighbours } });

  it('gives a Tanzanian a Kenyan voice rather than the workflow\'s own', () => {
    expect(near('female', 'TZ')).toBe('maryanne');
    expect(near('male', 'TZ')).toBe('keith');
  });

  it('takes the first neighbour that has a voice of the gender asked for', () => {
    // Rwanda's first neighbour, Uganda, has only a woman: a man is found in Kenya.
    expect(near('male', 'RW')).toBe('keith');
    expect(near('female', 'RW')).toBe('nakato');
  });

  it('takes the first neighbour with any voice when none has that gender', () => {
    const womenOnly: VoiceManifest = { ...NEAR, voices: { nakato: BOOK.voices.nakato!, maryanne: BOOK.voices.maryanne!, lyra: BOOK.voices.lyra! } };
    expect(pickVoice(womenOnly, { voice: 'lyra', language: 'en', local: { choice: 'male', country: 'RW', seed: 's' } })).toBe('nakato');
  });

  it('never borrows for a country that has a voice of its own', () => {
    const odd: VoiceManifest = { ...BOOK, neighbours: { KE: ['NG'] } };
    expect(pickVoice(odd, { voice: 'lyra', language: 'en', local: { choice: 'female', country: 'KE', seed: 's' } })).toBe('maryanne');
  });

  it('falls back to the workflow\'s own voice when the neighbour has no voice either, or the list has no entry', () => {
    expect(near('any', 'BW')).toBe('lyra'); // South Africa has no voice in this manifest
    expect(near('any', 'SN')).toBe('lyra');
  });

  it('is switched off per workflow: the workflow\'s own voice then speaks', () => {
    expect(near('female', 'TZ', false)).toBe('lyra');
    expect(near('female', 'TZ', true)).toBe('maryanne');
  });

  it('borrows nothing from a server that has no list', () => {
    expect(pick('female', 'TZ')).toBe('lyra');
  });
});

// "The default should be any voice ... or use an american voice as the last
// fall back" (product owner, 2026-11-21).
describe('an American voice as the last fallback', () => {
  const WITH_US: VoiceManifest = {
    ...BOOK,
    voices: { ...BOOK.voices, elise: voice('US', 'female'), danny: voice('US', 'male') },
    neighbours: { TZ: ['KE', 'UG'] },
    fallbackCountry: 'US',
  };
  const who = (choice: 'female' | 'male' | 'any' | 'off', country: string | null, workflowVoice?: string, seed = 'person-1') =>
    pickVoice(WITH_US, { voice: workflowVoice, language: 'en-US', local: { choice, country, seed } });

  it('speaks to a country with no voice and no neighbour in an American voice, when the workflow names none', () => {
    expect(who('female', 'SN')).toBe('elise');
    expect(who('male', 'SN')).toBe('danny');
    expect(new Set(Array.from({ length: 50 }, (_, n) => who('any', 'SN', undefined, `p-${n}`)))).toEqual(new Set(['danny', 'elise']));
  });

  it('before a country is known, too', () => {
    expect(who('female', null)).toBe('elise');
  });

  it("gives the workflow's own voice before the American one", () => {
    expect(who('any', 'SN', 'lyra')).toBe('lyra');
  });

  it('still gives their own country and its neighbours first', () => {
    expect(who('female', 'KE')).toBe('maryanne');
    expect(who('male', 'TZ')).toBe('keith');
  });

  it('with matching off: the workflow\'s own voice, else an American one, whatever the country', () => {
    expect(who('off', 'KE', 'lyra')).toBe('lyra');
    expect(['danny', 'elise']).toContain(who('off', 'KE'));
  });
});

describe('loading a local voice', () => {
  beforeEach(() => {
    audio.reset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches the clips of the voice chosen for the applicant, not the workflow\'s own', async () => {
    vi.resetModules();
    const clips = await import('./voice-clips');
    const server = fakeServer({ manifest: BOOK });
    vi.stubGlobal('fetch', server.fetch);
    await clips.loadVoiceClips({ assetsUrl: ASSETS_URL, voice: 'lyra', language: 'en-US', local: { choice: 'female', country: 'KE', seed: 's' } });
    const clipUrls = server.urls().filter((url) => url.endsWith('.mp3'));
    expect(clipUrls.length).toBeGreaterThan(0);
    for (const url of clipUrls) expect(url).toContain('/maryanne/en/');
  });

  it('loads again when the country becomes known, and the old voice\'s clips are dropped', async () => {
    vi.resetModules();
    const clips = await import('./voice-clips');
    const server = fakeServer({ manifest: BOOK });
    vi.stubGlobal('fetch', server.fetch);
    const source = { assetsUrl: ASSETS_URL, voice: 'lyra', language: 'en-US' };
    await clips.loadVoiceClips({ ...source, local: { choice: 'male' as const, country: null, seed: 's' } });
    await clips.loadVoiceClips({ ...source, local: { choice: 'male' as const, country: 'KE', seed: 's' } });
    const voicesAsked = server.urls().filter((url) => url.endsWith('.mp3')).map((url) => url.split('/').at(-3));
    expect(new Set(voicesAsked)).toEqual(new Set(['lyra', 'keith']));
    expect(voicesAsked.at(-1)).toBe('keith');
  });
});
