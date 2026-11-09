import { describe, expect, it } from 'vitest';
import { isRetiredIdType } from './retired-id-types';

describe('retired ID types', () => {
  it('names BVN Premium retired, and BVN not', () => {
    expect(isRetiredIdType('NG', 'bvn-premium')).toBe(true);
    expect(isRetiredIdType('ng', 'bvn')).toBe(false);
  });
});
