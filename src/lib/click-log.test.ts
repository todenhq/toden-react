import { beforeEach, describe, expect, it } from 'vitest';
import { controlFor, UNNAMED_CONTROL } from './click-log';
import { getStepLog, recordClick, recordStep, resetStepLog } from './step-log';
import { createTextFn } from '../i18n/translate';

// A stand-in element: just enough of the DOM for controlFor (no jsdom here).
function control(opts: { text?: string; aria?: string; action?: string; disabled?: boolean; inSdk?: boolean }) {
  const attrs: Record<string, string | undefined> = { 'aria-label': opts.aria, 'data-toden-action': opts.action };
  const el = {
    textContent: opts.text ?? '',
    getAttribute: (name: string) => attrs[name] ?? null,
    matches: () => opts.disabled === true,
    closest: (selector: string) => (selector === '.verification-root' ? (opts.inSdk === false ? null : {}) : el),
  };
  return el as unknown as EventTarget;
}

const t = createTextFn();

describe('controlFor', () => {
  it('names a control by the catalogue key of its label', () => {
    expect(controlFor(control({ text: '  Continue ' }), t)).toEqual({ control: 'common.continue', label: 'Continue' });
  });

  it('matches the workflow’s own words, and reports the English default', () => {
    const custom = createTextFn({ en: { 'common.continue': 'Carry on' } });
    expect(controlFor(control({ text: 'Carry on' }), custom)).toEqual({ control: 'common.continue', label: 'Continue' });
  });

  it('never records text that is not SDK copy, such as an address in a list', () => {
    expect(controlFor(control({ text: '12 Admiralty Way, Lekki' }), t)).toEqual({ control: UNNAMED_CONTROL, label: '' });
  });

  it('prefers an explicit action key and the accessible name', () => {
    expect(controlFor(control({ action: 'common.continue', text: 'x' }), t)?.control).toBe('common.continue');
    expect(controlFor(control({ aria: 'Continue', text: '' }), t)?.control).toBe('common.continue');
  });

  it('ignores disabled controls and clicks outside the SDK', () => {
    expect(controlFor(control({ text: 'Continue', disabled: true }), t)).toBeNull();
    expect(controlFor(control({ text: 'Continue', inSdk: false }), t)).toBeNull();
    expect(controlFor(null, t)).toBeNull();
  });
});

describe('recordClick', () => {
  beforeEach(() => resetStepLog());

  it('stamps the step the applicant is on and rides the step log', () => {
    recordStep('consent');
    recordClick('common.continue', 'Continue', new Date('2026-11-19T10:00:00Z'));
    expect(getStepLog()?.clicks).toEqual([
      { control: 'common.continue', label: 'Continue', step: 'consent', at: '2026-11-19T10:00:00.000Z' },
    ]);
  });

  it('collapses a double click but keeps a later press', () => {
    recordStep('consent');
    recordClick('common.continue', 'Continue', new Date('2026-11-19T10:00:00.000Z'));
    recordClick('common.continue', 'Continue', new Date('2026-11-19T10:00:00.200Z'));
    recordClick('common.continue', 'Continue', new Date('2026-11-19T10:00:02.000Z'));
    expect(getStepLog()?.clicks).toHaveLength(2);
  });

  it('caps the log at 60 presses', () => {
    recordStep('consent');
    for (let i = 0; i < 80; i++) recordClick(`k${i}`, 'K', new Date(Date.UTC(2026, 10, 19, 10, 0, i)));
    expect(getStepLog()?.clicks).toHaveLength(60);
  });

  it('leaves clicks off when there were none', () => {
    recordStep('consent');
    expect(getStepLog()).not.toHaveProperty('clicks');
  });
});
