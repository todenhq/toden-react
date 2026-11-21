import { describe, expect, it } from "vitest";
import type { NormalizedLandmark } from "./types";
import { ResponseWatch } from "./response-watch";

/** A face in the frame: only the points the watch reads are placed. */
function face({
  turn = 0,
  nod = 0,
  smile = 0,
  eyes = 1,
  scale = 1,
} = {}): NormalizedLandmark[] {
  const points: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }));
  const place = (index: number, x: number, y: number): void => {
    points[index] = { x: 0.5 + x * scale, y: 0.5 + y * scale, z: 0 };
  };
  place(234, -0.15, 0); // cheeks
  place(454, 0.15, 0);
  place(10, 0, -0.2); // forehead
  place(152, 0, 0.2); // chin
  place(1, turn * 0.3, 0.02 + nod * 0.4); // nose tip
  place(61, -0.055 - smile * 0.02, 0.09); // mouth corners
  place(291, 0.055 + smile * 0.02, 0.09);
  place(159, -0.07, -0.05 - 0.012 * eyes); // lids
  place(145, -0.07, -0.05 + 0.012 * eyes);
  place(386, 0.07, -0.05 - 0.012 * eyes);
  place(374, 0.07, -0.05 + 0.012 * eyes);
  return points;
}

describe("watching whether the person is responding", () => {
  it("a still face has not responded, however long it is watched", () => {
    const watch = new ResponseWatch();
    for (let frame = 0; frame < 300; frame++) watch.seen(face(), frame * 33);
    expect(watch.respondedAt).toBe(0);
  });

  it.each([
    ["a turn", { turn: 0.3 }],
    ["a nod", { nod: 0.2 }],
    ["a smile", { smile: 1 }],
    ["a blink", { eyes: 0.1 }],
  ])("%s is a response, timed when it was seen", (_, attempt) => {
    const watch = new ResponseWatch();
    watch.seen(face(), 0);
    watch.seen(face(), 33);
    watch.seen(face(attempt), 66);
    expect(watch.respondedAt).toBe(66);
  });

  it("the tracker’s jitter is not a response", () => {
    const watch = new ResponseWatch();
    for (let frame = 0; frame < 120; frame++) {
      const wobble = frame % 2 === 0 ? 0.01 : -0.01;
      watch.seen(
        face({ turn: wobble, nod: wobble / 2, eyes: 1 + wobble * 5 }),
        frame * 33,
      );
    }
    expect(watch.respondedAt).toBe(0);
  });

  it("a face that drifts slowly is re-learnt, not taken for an attempt", () => {
    const watch = new ResponseWatch();
    for (let frame = 0; frame < 400; frame++)
      watch.seen(face({ turn: frame * 0.0008 }), frame * 33);
    expect(watch.respondedAt).toBe(0);
  });

  it("coming back from a gesture is a response too, and holding it is not", () => {
    const watch = new ResponseWatch();
    watch.seen(face(), 0);
    watch.seen(face({ turn: 0.3 }), 100);
    for (let at = 200; at <= 2000; at += 100)
      watch.seen(face({ turn: 0.3 }), at);
    expect(watch.respondedAt).toBe(100);
    watch.seen(face(), 2100);
    expect(watch.respondedAt).toBe(2100);
  });

  it("the same gesture counts the same near the camera and far from it", () => {
    for (const scale of [0.6, 1.8]) {
      const watch = new ResponseWatch();
      watch.seen(face({ scale }), 0);
      watch.seen(face({ scale, smile: 1 }), 50);
      expect(watch.respondedAt).toBe(50);
    }
  });

  it("starts again with nothing known", () => {
    const watch = new ResponseWatch();
    watch.seen(face(), 0);
    watch.seen(face({ nod: 0.2 }), 40);
    watch.reset();
    expect(watch.respondedAt).toBe(0);
    watch.seen(face({ nod: 0.2 }), 80);
    expect(watch.respondedAt).toBe(0);
  });
});
