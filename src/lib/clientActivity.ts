// "New data from the client" highlighting.
//
// The server (GET /client-activity) says when each client last did something in the app. This admin's own
// "I have looked at it up to here" times are kept in this browser (per admin account), so every admin sees what
// is new FOR THEM. A client is new when something is newer than the later of:
//   - the moment this admin first used the feature in this browser (the baseline: old history is not "new"), and
//   - the last time this admin opened / marked-seen that client.
export type ActivityKind = 'document_uploaded' | 'form_updated' | 'form_submitted' | 'client_action';

export interface ClientActivity { last_at: string; kinds: Partial<Record<ActivityKind, string>> }
export interface ActivityResponse { server_time: string; clients: Record<string, ClientActivity> }
export interface SeenState { baseline: string; seen: Record<string, string> }

export const KIND_LABELS: Record<ActivityKind, string> = {
  document_uploaded: 'Document uploaded',
  form_updated: 'Form answers updated',
  form_submitted: 'Form submitted',
  client_action: 'Client responded on the return',
};
export const KIND_ORDER: ActivityKind[] = ['form_submitted', 'document_uploaded', 'client_action', 'form_updated'];

const norm = (email?: string | null) => (email || '').trim().toLowerCase();
const t = (iso?: string | null) => { const n = iso ? Date.parse(iso) : NaN; return Number.isNaN(n) ? 0 : n; };

/** The time this admin has already seen for a client: the later of the baseline and their own seen time. */
function seenUntil(state: SeenState, email: string): number {
  return Math.max(t(state.baseline), t(state.seen[email]));
}

/** Kinds of activity newer than what this admin has seen, newest first within KIND_ORDER. */
export function newKinds(activity: ActivityResponse | null | undefined, state: SeenState, email?: string | null): ActivityKind[] {
  const e = norm(email);
  const a = activity?.clients?.[e];
  if (!a) return [];
  const limit = seenUntil(state, e);
  return KIND_ORDER.filter((k) => t(a.kinds[k]) > limit);
}

export function hasNewData(activity: ActivityResponse | null | undefined, state: SeenState, email?: string | null): boolean {
  return newKinds(activity, state, email).length > 0;
}

/** Newest activity time (ISO) among the new kinds, '' when nothing is new. Used for sorting and "2h ago". */
export function newestNewAt(activity: ActivityResponse | null | undefined, state: SeenState, email?: string | null): string {
  const e = norm(email);
  const kinds = newKinds(activity, state, e);
  if (!kinds.length) return '';
  const a = activity!.clients[e];
  return kinds.map((k) => a.kinds[k]!).sort((x, y) => t(y) - t(x))[0];
}

/** Mark one client as seen up to `at` (the server's clock, so a skewed laptop clock cannot hide new data). */
export function markSeen(state: SeenState, email: string, at: string): SeenState {
  const e = norm(email);
  if (!e || t(at) <= t(state.seen[e])) return state;
  return { ...state, seen: { ...state.seen, [e]: at } };
}

/** Mark every client in the response as seen. */
export function markAllSeen(state: SeenState, activity: ActivityResponse): SeenState {
  const seen = { ...state.seen };
  for (const e of Object.keys(activity.clients)) seen[e] = activity.server_time;
  return { ...state, seen };
}

export function newClientCount(activity: ActivityResponse | null | undefined, state: SeenState, emails: Array<string | null | undefined>): number {
  const seenEmails = new Set<string>();
  for (const em of emails) { const e = norm(em); if (e && hasNewData(activity, state, e)) seenEmails.add(e); }
  return seenEmails.size;
}

export function emptySeenState(now: string): SeenState { return { baseline: now, seen: {} }; }

export function storageKey(adminId?: string | null): string { return `taxease_admin_seen_v1:${adminId || 'anon'}`; }

export function parseSeenState(raw: string | null, fallbackNow: string): SeenState {
  try {
    const p = raw ? JSON.parse(raw) : null;
    if (p && typeof p.baseline === 'string' && p.seen && typeof p.seen === 'object') return { baseline: p.baseline, seen: p.seen };
  } catch { /* corrupt value: start fresh */ }
  return emptySeenState(fallbackNow);
}

/** "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const s = Math.max(0, Math.round((nowMs - t(iso)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function describeNew(kinds: ActivityKind[]): string {
  return kinds.map((k) => KIND_LABELS[k]).join(' · ');
}
