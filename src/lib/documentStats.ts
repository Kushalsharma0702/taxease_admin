// How a document's stored status counts on the client page ("Document Overview" cards and the badges above
// the Documents list). One place, so the two can never disagree again.
//
// Statuses really stored for client documents (production, 2026-11): pending, uploaded, approved,
// reupload_requested. The admin can also set missing / rejected. ('complete' is an old value nothing writes now.)
//
//   approved  -> Approved         the admin checked it
//   pending / uploaded / complete / empty / unknown -> Pending review   the client sent it, nobody has checked it yet
//   reupload_requested -> Re-upload requested   the admin asked the client to send it again
//   missing / rejected -> Missing   the admin says it is missing or unusable
export type DocBucket = 'approved' | 'pending' | 'reupload' | 'missing';

export function documentBucket(status?: string | null): DocBucket {
  switch ((status || '').toLowerCase()) {
    case 'approved': return 'approved';
    case 'reupload_requested': return 'reupload';
    case 'missing':
    case 'rejected': return 'missing';
    default: return 'pending';
  }
}

export interface DocumentCounts { approved: number; pending: number; reupload: number; missing: number; total: number }

export function summarizeDocuments(docs: Array<{ status?: string | null }> | null | undefined): DocumentCounts {
  const out: DocumentCounts = { approved: 0, pending: 0, reupload: 0, missing: 0, total: 0 };
  for (const d of docs || []) { out[documentBucket(d?.status)] += 1; out.total += 1; }
  return out;
}

/** Documents an "Approve all" should approve: the ones waiting for review (pending / uploaded). Anything the
 *  admin already approved, asked to be re-uploaded, or marked missing / rejected is left exactly as it is. */
export function documentsAwaitingReview<T extends { status?: string | null }>(docs: T[] | null | undefined): T[] {
  return (docs || []).filter((d) => documentBucket(d?.status) === 'pending');
}
