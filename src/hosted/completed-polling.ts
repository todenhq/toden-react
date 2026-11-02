import type { CompletedSessionSummary } from '../services/api';
import { summaryOwnershipPending } from '../lib/ownership-pending';

/**
 * Whether the returning applicant's screen keeps re-reading its summary.
 *
 * While anybody still owes a check (their badge may turn green), and while
 * shareholders from the register are still on their way (they join the list
 * with invite links when they arrive). A decided application has nothing left
 * to converge on, and its invites have been voided, so there is no list to
 * keep fresh either.
 */
export function stillWaiting(summary: CompletedSessionSummary): boolean {
  const outcome = summary.outcome ?? 'submitted';
  if (summary.cancelled === true || outcome === 'declined' || outcome === 'error') return false;
  if (summaryOwnershipPending(summary)) return true;
  return summary.keyPeople.some((p) => p.status === 'pending' || p.status === 'failed');
}
