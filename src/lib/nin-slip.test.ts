import { describe, expect, it } from 'vitest';
import { withoutNinBesideSlip } from './nin-slip';

const ids = (...keys: string[]) => keys.map((key) => ({ key }));

describe('NIN and its slip', () => {
  it('offers only the slip when a workflow lists both', () => {
    expect(withoutNinBesideSlip('NG', ids('bvn', 'nin', 'nin-slip'))).toEqual(ids('bvn', 'nin-slip'));
  });

  it('leaves NIN alone without the slip, and other countries alone', () => {
    expect(withoutNinBesideSlip('NG', ids('bvn', 'nin'))).toEqual(ids('bvn', 'nin'));
    expect(withoutNinBesideSlip('GH', ids('nin', 'nin-slip'))).toEqual(ids('nin', 'nin-slip'));
  });
});
