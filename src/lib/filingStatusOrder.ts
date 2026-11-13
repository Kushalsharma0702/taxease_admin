// Position of each status on the client timeline. Mirrors STATUS_ORDER in
// services/admin-api/app/core/filing_transitions.py (keep both in step).
const ORDER: Record<string, number> = {
  documents_pending: 1,
  submitted: 2,
  payment_request_sent: 3,
  payment_completed: 4,
  in_preparation: 5,
  awaiting_approval: 6,
  changes_requested: 6,
  approved_by_client: 7,
  filed: 8,
  completed: 8,
};

export const MIN_BACK_REASON_LENGTH = 3;

/** True when `next` is an earlier step on the timeline than `current`. */
export function isMovingBack(current: string, next: string): boolean {
  return current in ORDER && next in ORDER && ORDER[next] < ORDER[current];
}

/** A return that was already e-filed: only a super admin may move it back (the server enforces it too). */
export function isAlreadyFiled(status: string): boolean {
  return status === 'filed' || status === 'completed';
}
