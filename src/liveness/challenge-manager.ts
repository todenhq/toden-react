// ---------------------------------------------------------------------------
// Challenge Manager — randomly picks 2-3 challenges, tracks progress
// ---------------------------------------------------------------------------

import {
  CHALLENGE_POOL,
  DIRECTION_POOL,
  FLASH_CHALLENGE,
  HOLD_CHALLENGE,
  type ChallengeConfig,
  type LivenessChallenge,
  type LivenessConfig,
  DEFAULT_LIVENESS_CONFIG,
} from './types';

// ---------------------------------------------------------------------------
// Similarity groups — gestures within a group should not appear together
// because one can accidentally trigger the other.
// ---------------------------------------------------------------------------

const SIMILARITY_GROUPS: LivenessChallenge[][] = [
  ['nod', 'turn'],  // head movement can overlap
];

function areSimilar(a: LivenessChallenge, b: LivenessChallenge): boolean {
  return SIMILARITY_GROUPS.some(
    (group) => group.includes(a) && group.includes(b),
  );
}

// ---------------------------------------------------------------------------
// Pick random challenges — ensures no two similar gestures are selected
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A run asks for this many directions unless the workflow says otherwise. */
export const DEFAULT_DIRECTION_COUNT = 3;

/**
 * PURE given `random`. The directions of a run, `count` of the four (2 to 4,
 * anything else is 3), always with at least one head turn, left or right
 * (user, 2026-11-18). A turn is what tells a head from a flat picture: Core's
 * docbio/head-movement.ts only calls a capture flat when a turn was asked for,
 * and a photo can be tilted up and down but not turned. The rest are picked at
 * random from the other three, so which directions and their order are what a
 * recording made earlier cannot know. Returned in the pool's order; the caller
 * shuffles.
 */
export function pickDirections(count: number = DEFAULT_DIRECTION_COUNT, random: () => number = Math.random): ChallengeConfig[] {
  const n = Number.isInteger(count) && count >= 2 && count <= DIRECTION_POOL.length ? count : DEFAULT_DIRECTION_COUNT;
  const turns = DIRECTION_POOL.filter((c) => c.type === 'turnLeft' || c.type === 'turnRight');
  const turn = turns[Math.floor(random() * turns.length) % turns.length]!;
  const rest = DIRECTION_POOL.filter((c) => c !== turn);
  // A partial Fisher-Yates with the same random source: n - 1 of the other three.
  for (let i = 0; i < n - 1; i++) {
    const j = i + Math.floor(random() * (rest.length - i)) % (rest.length - i);
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  const chosen = new Set([turn, ...rest.slice(0, n - 1)]);
  return DIRECTION_POOL.filter((c) => chosen.has(c));
}

/**
 * The challenges for a plan Core picked (liveness/direction-plan.ts): its
 * gestures (head directions or classic) in its order, with the flash after
 * them in Dual Check.
 */
export function planChallenges(prompts: readonly string[], config: Partial<LivenessConfig> = {}): ChallengeConfig[] {
  const merged = { ...DEFAULT_LIVENESS_CONFIG, ...config };
  const planned = prompts
    .map((type) => DIRECTION_POOL.find((c) => c.type === type) ?? CHALLENGE_POOL.find((c) => c.type === type))
    .filter((c): c is ChallengeConfig => !!c)
    .map((c) => ({ ...c, timeoutSeconds: merged.timeoutPerChallenge }));
  if (merged.mode === 'both') planned.push({ ...FLASH_CHALLENGE });
  return planned;
}

export function pickChallenges(config: Partial<LivenessConfig> = {}): ChallengeConfig[] {
  const merged = { ...DEFAULT_LIVENESS_CONFIG, ...config };

  // Flash-only mode: no gestures — the single flash challenge IS the check.
  if (merged.mode === 'flash') return [{ ...FLASH_CHALLENGE }];
  // Passive: no gestures and no flash — hold still while the clip records.
  if (merged.mode === 'passive') return [{ ...HOLD_CHALLENGE }];

  // Head directions: as many as the workflow asks for, 2 to 4, 3 unless set
  // (user, 2026-11-18), in a shuffled order. Core picks them (useLiveness asks
  // for a plan); this pick stands in only when no plan comes.
  if (merged.gestureSet === 'directions') {
    const directions = shuffle(pickDirections(merged.directionCount)).map((c) => ({ ...c, timeoutSeconds: merged.timeoutPerChallenge }));
    if (merged.mode === 'both') directions.push({ ...FLASH_CHALLENGE });
    return directions;
  }

  // Filter pool if a subset is specified
  let pool = CHALLENGE_POOL;
  if (merged.challengePool && merged.challengePool.length > 0) {
    const allowed = new Set<LivenessChallenge>(merged.challengePool);
    pool = CHALLENGE_POOL.filter((c) => allowed.has(c.type));
  }

  const count = Math.min(merged.challengeCount, pool.length);
  const shuffled = shuffle(pool);

  // 3D Active Motion: a head TURN is always one of the prompts (wherever it
  // falls in the random order), because the server's shape-from-movement test
  // needs one: a turn swings the nose across the face, which a flat picture
  // cannot do. The rest stay random.
  const picked: ChallengeConfig[] = [];
  const turn = shuffled.find((c) => c.type === 'turn');
  if (turn && count > 0) picked.push({ ...turn, timeoutSeconds: merged.timeoutPerChallenge });

  // Greedily pick challenges that aren't similar to already-picked ones
  for (const candidate of shuffled) {
    if (picked.length >= count) break;
    const hasSimilar = picked.some((p) => areSimilar(p.type, candidate.type));
    if (!hasSimilar && !picked.some((p) => p.type === candidate.type)) {
      picked.push({ ...candidate, timeoutSeconds: merged.timeoutPerChallenge });
    }
  }

  // Fallback: if similarity rules were too strict, fill remaining slots
  if (picked.length < count) {
    for (const candidate of shuffled) {
      if (picked.length >= count) break;
      if (!picked.some((p) => p.type === candidate.type)) {
        picked.push({ ...candidate, timeoutSeconds: merged.timeoutPerChallenge });
      }
    }
  }

  // The turn went first to guarantee it; shuffle so its position stays random.
  const ordered = shuffle(picked);
  picked.length = 0;
  picked.push(...ordered);

  // 'both' mode: the flash challenge always runs LAST (after gestures), so the
  // face is settled and the reflection windows are clean.
  if (merged.mode === 'both') picked.push({ ...FLASH_CHALLENGE });

  return picked;
}

/** Gesture challenges to run when a flash-only check could not be measured. */
export function pickFallbackGestures(config: Partial<LivenessConfig> = {}): ChallengeConfig[] {
  return pickChallenges({ ...config, mode: 'gestures' });
}

// ---------------------------------------------------------------------------
// Progress tracker
// ---------------------------------------------------------------------------

export type ChallengeProgress = 'pending' | 'active' | 'passed' | 'failed';

export interface ChallengeEntry {
  config: ChallengeConfig;
  progress: ChallengeProgress;
}

export class ChallengeTracker {
  private entries: ChallengeEntry[];
  private _currentIndex: number;

  constructor(challenges: ChallengeConfig[]) {
    this.entries = challenges.map((config, i) => ({
      config,
      progress: i === 0 ? 'active' : 'pending',
    }));
    this._currentIndex = 0;
  }

  get current(): ChallengeEntry | null {
    return this.entries[this._currentIndex] ?? null;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get all(): readonly ChallengeEntry[] {
    return this.entries;
  }

  get isComplete(): boolean {
    return this.entries.every((e) => e.progress === 'passed');
  }

  get totalCount(): number {
    return this.entries.length;
  }

  markCurrentPassed(): void {
    if (this._currentIndex < this.entries.length) {
      this.entries[this._currentIndex].progress = 'passed';
    }
  }

  markCurrentFailed(): void {
    if (this._currentIndex < this.entries.length) {
      this.entries[this._currentIndex].progress = 'failed';
    }
  }

  /** Add challenges after the current ones (the gesture fallback for a flash). */
  append(challenges: ChallengeConfig[]): void {
    for (const config of challenges) this.entries.push({ config, progress: 'pending' });
  }

  advance(): boolean {
    this._currentIndex++;
    if (this._currentIndex < this.entries.length) {
      this.entries[this._currentIndex].progress = 'active';
      return true; // More challenges
    }
    return false; // All done
  }
}
