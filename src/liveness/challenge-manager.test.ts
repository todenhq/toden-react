import { describe, expect, it } from 'vitest';
import { pickChallenges, pickDirections } from './challenge-manager';

describe('pickChallenges', () => {
  it('always includes a head turn in 3D Active Motion, never beside a nod', () => {
    for (let i = 0; i < 200; i += 1) {
      const types = pickChallenges({ mode: 'gestures' }).map((c) => c.type);
      expect(types).toContain('turn');
      expect(types).not.toContain('nod');
      expect(new Set(types).size).toBe(types.length);
      expect(types).toHaveLength(2);
    }
  });

  it('keeps the order random: the turn is not always first', () => {
    const firsts = new Set(Array.from({ length: 200 }, () => pickChallenges({ mode: 'gestures' })[0]!.type));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('runs the gestures then the flash in Dual Check', () => {
    const types = pickChallenges({ mode: 'both' }).map((c) => c.type);
    expect(types).toContain('turn');
    expect(types.at(-1)).toBe('flash');
  });

  it('asks only for the flash in 3D Flash Check, and only for a hold in Passive Liveness', () => {
    expect(pickChallenges({ mode: 'flash' }).map((c) => c.type)).toEqual(['flash']);
    expect(pickChallenges({ mode: 'passive' }).map((c) => c.type)).toEqual(['hold']);
  });
});

describe('pickChallenges, head directions', () => {
  const pick = (directionCount?: number) =>
    pickChallenges({ mode: 'gestures', gestureSet: 'directions', directionCount }).map((c) => c.type);
  const turns = (types: string[]) => types.filter((t) => t === 'turnLeft' || t === 'turnRight');

  it('asks for three directions unless the workflow says otherwise, each once', () => {
    for (let i = 0; i < 100; i += 1) {
      const types = pick();
      expect(types).toHaveLength(3);
      expect(new Set(types).size).toBe(3);
    }
  });

  it('asks for as many as the workflow says, 2 to 4, and 3 for anything outside that', () => {
    for (const count of [2, 3, 4]) expect(pick(count)).toHaveLength(count);
    for (const bad of [1, 5, 2.5, Number.NaN]) expect(pick(bad)).toHaveLength(3);
  });

  it('always includes a head turn, left or right, whatever the count', () => {
    for (const count of [2, 3, 4]) {
      for (let i = 0; i < 300; i += 1) expect(turns(pick(count)).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('turns either way, and the rest vary, so a run cannot be known beforehand', () => {
    const pairs = new Set<string>();
    const turnsSeen = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      const types = pick(2);
      pairs.add([...types].sort().join());
      for (const t of turns(types)) turnsSeen.add(t);
    }
    expect(turnsSeen).toEqual(new Set(['turnLeft', 'turnRight']));
    // The five pairs that hold a turn; up with down is never asked alone.
    expect(pairs.size).toBe(5);
    expect(pairs.has('lookDown,lookUp')).toBe(false);
  });

  it('is decided by the random source alone', () => {
    expect(pickDirections(2, () => 0).map((c) => c.type)).toEqual(pickDirections(2, () => 0).map((c) => c.type));
    expect(pickDirections(4, Math.random).map((c) => c.type).sort()).toEqual(['lookDown', 'lookUp', 'turnLeft', 'turnRight']);
  });

  it('does not ask for them in the same order every time', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 200; i += 1) orders.add(pickChallenges({ mode: 'gestures', gestureSet: 'directions' }).map((c) => c.type).join());
    expect(orders.size).toBeGreaterThan(6);
  });

  it('ends on the flash in Dual Check', () => {
    const types = pickChallenges({ mode: 'both', gestureSet: 'directions' }).map((c) => c.type);
    expect(types).toHaveLength(4);
    expect(turns(types.slice(0, 3)).length).toBeGreaterThanOrEqual(1);
    expect(types[3]).toBe('flash');
  });

  it('leaves the classic set, the flash and the passive check as they were', () => {
    expect(pickChallenges({ mode: 'gestures' }).map((c) => c.type)).not.toContain('turnLeft');
    expect(pickChallenges({ mode: 'gestures', gestureSet: 'classic' }).map((c) => c.type)).toContain('turn');
    expect(pickChallenges({ mode: 'flash', gestureSet: 'directions' }).map((c) => c.type)).toEqual(['flash']);
    expect(pickChallenges({ mode: 'passive', gestureSet: 'directions' }).map((c) => c.type)).toEqual(['hold']);
  });
});
