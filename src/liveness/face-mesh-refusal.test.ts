import { describe, expect, it, vi } from 'vitest';

import { refusedFile, watchForRefusedFile, type ResourceEntryLike } from './face-mesh-refusal';

// ---------------------------------------------------------------------------
// MediaPipe only logs a failed model download, so the browser's resource
// timing list is how the SDK sees that a source refused a file.
// ---------------------------------------------------------------------------

const BASE = 'https://api.toden.co/api/v1/assets/face-mesh/0.4.1633559619/';
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';

describe('refusedFile', () => {
  it('names a file the source answered with an HTTP error', () => {
    const entries = [
      { name: `${BASE}face_mesh.js`, responseStatus: 200 },
      { name: `${BASE}face_mesh_solution_packed_assets.data`, responseStatus: 404 },
    ];
    expect(refusedFile(BASE, entries)).toBe(`${BASE}face_mesh_solution_packed_assets.data`);
    expect(refusedFile(BASE, [{ name: `${BASE}face_mesh.binarypb`, responseStatus: 503 }])).toBe(
      `${BASE}face_mesh.binarypb`,
    );
  });

  it('ignores what other sources answered', () => {
    expect(refusedFile(BASE, [{ name: `${CDN}face_mesh.js`, responseStatus: 404 }])).toBeNull();
  });

  it('does not count a download that worked, or one the browser says nothing about', () => {
    const entries: ResourceEntryLike[] = [
      { name: `${BASE}face_mesh_solution_simd_wasm_bin.wasm`, responseStatus: 200 },
      { name: `${BASE}face_mesh_solution_packed_assets.data`, responseStatus: 0 },
      { name: `${BASE}face_mesh.binarypb` },
    ];
    expect(refusedFile(BASE, entries)).toBeNull();
  });

  it("reads an integrator's relative base as the browser reports it", () => {
    vi.stubGlobal('location', { href: 'https://shop.example/buy' });
    try {
      const entries = [{ name: 'https://shop.example/kyc/face-mesh/face_mesh.binarypb', responseStatus: 404 }];
      expect(refusedFile('/kyc/face-mesh/', entries)).toBe(entries[0]!.name);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/** A PerformanceObserver the test feeds entries to. */
function fakeObserver() {
  const made: Array<{ feed: (entries: ResourceEntryLike[]) => void; options?: unknown; disconnected: boolean }> = [];
  class Observer {
    record: (typeof made)[number];
    constructor(callback: (list: { getEntries(): ResourceEntryLike[] }) => void) {
      this.record = { feed: (entries) => callback({ getEntries: () => entries }), disconnected: false };
      made.push(this.record);
    }
    observe(options: unknown) {
      this.record.options = options;
    }
    disconnect() {
      this.record.disconnected = true;
    }
  }
  return { Observer, made };
}

describe('watchForRefusedFile', () => {
  it('reports the first refused file once', () => {
    const { Observer, made } = fakeObserver();
    const onRefused = vi.fn();
    watchForRefusedFile(BASE, onRefused, Observer);

    made[0]!.feed([{ name: `${BASE}face_mesh.js`, responseStatus: 200 }]);
    expect(onRefused).not.toHaveBeenCalled();
    made[0]!.feed([{ name: `${BASE}face_mesh_solution_packed_assets.data`, responseStatus: 500 }]);
    made[0]!.feed([{ name: `${BASE}face_mesh.binarypb`, responseStatus: 404 }]);

    expect(onRefused).toHaveBeenCalledTimes(1);
    expect(onRefused).toHaveBeenCalledWith(`${BASE}face_mesh_solution_packed_assets.data`);
  });

  it('watches only from now, so an earlier attempt cannot fail this one', () => {
    const { Observer, made } = fakeObserver();
    watchForRefusedFile(BASE, vi.fn(), Observer);
    expect(made[0]!.options).toEqual({ type: 'resource', buffered: false });
  });

  it('stops when asked', () => {
    const { Observer, made } = fakeObserver();
    const stop = watchForRefusedFile(BASE, vi.fn(), Observer);
    stop();
    expect(made[0]!.disconnected).toBe(true);
  });

  it('does nothing in a browser with no resource timing', () => {
    const onRefused = vi.fn();
    expect(() => watchForRefusedFile(BASE, onRefused, undefined)()).not.toThrow();
    class Refusing {
      observe() {
        throw new TypeError('resource is not supported');
      }
      disconnect() {}
    }
    expect(() => watchForRefusedFile(BASE, onRefused, Refusing)()).not.toThrow();
    expect(onRefused).not.toHaveBeenCalled();
  });
});
