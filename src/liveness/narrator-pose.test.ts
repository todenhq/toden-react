import { describe, expect, it } from 'vitest';
import { NARRATOR_REST, NARRATOR_SECONDS, narratorPose, narratorStillPose, type NarratorGesture } from './narrator-pose';

const GESTURES: NarratorGesture[] = ['turn', 'nod', 'blink', 'smile', 'turnLeft', 'turnRight', 'lookUp', 'lookDown'];

/** The pose at every 20th of a second through one pass. */
function pass(gesture: NarratorGesture) {
  const steps = Math.round(NARRATOR_SECONDS[gesture] * 20);
  return Array.from({ length: steps + 1 }, (_, i) => narratorPose(gesture, (i / steps) * NARRATOR_SECONDS[gesture]));
}

describe('the gesture narrator', () => {
  it.each(GESTURES)('%s starts and ends at rest, so it arrives and leaves facing the person', (gesture) => {
    const poses = pass(gesture);
    for (const pose of [poses[0], poses[poses.length - 1]]) {
      expect(pose.across).toBeCloseTo(NARRATOR_REST.across, 3);
      expect(pose.down).toBeCloseTo(NARRATOR_REST.down, 3);
      expect(pose.eyes).toBeCloseTo(NARRATOR_REST.eyes, 3);
      expect(pose.smile).toBeCloseTo(NARRATOR_REST.smile, 3);
      expect(pose.lookX).toBeCloseTo(0, 3);
      expect(pose.lookY).toBeCloseTo(0, 3);
    }
  });

  it('turns fully to one side and then the other', () => {
    const across = pass('turn').map((p) => p.across);
    expect(Math.min(...across)).toBeLessThan(-0.95);
    expect(Math.max(...across)).toBeGreaterThan(0.95);
    expect(across.findIndex((a) => a < -0.95)).toBeLessThan(across.findIndex((a) => a > 0.95));
  });

  it('nods down, then up past the middle', () => {
    const down = pass('nod').map((p) => p.down);
    expect(Math.max(...down)).toBeGreaterThan(0.95);
    expect(Math.min(...down)).toBeLessThan(-0.6);
  });

  it('blinks twice, the eyes fully shut each time', () => {
    const eyes = pass('blink').map((p) => p.eyes);
    let blinks = 0;
    for (let i = 1; i < eyes.length; i++) if (eyes[i] < 0.1 && eyes[i - 1] >= 0.1) blinks++;
    expect(blinks).toBe(2);
    expect(Math.min(...eyes)).toBeLessThan(0.05);
  });

  it('smiles in full, with the eyes narrowing, and the head only drifting', () => {
    const poses = pass('smile');
    expect(Math.max(...poses.map((p) => p.smile))).toBeGreaterThan(0.95);
    expect(Math.min(...poses.map((p) => p.eyes))).toBeLessThan(0.75);
    // The chin lifts a little and the head drifts, but it never reads as a turn or a nod.
    expect(poses.every((p) => Math.abs(p.across) < 0.1 && Math.abs(p.down) < 0.2)).toBe(true);
  });

  it('looks where the head is going, a moment before it gets there', () => {
    const poses = pass('turn');
    const firstLook = poses.findIndex((p) => p.lookX < -0.5);
    const firstTurn = poses.findIndex((p) => p.across < -0.5);
    expect(firstLook).toBeGreaterThan(-1);
    expect(firstLook).toBeLessThan(firstTurn);
    const nod = pass('nod');
    expect(nod.findIndex((p) => p.lookY > 0.5)).toBeLessThan(nod.findIndex((p) => p.down > 0.5));
  });

  it('blinks as it swings through the middle of a turn, and lowers its lids looking down', () => {
    expect(Math.min(...pass('turn').map((p) => p.eyes))).toBeLessThan(0.1);
    const lowest = pass('nod').reduce((a, b) => (b.down > a.down ? b : a));
    expect(lowest.eyes).toBeLessThan(0.8);
  });

  it('goes ONE way for a head direction, toward the screen side the person will turn to, and holds there', () => {
    const left = pass('turnLeft').map((p) => p.across);
    expect(Math.min(...left)).toBeLessThan(-0.95);
    expect(Math.max(...left)).toBeLessThan(0.1);
    expect(left.filter((a) => a < -0.9).length).toBeGreaterThanOrEqual(8); // held for about 0.4 s
    const right = pass('turnRight').map((p) => p.across);
    expect(Math.max(...right)).toBeGreaterThan(0.95);
    expect(Math.min(...right)).toBeGreaterThan(-0.1);
    expect(Math.min(...pass('lookUp').map((p) => p.down))).toBeLessThan(-0.95);
    expect(Math.max(...pass('lookUp').map((p) => p.down))).toBeLessThan(0.1);
    expect(Math.max(...pass('lookDown').map((p) => p.down))).toBeGreaterThan(0.95);
  });

  it.each(GESTURES)('with less motion, %s holds one pose that says it', (gesture) => {
    expect(narratorStillPose(gesture)).not.toEqual(NARRATOR_REST);
  });
});
