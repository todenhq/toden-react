import type { KeyPeopleSection } from './key-people-sections';

// Shareholders the register has not sent yet.
//
// Some registers (read through Didit) take minutes to answer for a company's
// shareholders. The server waits briefly when the company is picked, reads
// again at submission and finishes in the background; when the owners arrive
// they join the application's key people with their invite links. Two
// add-only fields say the answer is still on its way:
//
// - `ownershipPending` on the business block of `POST /business/select`: the key-people
//   prefill from that answer has no owners yet.
// - `keyPeopleOwnershipPending` on the completed-session summary: owners may
//   still be added to the list, so the success screen keeps re-reading.
//
// A missing field (an older server) means false. Mirrors the React Native
// SDK's config/ownershipPending.ts and the Flutter SDK's
// config/ownership_pending.dart: keep the three in lockstep.

/** Whether the register check at selection is still waiting on the owners. */
export function selectOwnershipPending(
  business: { ownershipPending?: unknown } | null | undefined,
): boolean {
  return business?.ownershipPending === true;
}

/** Whether the submitted application may still gain owners from the register. */
export function summaryOwnershipPending(
  summary: { keyPeopleOwnershipPending?: unknown } | null | undefined,
): boolean {
  return summary?.keyPeopleOwnershipPending === true;
}

/** Anybody on the list who can still change: an open check, or a failure they may retry. */
export function anyoneStillOwes(people: ReadonlyArray<{ status: string }>): boolean {
  return people.some((p) => p.status === 'pending' || p.status === 'submitted' || p.status === 'failed');
}

/**
 * Whether the success screen should keep re-reading the summary: while anybody
 * still owes a check, and while owners from the register are still on their
 * way (they arrive with invite links that belong on this screen).
 */
export function keepReadingSummary(
  people: ReadonlyArray<{ status: string }>,
  ownershipPending: boolean,
): boolean {
  return ownershipPending || anyoneStillOwes(people);
}

/**
 * Which section of the key-people step carries the "still getting the
 * shareholders" note: Shareholders when the workflow shows it, else Beneficial
 * owners, else none (a workflow that collects no owners has nothing to add).
 */
export function ownershipNoteSection(
  sections: ReadonlyArray<KeyPeopleSection>,
): KeyPeopleSection | null {
  if (sections.includes('shareholders')) return 'shareholders';
  if (sections.includes('ubos')) return 'ubos';
  return null;
}
