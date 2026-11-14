import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyConfiguredTheme } from './apply-theme';

// The theme a flow opens in. Unset follows the applicant's device (decision
// 2026-11-13), never the host page's own dark class.

/** A stand-in element: only the classList calls the helper makes. */
function fakeRoot(initial: string[] = []) {
  const classes = new Set(initial);
  return {
    classList: {
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
      contains: (name: string) => classes.has(name),
    },
  } as unknown as HTMLElement;
}

let deviceDark = false;
const listeners: Array<() => void> = [];

beforeEach(() => {
  deviceDark = false;
  listeners.length = 0;
  vi.stubGlobal('document', { documentElement: fakeRoot() });
  vi.stubGlobal('window', {
    matchMedia: () => ({
      get matches() { return deviceDark; },
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
    }),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('applyConfiguredTheme', () => {
  it('follows the device when no theme is set, even over a dark host page', () => {
    const root = fakeRoot(['dark']);
    const cleanup = applyConfiguredTheme(undefined, root);
    expect(root.classList.contains('dark')).toBe(false);

    deviceDark = true;
    for (const fn of listeners) fn();
    expect(root.classList.contains('dark')).toBe(true);
    expect(cleanup).toBeTypeOf('function');
  });

  it('treats an explicit system the same way', () => {
    deviceDark = true;
    const root = fakeRoot();
    applyConfiguredTheme('system', root);
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('pins light and dark whatever the device says', () => {
    deviceDark = true;
    const light = fakeRoot(['dark']);
    expect(applyConfiguredTheme('light', light)).toBeUndefined();
    expect(light.classList.contains('dark')).toBe(false);

    deviceDark = false;
    const dark = fakeRoot();
    applyConfiguredTheme('dark', dark);
    expect(dark.classList.contains('dark')).toBe(true);
  });

  it('uses the document root when the mount is not isolated', () => {
    deviceDark = true;
    applyConfiguredTheme(undefined);
    expect((document.documentElement as HTMLElement).classList.contains('dark')).toBe(true);
  });
});
