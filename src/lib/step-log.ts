// Session step log — records each SDK step the user reaches, with a
// timestamp, so the server can reconstruct the journey on the verification
// timeline ("consent opened → ID type chosen → document captured → …").
// Rides the verify submission as metadata.device.stepLog — the same free-form
// channel the Device Intelligence fingerprint uses: no extra network calls,
// no new endpoint, and old SDKs simply never send it. `sentAt` is stamped at
// collect time so the server can correct client-clock skew against its own
// receipt time. Step names only — never PII.

export interface StepLogEntry {
  step: string;
  at: string;
  /**
   * Which multi-ID check the applicant was on (1-based). Absent on ordinary
   * single-ID runs.
   *
   * Carried because the SERVER cannot tell a slot advance from a back-press:
   * a multi-ID run legitimately returns to the ID picker for its second ID, and
   * a step-name-only log makes that look exactly like pressing Back. Only the
   * client knows a slot was committed, so only the client can say.
   */
  slot?: number;
  /**
   * The ID type selected AT THAT MOMENT.
   *
   * Recorded because a slot's final pick is not what the applicant was doing
   * earlier in it: pick a BVN, look at the input, go back, pick a passport, and
   * labelling that first step from the committed slot calls it "Passport" —
   * an ID they had not chosen yet.
   */
  idType?: string;
}

/**
 * One press of an SDK control. `control` is the catalogue key of the control's
 * label (lib/click-log.ts), `label` its English default; neither is ever text
 * the applicant typed or their data, because only static SDK copy can match.
 */
export interface ClickEntry {
  control: string;
  label: string;
  /** The step the press happened on. */
  step: string;
  at: string;
}

/**
 * What got in the way of the applicant, by a closed code (drop-off insights,
 * user 2026-11-20: "know why a user likely dropped off"). Add-only, shared
 * with the React Native and Flutter SDKs and kyc-core, which ignores a code it
 * does not know. Never personal data: a code, an optional closed detail, the
 * step and the time.
 */
export type JourneyEventCode =
  | 'camera_denied'
  | 'camera_unavailable'
  | 'microphone_denied'
  | 'upload_failed'
  | 'network_error'
  | 'liveness_failed'
  | 'capture_rejected'
  | 'nfc_failed'
  | 'code_resent'
  | 'code_invalid'
  | 'app_backgrounded'
  | 'app_foregrounded'
  | 'flow_closed'
  | 'error_shown';

export interface JourneyEvent {
  code: JourneyEventCode;
  /** The step it happened on, named as the step log names steps. */
  step: string;
  at: string;
  /** A closed sub-code (e.g. `no_face`); for `error_shown`, the SDK's error code. */
  detail?: string;
}

/** The SDK and device the journey ran on. No identifiers. */
export interface JourneyClient {
  sdk: 'web' | 'react-native' | 'flutter';
  version: string;
  platform: 'web' | 'ios' | 'android';
  os?: string;
  osVersion?: string;
  browser?: string;
  formFactor?: 'phone' | 'tablet' | 'desktop';
}

export interface StepLog {
  steps: StepLogEntry[];
  clicks?: ClickEntry[];
  events?: JourneyEvent[];
  client?: JourneyClient;
  sentAt: string;
}

const MAX_ENTRIES = 40;
const MAX_CLICKS = 60;
export const MAX_EVENTS = 60;
/** A second press of the same control inside this window is a double click, not a new press. */
const REPEAT_MS = 500;
/** The same event (code, detail, step) again inside this window is one event. */
export const EVENT_REPEAT_MS = 2000;
/** Back in the foreground inside this window: a system sheet (a permission prompt), not leaving. */
export const BOUNCE_MS = 1000;

let entries: StepLogEntry[] = [];
let clicks: ClickEntry[] = [];
let events: JourneyEvent[] = [];
let client: JourneyClient | null = null;
/** How often each repeatable failure has happened this session. */
let failures: Partial<Record<JourneyEventCode, number>> = {};
const urgentListeners = new Set<(code: JourneyEventCode) => void>();

/** Fresh slate per session (called where integrity signals reset — modal open). */
export function resetStepLog(): void {
  entries = [];
  clicks = [];
  events = [];
  failures = {};
}

/** The SDK and device facts every collected log carries. */
export function setJourneyClient(next: JourneyClient | null): void {
  client = next;
}

/** A detail is a short snake_case code or nothing: never free text. */
const DETAIL = /^[a-z][a-z0-9_]{0,31}$/;

/**
 * The events after which progress is saved at once rather than on the next
 * debounced change: the applicant may be about to leave, and a session that
 * expires keeps only what was saved.
 */
const SAVE_AT_ONCE: ReadonlySet<JourneyEventCode> = new Set<JourneyEventCode>([
  'camera_denied',
  'camera_unavailable',
  'upload_failed',
  'flow_closed',
  'app_backgrounded',
]);
/** Saved at once from the second time on: one failed attempt is ordinary. */
const SAVE_WHEN_REPEATED: ReadonlySet<JourneyEventCode> = new Set<JourneyEventCode>([
  'liveness_failed',
  'capture_rejected',
  'nfc_failed',
]);

/**
 * Records what got in the way, on the step the applicant is on. An identical
 * event within EVENT_REPEAT_MS is kept once, a background-and-back shorter
 * than BOUNCE_MS is dropped, and past MAX_EVENTS the oldest go.
 */
export function recordJourneyEvent(code: JourneyEventCode, detail?: string, now: Date = new Date()): void {
  const step = entries[entries.length - 1]?.step ?? 'unknown';
  const safeDetail = detail && DETAIL.test(detail) ? detail : detail ? 'other' : undefined;
  const last = events[events.length - 1];
  const sinceLast = last ? now.getTime() - new Date(last.at).getTime() : Infinity;
  if (code === 'app_foregrounded' && last?.code === 'app_backgrounded' && sinceLast < BOUNCE_MS) {
    events.pop();
    return;
  }
  const repeat = events.some(
    (e) => e.code === code && e.detail === safeDetail && e.step === step && now.getTime() - new Date(e.at).getTime() < EVENT_REPEAT_MS,
  );
  if (repeat) return;
  events.push({ code, step, at: now.toISOString(), ...(safeDetail ? { detail: safeDetail } : {}) });
  if (events.length > MAX_EVENTS) events = events.slice(events.length - MAX_EVENTS);
  if (SAVE_WHEN_REPEATED.has(code)) failures[code] = (failures[code] ?? 0) + 1;
  if (SAVE_AT_ONCE.has(code) || (SAVE_WHEN_REPEATED.has(code) && (failures[code] ?? 0) >= 2)) {
    notifyJourneyUrgent(code);
  }
}

/** Asks for progress to be saved now (lib/journey-lifecycle.ts and recordJourneyEvent). */
export function notifyJourneyUrgent(code: JourneyEventCode): void {
  for (const listener of urgentListeners) {
    try {
      listener(code);
    } catch {
      /* a save that throws must never break the flow */
    }
  }
}

/** Subscribes to "save progress now"; returns the unsubscribe. */
export function onJourneyUrgent(listener: (code: JourneyEventCode) => void): () => void {
  urgentListeners.add(listener);
  return () => urgentListeners.delete(listener);
}

/** Whether any network failure was recorded since `since` (ms), for the save once back online. */
export function networkErrorSince(since: number): boolean {
  return events.some((e) => e.code === 'network_error' && new Date(e.at).getTime() >= since);
}

/** Records a press of a named SDK control on the step the applicant is on. */
export function recordClick(control: string, label: string, now: Date = new Date()): void {
  if (clicks.length >= MAX_CLICKS) return;
  const step = entries[entries.length - 1]?.step ?? 'unknown';
  const last = clicks[clicks.length - 1];
  if (last && last.control === control && last.step === step && now.getTime() - new Date(last.at).getTime() < REPEAT_MS) return;
  clicks.push({ control, label, step, at: now.toISOString() });
}

/** Records a step visit. Consecutive duplicates are collapsed; back-and-forth
 *  navigation is kept — repeat visits are honest journey data. */
export function recordStep(step: string, slot?: number, idType?: string): void {
  if (entries.length >= MAX_ENTRIES) return;
  const last = entries[entries.length - 1];
  // A revisit on a NEW multi-ID slot, or on a DIFFERENT ID, is a different
  // visit — not a duplicate.
  if (last?.step === step && last.slot === slot && last.idType === idType) return;
  entries.push({
    step,
    at: new Date().toISOString(),
    ...(slot ? { slot } : {}),
    ...(idType ? { idType } : {}),
  });
}

/** Snapshot attached to the verify submission. Null when nothing was recorded
 *  (e.g. a headless/server caller) so the field is simply absent. */
export function getStepLog(): StepLog | null {
  if (entries.length === 0 && clicks.length === 0 && events.length === 0) return null;
  return {
    steps: [...entries],
    ...(clicks.length > 0 ? { clicks: [...clicks] } : {}),
    ...(events.length > 0 ? { events: [...events] } : {}),
    ...(client ? { client: { ...client } } : {}),
    sentAt: new Date().toISOString(),
  };
}
