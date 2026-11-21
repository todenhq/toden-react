import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '../types';
import { L } from './landmarks';
import { LOOK_OFFSET, TURN_OFFSET, facing, headTilt, headTurn, oppositeDirection } from './directions';

/** A face in the camera's own (unmirrored) frame: cheeks 0.4 apart round x 0.5, bridge at y 0.4, chin at 0.7. */
function face(noseX: number, noseY: number): NormalizedLandmark[] {
  const points: NormalizedLandmark[] = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[L.leftCheek] = { x: 0.3, y: 0.5, z: 0 };
  points[L.rightCheek] = { x: 0.7, y: 0.5, z: 0 };
  points[L.noseBase] = { x: 0.5, y: 0.4, z: 0 };
  points[L.chin] = { x: 0.5, y: 0.7, z: 0 };
  points[L.noseTip] = { x: noseX, y: noseY, z: 0 };
  return points;
}
const REST_Y = 0.52; // the tip 40% of the way from the bridge to the chin
const rest = headTilt(face(0.5, REST_Y));

describe('which way the head is facing', () => {
  it('is facing the camera at rest', () => {
    expect(facing(face(0.5, REST_Y), rest)).toBeNull();
  });

  it("reads the person's OWN left and right: their left is the right of the camera's picture", () => {
    expect(headTurn(face(0.6, REST_Y))).toBeGreaterThan(0);
    expect(facing(face(0.6, REST_Y), rest)).toBe('turnLeft');
    expect(facing(face(0.4, REST_Y), rest)).toBe('turnRight');
  });

  it('does not take a slight turn for the gesture', () => {
    const justShort = 0.5 + 0.4 * (TURN_OFFSET - 0.02);
    expect(facing(face(justShort, REST_Y), rest)).toBeNull();
  });

  it('reads up and down from where the nose tip sits against its own rest', () => {
    expect(facing(face(0.5, REST_Y - 0.3 * (LOOK_OFFSET + 0.02)), rest)).toBe('lookUp');
    expect(facing(face(0.5, REST_Y + 0.3 * (LOOK_OFFSET + 0.02)), rest)).toBe('lookDown');
    expect(facing(face(0.5, REST_Y + 0.3 * (LOOK_OFFSET - 0.02)), rest)).toBeNull();
  });

  it('measures against the person, so a long or short nose at rest is not a look', () => {
    const longNose = face(0.5, 0.58);
    expect(facing(longNose, headTilt(longNose))).toBeNull();
  });

  it('takes the larger movement when a turn comes with a slight dip', () => {
    expect(facing(face(0.62, REST_Y + 0.3 * (LOOK_OFFSET + 0.005)), rest)).toBe('turnLeft');
  });

  it('knows the wrong way for each direction', () => {
    expect(oppositeDirection('turnLeft')).toBe('turnRight');
    expect(oppositeDirection('lookUp')).toBe('lookDown');
  });
});
