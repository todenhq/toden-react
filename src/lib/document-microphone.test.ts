import { describe, expect, it, vi } from 'vitest';
import { openMicrophoneSession } from './document-microphone';

const track = () => ({ stop: vi.fn() });
const stream = (...tracks: Array<{ stop: () => void }>) => ({ getTracks: () => tracks }) as unknown as MediaStream;
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('openMicrophoneSession', () => {
  it('hands over the stream once granted', async () => {
    const granted = stream(track());
    const onSettled = vi.fn();
    openMicrophoneSession({ getUserMedia: vi.fn().mockResolvedValue(granted) }, onSettled);
    await flush();
    expect(onSettled).toHaveBeenCalledWith(granted);
  });

  it('asks for sound alone, so a refusal cannot cost the camera', () => {
    const getUserMedia = vi.fn().mockResolvedValue(stream());
    openMicrophoneSession({ getUserMedia }, () => undefined);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
  });

  it('settles with nothing when refused', async () => {
    const onSettled = vi.fn();
    openMicrophoneSession({ getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')) }, onSettled);
    await flush();
    expect(onSettled).toHaveBeenCalledWith(null);
  });

  it('settles with nothing where the browser has no media devices', () => {
    const onSettled = vi.fn();
    openMicrophoneSession(undefined, onSettled);
    expect(onSettled).toHaveBeenCalledWith(null);
  });

  it('stops the microphone when the session closes', async () => {
    const live = track();
    const close = openMicrophoneSession({ getUserMedia: vi.fn().mockResolvedValue(stream(live)) }, () => undefined);
    await flush();
    close();
    expect(live.stop).toHaveBeenCalled();
  });

  it('stops a grant that lands after the camera closed, and reports nothing', async () => {
    const late = track();
    const onSettled = vi.fn();
    let grant: (s: MediaStream) => void = () => undefined;
    const close = openMicrophoneSession(
      { getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { grant = resolve; })) },
      onSettled,
    );
    close();
    grant(stream(late));
    await flush();
    expect(late.stop).toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });
});
