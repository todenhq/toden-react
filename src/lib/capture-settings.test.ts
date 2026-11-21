import { describe, it, expect } from 'vitest';
import { documentCaptureSize, isFrontFacingStream } from './capture-settings';

/** Minimal stand-in for a MediaStream carrying one video track. */
function streamWith(track: {
  facingMode?: string;
  label?: string;
} | null): MediaStream {
  return {
    getVideoTracks: () => (track === null ? [] : [
      {
        label: track.label ?? '',
        getSettings: () => ({ facingMode: track.facingMode }),
      },
    ]),
  } as unknown as MediaStream;
}

describe('isFrontFacingStream', () => {
  it('mirrors when the track reports a user-facing camera', () => {
    expect(isFrontFacingStream(streamWith({ facingMode: 'user' }))).toBe(true);
  });

  it('does not mirror when the track reports an environment camera', () => {
    expect(isFrontFacingStream(streamWith({ facingMode: 'environment' }))).toBe(
      false,
    );
  });

  it('mirrors a desktop webcam, which reports no facingMode at all', () => {
    expect(
      isFrontFacingStream(streamWith({ label: 'FaceTime HD Camera' })),
    ).toBe(true);
  });

  it('does not mirror a rear camera that omits facingMode but says so in its label', () => {
    // The regression this guards: treating an absent facingMode as "front"
    // mirrored rear cameras on every browser that omits it.
    expect(
      isFrontFacingStream(streamWith({ label: 'camera2 0, facing back' })),
    ).toBe(false);
    expect(isFrontFacingStream(streamWith({ label: 'Rear Camera' }))).toBe(
      false,
    );
  });

  it('mirrors a front camera whose label merely mentions a word containing "back"', () => {
    // Word-bounded, so "Backlit" is not read as "back".
    expect(isFrontFacingStream(streamWith({ label: 'Backlit Webcam' }))).toBe(
      true,
    );
  });

  it('does not mirror when there is no stream or no video track', () => {
    expect(isFrontFacingStream(null)).toBe(false);
    expect(isFrontFacingStream(streamWith(null))).toBe(false);
  });

  it('survives a track with no label', () => {
    expect(isFrontFacingStream(streamWith({}))).toBe(true);
  });
});

describe('documentCaptureSize', () => {
  const HIGH = { width: 2560, height: 1440 };
  const STANDARD = { width: 1920, height: 1080 };

  it('asks a capable phone for the larger frame, so the card and its barcode have more pixels', () => {
    expect(documentCaptureSize({ hardwareConcurrency: 8, deviceMemory: 8 })).toEqual(HIGH);
    expect(documentCaptureSize({ hardwareConcurrency: 6, deviceMemory: 4 })).toEqual(HIGH);
  });

  it('keeps a small phone at 1080p: it also records the stream, and a larger frame would stutter', () => {
    expect(documentCaptureSize({ hardwareConcurrency: 4, deviceMemory: 8 })).toEqual(STANDARD);
    expect(documentCaptureSize({ hardwareConcurrency: 8, deviceMemory: 2 })).toEqual(STANDARD);
  });

  it('judges a browser that does not report its memory (Safari) on its cores alone', () => {
    expect(documentCaptureSize({ hardwareConcurrency: 6 })).toEqual(HIGH);
    expect(documentCaptureSize({ hardwareConcurrency: 4 })).toEqual(STANDARD);
  });

  it('stays at 1080p when the browser says nothing about the device', () => {
    expect(documentCaptureSize({})).toEqual(STANDARD);
  });
});
