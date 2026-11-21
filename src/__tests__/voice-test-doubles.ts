// Test doubles for the Web Audio and fetch surfaces the voice clip player uses.
// Shared by voice-clips.test.ts and speech.test.ts; never imported by the SDK.

import { vi, type Mock } from 'vitest';
import type { VoiceManifest } from '../liveness/voice-clips';

export const ASSETS_URL = 'https://api.toden.co/api/v1/assets/voices';

export const MANIFEST: VoiceManifest = {
  version: '3f9a1c2b',
  voices: { lyra: { languages: ['en'] }, rory: { languages: ['en'] } },
  phrases: {
    en: {
      'presence.challenge.nod': 'Nod your head',
      'presence.position.holdStill': 'Hold still',
      'presence.failed.timeout': "Time's up. Please try again.",
    },
  },
};

export class FakeBufferSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect: Mock<() => void> = vi.fn();
  disconnect: Mock<() => void> = vi.fn();
  start: Mock<() => void> = vi.fn();
  stop: Mock<() => void> = vi.fn();
}

/** Every AudioContext and buffer source the code under test created. */
export const audio = {
  contexts: [] as FakeAudioContext[],
  sources: [] as FakeBufferSource[],
  reset() {
    this.contexts.length = 0;
    this.sources.length = 0;
  },
};

export class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  destination = {};
  resume: Mock<() => Promise<void>> = vi.fn(async () => {
    this.state = 'running';
  });
  createBuffer: Mock<() => { silent: boolean }> = vi.fn(() => ({ silent: true }));
  decodeAudioData: Mock<(data: ArrayBuffer) => Promise<{ decodedFrom: ArrayBuffer }>> = vi.fn(
    async (data: ArrayBuffer) => ({ decodedFrom: data }),
  );

  constructor() {
    audio.contexts.push(this);
  }

  createBufferSource(): FakeBufferSource {
    const source = new FakeBufferSource();
    audio.sources.push(source);
    return source;
  }
}

/** The clip sources started with a decoded clip (not the silent unlock buffer). */
export function playedClips(): FakeBufferSource[] {
  return audio.sources.filter((s) => s.start.mock.calls.length > 0 && !(s.buffer as { silent?: boolean })?.silent);
}

export interface FakeServer {
  fetch: Mock<(url: string) => Promise<unknown>>;
  urls(): string[];
}

/**
 * A fetch that answers the manifest and every clip. `manifestStatus` other than
 * 200 answers the manifest with that status; `missingClips` answer 404; every
 * clip waits for `holdClips` first, when given (a slow connection).
 */
export function fakeServer({
  manifest = MANIFEST,
  manifestStatus = 200,
  missingClips = [] as string[],
  holdClips,
}: { manifest?: VoiceManifest; manifestStatus?: number; missingClips?: string[]; holdClips?: Promise<void> } = {}): FakeServer {
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/manifest.json')) {
      return { ok: manifestStatus === 200, status: manifestStatus, json: async () => manifest };
    }
    if (holdClips) await holdClips;
    const missing = missingClips.some((key) => url.endsWith(`/${key}.mp3`));
    return { ok: !missing, status: missing ? 404 : 200, arrayBuffer: async () => new ArrayBuffer(8) };
  });
  return { fetch, urls: () => fetch.mock.calls.map(([url]) => String(url)) };
}
