// The gestures Core picked for one liveness attempt (kyc-core
// docbio/direction-plan.ts): the head directions, and since 2026-11-18 the
// classic gestures too. PURE.
//
// The SDK used to pick the order itself; a modified client could then choose
// its own. Now each attempt asks Core for a plan (POST /liveness/directions),
// asks for exactly those directions in that order, and names the plan in its
// liveness claim (`directionPlanId`), which Core checks at the verification.
// Without a plan (an older Core, or no answer in time) the SDK picks as before
// and names none, which Core records.

import { DIRECTION_CHALLENGES, type LivenessChallenge } from './types';

/** The classic gestures Core may plan. */
const CLASSIC: readonly LivenessChallenge[] = ['nod', 'turn', 'blink', 'smile'];

/** What one attempt asks Core for. */
export interface PlanRequest {
  /** Which gestures: head directions, classic, or none (a flash-only check). */
  set: 'directions' | 'classic' | 'none';
  /** Head directions 2 to 4; classic 2 or 3. */
  count: number;
  /** Classic only: the gestures the integration allows, when it narrowed them. */
  pool?: readonly LivenessChallenge[];
  /** How many flash colours to show (2 to 5), when the check runs a flash: Core picks them. */
  flash?: number;
}

export interface DirectionPlan {
  planId: string;
  /** The gestures to ask, in order; empty for a flash-only check. */
  prompts: LivenessChallenge[];
  /** The flash colours to show, in order; empty when none was asked (or an older Core). */
  flash: string[];
}

/** The colour names every SDK and Core share. */
const FLASH_NAMES: readonly string[] = ['red', 'green', 'blue', 'magenta', 'cyan'];

/** The flash colours of an answer: 2 to 5 distinct known names, or none. */
function flashOf(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > FLASH_NAMES.length) return [];
  if (!raw.every((c) => typeof c === 'string' && FLASH_NAMES.includes(c)) || new Set(raw).size !== raw.length) return [];
  return raw as string[];
}

/** How long the first instruction waits for the plan before the SDK picks its own. */
export const DIRECTION_PLAN_WAIT_MS = 2500;

const TURNS: readonly string[] = ['turnLeft', 'turnRight'];

/**
 * A plan from Core the SDK can use for what it asked, or null. Head
 * directions: 2 to 4 distinct, a turn among them. Classic: 1 to 3 distinct
 * classic gestures, all from the pool when one was given. Reads `prompts`,
 * else `directions` (a Core from before classic plans).
 */
export function parseDirectionPlan(raw: unknown, request: PlanRequest = { set: 'directions', count: 3 }): DirectionPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const { planId, prompts, directions, flash: flashRaw } = raw as { planId?: unknown; prompts?: unknown; directions?: unknown; flash?: unknown };
  const list = Array.isArray(prompts) ? prompts : directions;
  if (typeof planId !== 'string' || !/^[a-z0-9]{8,40}$/i.test(planId)) return null;
  const flash = request.flash != null ? flashOf(flashRaw) : [];
  // A flash that was asked for and did not come back usable: the SDK picks its own.
  if (request.flash != null && flash.length !== request.flash) return null;
  if (request.set === 'none') return { planId, prompts: [], flash };
  if (!Array.isArray(list) || new Set(list).size !== list.length) return null;
  if (request.set === 'classic') {
    const allowed = request.pool && request.pool.length > 0 ? request.pool : CLASSIC;
    if (list.length < 1 || list.length > 3) return null;
    if (!list.every((g) => CLASSIC.includes(g as LivenessChallenge) && allowed.includes(g as LivenessChallenge))) return null;
    return { planId, prompts: list as LivenessChallenge[], flash };
  }
  if (list.length < 2 || list.length > DIRECTION_CHALLENGES.length) return null;
  if (!list.every((d) => (DIRECTION_CHALLENGES as readonly unknown[]).includes(d))) return null;
  if (!list.some((d) => TURNS.includes(d as string))) return null;
  return { planId, prompts: list as LivenessChallenge[], flash };
}

/** What the first instruction does about the plan: wait for it, or go on without it. */
export function planGate(plan: { status: 'none' | 'pending' | 'ready' | 'failed'; askedAt: number }, now: number): 'wait' | 'go' {
  return plan.status === 'pending' && now - plan.askedAt < DIRECTION_PLAN_WAIT_MS ? 'wait' : 'go';
}
