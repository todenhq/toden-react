import { afterEach, describe, expect, it } from 'vitest';
import { DIRECTION_PLAN_WAIT_MS, parseDirectionPlan, planGate } from './direction-plan';
import { planChallenges } from './challenge-manager';
import { getIntegrityMetadata, recordLivenessSignals, resetIntegritySignals } from '../lib/integrity-signals';

describe('the head directions Core picked', () => {
  it('takes a plan with an id and 2 to 4 distinct directions that include a turn', () => {
    expect(parseDirectionPlan({ planId: 'cm3plan0001', directions: ['lookUp', 'turnLeft', 'lookDown'] })).toEqual({
      planId: 'cm3plan0001',
      prompts: ['lookUp', 'turnLeft', 'lookDown'],
      flash: [],
    });
    // A Core with classic plans names the list `prompts` too.
    expect(parseDirectionPlan({ planId: 'cm3plan0001', prompts: ['turnRight', 'lookUp'], directions: ['turnRight', 'lookUp'] })?.prompts).toEqual(['turnRight', 'lookUp']);
  });

  it('refuses anything else, so a bad answer leaves the SDK to pick its own', () => {
    for (const raw of [
      null,
      { planId: 'cm3plan0001', directions: ['lookUp', 'lookDown'] }, // no turn
      { planId: 'cm3plan0001', directions: ['turnLeft'] }, // one
      { planId: 'cm3plan0001', directions: ['turnLeft', 'turnLeft'] }, // repeated
      { planId: 'cm3plan0001', directions: ['turnLeft', 'nod'] }, // not a direction
      { planId: 'x', directions: ['turnLeft', 'lookUp'] }, // no id
      { directions: ['turnLeft', 'lookUp'] },
    ]) {
      expect(parseDirectionPlan(raw)).toBeNull();
    }
  });

  it('holds the first instruction while the plan is on its way, and no longer than a moment', () => {
    expect(planGate({ status: 'pending', askedAt: 1000 }, 1000 + DIRECTION_PLAN_WAIT_MS - 1)).toBe('wait');
    expect(planGate({ status: 'pending', askedAt: 1000 }, 1000 + DIRECTION_PLAN_WAIT_MS)).toBe('go');
    expect(planGate({ status: 'ready', askedAt: 1000 }, 1001)).toBe('go');
    expect(planGate({ status: 'failed', askedAt: 1000 }, 1001)).toBe('go');
    expect(planGate({ status: 'none', askedAt: 0 }, 1)).toBe('go');
  });

  it('asks for exactly the plan, in its order, with the flash after it in Dual Check', () => {
    expect(planChallenges(['lookDown', 'turnRight']).map((c) => c.type)).toEqual(['lookDown', 'turnRight']);
    expect(planChallenges(['turnLeft', 'lookUp', 'lookDown'], { mode: 'both' }).map((c) => c.type)).toEqual([
      'turnLeft',
      'lookUp',
      'lookDown',
      'flash',
    ]);
  });
});

describe('the classic gestures Core picked', () => {
  const classic = { set: 'classic' as const, count: 2 };

  it('takes 1 to 3 distinct classic gestures, from the pool when the integration narrowed it', () => {
    expect(parseDirectionPlan({ planId: 'cm3plan0002', prompts: ['smile', 'turn'] }, classic)).toEqual({ planId: 'cm3plan0002', prompts: ['smile', 'turn'], flash: [] });
    expect(parseDirectionPlan({ planId: 'cm3plan0002', prompts: ['blink'] }, { ...classic, pool: ['blink'] })?.prompts).toEqual(['blink']);
    expect(parseDirectionPlan({ planId: 'cm3plan0002', prompts: ['smile', 'turn'] }, { ...classic, pool: ['turn', 'blink'] })).toBeNull();
    expect(parseDirectionPlan({ planId: 'cm3plan0002', prompts: ['turnLeft', 'lookUp'] }, classic)).toBeNull();
    expect(parseDirectionPlan({ planId: 'cm3plan0002', prompts: ['turn', 'turn'] }, classic)).toBeNull();
    // And a classic answer is no head-direction plan.
    expect(parseDirectionPlan({ planId: 'cm3plan0002', prompts: ['smile', 'turn'] })).toBeNull();
  });

  it('asks for exactly the classic plan, in its order, with the flash after it in Dual Check', () => {
    expect(planChallenges(['smile', 'turn']).map((c) => c.type)).toEqual(['smile', 'turn']);
    expect(planChallenges(['turn', 'blink'], { mode: 'both' }).map((c) => c.type)).toEqual(['turn', 'blink', 'flash']);
  });
});

describe('the flash colours Core picked', () => {
  const flashOnly = { set: 'none' as const, count: 0, flash: 4 };

  it('takes a flash-only plan: no gestures, the colours asked for', () => {
    expect(parseDirectionPlan({ planId: 'cm3plan0005', prompts: [], flash: ['cyan', 'red', 'blue', 'green'] }, flashOnly)).toEqual({
      planId: 'cm3plan0005',
      prompts: [],
      flash: ['cyan', 'red', 'blue', 'green'],
    });
  });

  it('carries the colours beside the gestures in Dual Check', () => {
    const plan = parseDirectionPlan({ planId: 'cm3plan0006', prompts: ['turnLeft', 'lookUp'], flash: ['red', 'blue', 'green', 'cyan'] }, { set: 'directions', count: 2, flash: 4 });
    expect(plan?.flash).toEqual(['red', 'blue', 'green', 'cyan']);
  });

  it('refuses a plan whose colours did not come back usable, so the SDK picks its own', () => {
    for (const flash of [undefined, ['red'], ['red', 'red', 'blue', 'green'], ['red', 'orange', 'blue', 'green'], ['red', 'blue']]) {
      expect(parseDirectionPlan({ planId: 'cm3plan0007', prompts: [], flash }, flashOnly)).toBeNull();
    }
  });

  it('shows Core\'s colours in its order, from the palette', async () => {
    const { flashSequenceNamed } = await import('./flash-detector');
    expect(flashSequenceNamed(['cyan', 'red'])!.map((c) => c.name)).toEqual(['cyan', 'red']);
    expect(flashSequenceNamed(['cyan', 'orange'])).toBeNull();
  });
});

describe('the plan in the liveness claim', () => {
  afterEach(() => resetIntegritySignals());

  it('names the plan with the directions it asked, and names none when the SDK picked its own', () => {
    recordLivenessSignals({ mode: 'gestures', challenges: ['turnLeft', 'lookUp'], directionPlanId: 'cm3plan0001' });
    expect(JSON.parse(JSON.stringify(getIntegrityMetadata()))).toMatchObject({
      liveness: { challenges: ['turnLeft', 'lookUp'], directionPlanId: 'cm3plan0001' },
    });
    // A retry's own pick, before its plan arrives, names no plan.
    recordLivenessSignals({ mode: 'gestures', challenges: ['turnRight', 'lookDown'], directionPlanId: undefined });
    expect(JSON.parse(JSON.stringify(getIntegrityMetadata())).liveness.directionPlanId).toBeUndefined();
  });
});

describe('the liveness hook and the plan', async () => {
  const { readFileSync } = await import('node:fs');
  const hook = readFileSync(new URL('../hooks/useLiveness.ts', import.meta.url).pathname, 'utf8');

  it('asks once per attempt, ignores an answer for an earlier attempt, and never swaps directions once asking has begun', () => {
    expect(hook).toContain('const attempt = ++planAttemptRef.current;');
    expect(hook).toContain('if (!mountedRef.current || attempt !== planAttemptRef.current) return;');
    expect(hook).toContain('if (!plan || challengeStartedRef.current) {');
  });

  it('asks for a plan on every run: gestures and colours as the method needs, and never the side light', () => {
    expect(hook).toContain("const asksGestures = mode === 'gestures' || mode === 'both';");
    expect(hook).toContain("const showsFlash = mode === 'flash' || mode === 'both';");
    expect(hook).toContain("{ set: 'none', count: 0, flash: flashCount }");
    expect(hook).toContain("{ set: 'classic', count: config?.challengeCount ?? 2, pool: config?.challengePool, flash: flashCount }");
    // The screen's side light was removed (user, 2026-11-19): no plan asks for it, nothing lights it.
    expect(hook).not.toContain('light: true');
    expect(hook).not.toContain('runScreenLight');
  });

  it('shows the colours Core picked, and its own only when no plan came', () => {
    expect(hook).toContain('planned ?? generateFlashSequence(config?.flashSequenceLength)');
  });

  it('holds the first instruction for the plan, then starts on the tracker the plan built', () => {
    expect(hook).toContain("if (planGate(planRef.current, performance.now()) === 'wait') {");
    expect(hook).toContain('const started = trackerRef.current ?? tracker;');
  });
});
