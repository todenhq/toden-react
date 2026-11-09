import { describe, expect, it } from 'vitest';
import { headPose, isFrontal, mirrorRect, selfieFrame, selfieScore, SELFIE_FACE_SHARE } from './selfie-pick';

// A face looking straight at the camera: eyes level, nose centred between them
// and 60% of the way down to the mouth.
const mesh = (over: Partial<Record<number, { x: number; y: number }>> = {}) => {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const set = (i: number, x: number, y: number) => (points[i] = { x, y, z: 0 });
  set(33, 0.44, 0.4);
  set(263, 0.56, 0.4);
  set(1, 0.5, 0.46);
  set(13, 0.5, 0.49);
  set(14, 0.5, 0.51);
  for (const [i, p] of Object.entries(over)) if (p) set(Number(i), p.x, p.y);
  return points;
};

describe('choosing the selfie', () => {
  it('reads a straight-on face as frontal', () => {
    const pose = headPose(mesh());
    expect(isFrontal(pose)).toBe(true);
    expect(Math.abs(pose!.yaw)).toBeLessThan(0.01);
  });

  it('rejects a head still turned after "turn your head"', () => {
    expect(isFrontal(headPose(mesh({ 1: { x: 0.53, y: 0.46 } })))).toBe(false);
  });

  it('rejects a nod and a tilt', () => {
    expect(isFrontal(headPose(mesh({ 1: { x: 0.5, y: 0.495 } })))).toBe(false);
    expect(isFrontal(headPose(mesh({ 263: { x: 0.56, y: 0.43 } })))).toBe(false);
  });

  it('scores a squarer, sharper frame higher', () => {
    const straight = headPose(mesh())!;
    const turned = headPose(mesh({ 1: { x: 0.505, y: 0.46 } }))!;
    expect(selfieScore(straight, 80)).toBeGreaterThan(selfieScore(turned, 80));
    expect(selfieScore(straight, 100)).toBeGreaterThan(selfieScore(straight, 20));
  });

  it('cuts a 3:4 frame with the face at its set share of the width', () => {
    // A phone's portrait camera.
    const rect = selfieFrame({ x: 0.3, y: 0.3, width: 0.4, height: 0.25 }, 1080, 1920)!;
    expect(rect.width / rect.height).toBeCloseTo(0.75, 2);
    expect((0.4 * 1080) / rect.width).toBeCloseTo(SELFIE_FACE_SHARE, 2);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1920);
  });

  it('on a short landscape camera, the tallest 3:4 frame that fits', () => {
    const rect = selfieFrame({ x: 0.4, y: 0.3, width: 0.2, height: 0.3 }, 1920, 1080)!;
    expect(rect.height).toBe(1080);
    expect(rect.width).toBe(810);
  });

  it('keeps the frame inside the camera, moving it rather than squeezing', () => {
    const rect = selfieFrame({ x: 0.02, y: 0.02, width: 0.2, height: 0.3 }, 1280, 960)!;
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width / rect.height).toBeCloseTo(0.75, 2);
  });

  it('says a face too far away is no selfie, rather than enlarging it', () => {
    expect(selfieFrame({ x: 0.45, y: 0.4, width: 0.08, height: 0.12 }, 1280, 720)).toBeNull();
  });

  it('mirrors the frame for the mirrored still', () => {
    expect(mirrorRect({ x: 100, y: 0, width: 300, height: 400 }, 1000).x).toBe(600);
  });
});
