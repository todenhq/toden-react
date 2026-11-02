import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVideoRecorder, DOCUMENT_AUDIO_BITRATE } from './capture-settings';

const video = { kind: 'video' };
const audio = { kind: 'audio' };
const camera = { getVideoTracks: () => [video] } as unknown as MediaStream;
const mic = { getAudioTracks: () => [audio] } as unknown as MediaStream;

function stubRecorder(opts: { refuseAudio?: boolean; types?: string[] } = {}) {
  const made: Array<{ stream: { tracks: unknown[] }; options: MediaRecorderOptions }> = [];
  class FakeRecorder {
    static isTypeSupported = (type: string) => (opts.types ? opts.types.includes(type) : true);
    constructor(stream: { tracks: unknown[] }, options: MediaRecorderOptions) {
      if (opts.refuseAudio && stream.tracks?.includes(audio)) throw new Error('NotSupportedError');
      made.push({ stream, options });
    }
  }
  class FakeStream {
    constructor(public tracks: unknown[]) {}
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('MediaStream', FakeStream);
  return made;
}

afterEach(() => vi.unstubAllGlobals());

describe('createVideoRecorder with sound', () => {
  it('records the camera alone when there is no microphone', () => {
    const made = stubRecorder();
    expect(createVideoRecorder(camera, 500_000, null)?.mimeType).toBe('video/webm');
    expect(made[0]!.options).toEqual({ mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 500_000 });
  });

  it('mixes the microphone into the recording, never the preview stream', () => {
    const made = stubRecorder();
    createVideoRecorder(camera, 500_000, mic);
    expect(made[0]!.stream.tracks).toEqual([video, audio]);
    expect(made[0]!.options).toMatchObject({
      mimeType: 'video/webm;codecs=vp9,opus',
      audioBitsPerSecond: DOCUMENT_AUDIO_BITRATE,
    });
  });

  it('records in MP4 with sound where that is all the browser has', () => {
    const made = stubRecorder({ types: ['video/mp4'] });
    expect(createVideoRecorder(camera, 500_000, mic)?.mimeType).toBe('video/mp4');
    expect(made[0]!.stream.tracks).toEqual([video, audio]);
  });

  it('falls back to a silent clip when the recorder refuses the sound', () => {
    const made = stubRecorder({ refuseAudio: true });
    expect(createVideoRecorder(camera, 500_000, mic)).not.toBeNull();
    expect(made[0]!.stream).toBe(camera);
  });
});
