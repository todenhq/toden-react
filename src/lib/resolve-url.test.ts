import { describe, it, expect } from 'vitest';
import { resolveBaseUrl } from './resolve-url';

describe('resolveBaseUrl', () => {
  it('sends each key to its environment host', () => {
    expect(resolveBaseUrl('pk_test_abc')).toBe('https://sandbox-api.toden.co');
    expect(resolveBaseUrl('sk_test_abc')).toBe('https://sandbox-api.toden.co');
    expect(resolveBaseUrl('pk_live_abc')).toBe('https://api.toden.co');
  });

  it('uses devUrl only for development keys', () => {
    expect(resolveBaseUrl('pk_test_abc', 'http://example.test')).toBe('https://sandbox-api.toden.co');
    expect(resolveBaseUrl('pk_dev_abc', 'http://example.test')).toBe('http://example.test');
    expect(resolveBaseUrl('pk_dev_abc')).toBe('http://localhost:3001');
  });

  it('throws on a key without an environment prefix', () => {
    expect(() => resolveBaseUrl('abc')).toThrow(/Invalid Toden API key/);
  });
});
