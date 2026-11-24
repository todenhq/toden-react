import type { DeviceHandoffPhase } from '../hooks/useDeviceHandoff';

// PURE. When "Continue on this device" (and the mid-flow sheet's "Stay here")
// may ask the server to hand the other device's session back.
//
// It used to refuse once the phone had opened the link, and greyed the button
// out. A phone that opened the link and then sat idle kept the person's
// verification, and the desktop had no way to take it back (owner report,
// 2026-11-23). The server decides now: it hands back a phone session that did
// no paid work, and answers 409 for one that did, or while a paid check is
// still running, which the gate shows as "already open on your phone". An
// older server answers 409 for every opened phone, which reads the same.

/** Phases with nothing the server could hand back, or whose answer already stands. */
const NOTHING_TO_ASK: readonly DeviceHandoffPhase[] = ['creating', 'error', 'submitted', 'declined'];

/** True when this device may ask the server to return the handoff session. */
export function mayAskToReturnHandoff(sessionId: string | null, phase: DeviceHandoffPhase): sessionId is string {
  return sessionId !== null && !NOTHING_TO_ASK.includes(phase);
}
