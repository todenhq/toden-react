import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL_STALL_LIMIT_MS, startModel } from './face-mesh-start';

// ---------------------------------------------------------------------------
// When a source is given up. On a slow connection the model's download used to
// be abandoned after 25 seconds while it was still arriving, and the next
// source then failed the same way (reported 2026-11-18). A source is now given
// up only when it fails.
// ---------------------------------------------------------------------------

const BASE = 'https://api.toden.co/api/v1/assets/face-mesh/0.4.1633559619/';

/** A model whose start the test finishes by hand. */
function model() {
  let finish!: (error?: Error) => void;
  const started = new Promise<void>((resolve, reject) => {
    finish = (error) => (error ? reject(error) : resolve());
  });
  return { initialize: vi.fn(() => started), finish };
}

/** A watch the test can make report a refused file. */
function watch() {
  const state = { refuse: (_file: string) => undefined as void, stopped: false, watching: false };
  const fn = vi.fn((_base: string, onRefused: (file: string) => void) => {
    state.watching = true;
    state.refuse = onRefused;
    return () => {
      state.stopped = true;
    };
  });
  return Object.assign(state, { fn });
}

/** How the start ended, read without letting a rejection go unhandled. */
function outcome(start: Promise<void>) {
  const result: { value: 'pending' | 'started' | Error } = { value: 'pending' };
  start.then(
    () => (result.value = 'started'),
    (error: Error) => (result.value = error),
  );
  return result;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('startModel', () => {
  it('waits for a slow source well past the old 25 seconds', async () => {
    const m = model();
    const w = watch();
    const result = outcome(startModel(m, BASE, { watch: w.fn }));

    await vi.advanceTimersByTimeAsync(90_000);
    expect(result.value).toBe('pending');

    m.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(result.value).toBe('started');
    expect(w.stopped).toBe(true);
  });

  it('gives a source up as soon as it refuses one of the files', async () => {
    const m = model();
    const w = watch();
    const result = outcome(startModel(m, BASE, { watch: w.fn }));

    await vi.advanceTimersByTimeAsync(3_000);
    w.refuse(`${BASE}face_mesh_solution_packed_assets.data`);
    await vi.advanceTimersByTimeAsync(0);

    expect(result.value).toBeInstanceOf(Error);
    expect((result.value as Error).message).toContain('face_mesh_solution_packed_assets.data');
    expect(w.stopped).toBe(true);
  });

  it('gives a source up as soon as the start fails', async () => {
    const m = model();
    const result = outcome(startModel(m, BASE, { watch: watch().fn }));

    m.finish(new Error('failed to load wasm binary file'));
    await vi.advanceTimersByTimeAsync(0);

    expect((result.value as Error).message).toBe('failed to load wasm binary file');
  });

  it('gives a source up when nothing has finished by the stall limit', async () => {
    const result = outcome(startModel(model(), BASE, { watch: watch().fn }));

    await vi.advanceTimersByTimeAsync(MODEL_STALL_LIMIT_MS - 1);
    expect(result.value).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);

    expect((result.value as Error).message).toContain('stalled');
  });

  it('allows for a download at about 0.5 Mbps', () => {
    // About 4.6 MB from the server once compressed, plus starting the wasm.
    const seconds = (4.6e6 * 8) / 0.5e6;
    expect(MODEL_STALL_LIMIT_MS).toBeGreaterThan(seconds * 1000);
  });

  it('watches for refusals before asking for any file', () => {
    const m = model();
    const w = watch();
    m.initialize.mockImplementation(() => {
      expect(w.watching).toBe(true);
      return new Promise<void>(() => undefined);
    });
    void startModel(m, BASE, { watch: w.fn });
    expect(m.initialize).toHaveBeenCalledOnce();
  });

  it('settles once, whichever happens first', async () => {
    const m = model();
    const w = watch();
    const result = outcome(startModel(m, BASE, { watch: w.fn }));

    m.finish();
    await vi.advanceTimersByTimeAsync(0);
    w.refuse(`${BASE}face_mesh.binarypb`);
    await vi.advanceTimersByTimeAsync(MODEL_STALL_LIMIT_MS);

    expect(result.value).toBe('started');
  });
});
