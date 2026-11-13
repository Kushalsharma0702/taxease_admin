import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivityResponse, SeenState, ActivityKind, emptySeenState, parseSeenState, storageKey,
  newKinds as kindsFor, newestNewAt, markSeen as markSeenIn, markAllSeen as markAllSeenIn,
} from '@/lib/clientActivity';

const REFRESH_MS = 60_000;

/** Which clients have new data from the client app for THIS admin (see lib/clientActivity.ts). */
export function useClientActivity() {
  const { user } = useAuth();
  const key = storageKey(user?.id);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [seen, setSeen] = useState<SeenState | null>(() => {
    try { const raw = localStorage.getItem(key); return raw ? parseSeenState(raw, '') : null; } catch { return null; }
  });
  const seenRef = useRef(seen);
  seenRef.current = seen;

  const load = useCallback(async () => {
    try {
      const a = await api.getClientActivity();
      setActivity(a);
      // First time in this browser: everything that happened before now is history, not "new".
      setSeen((prev) => prev ?? emptySeenState(a.server_time));
    } catch {
      /* the highlight is a nicety: a failed refresh must never break the page */
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [load]);

  // Written straight away (not from an effect) so that marking a client as seen while leaving a page is not lost.
  const commit = useCallback((next: SeenState) => {
    seenRef.current = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private window: highlight just resets next visit */ }
    setSeen(next);
  }, [key]);

  // Keep the first-visit baseline on disk too.
  useEffect(() => {
    if (!seen) return;
    try { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seen)); } catch { /* ignore */ }
  }, [seen, key]);

  const state: SeenState = seen ?? emptySeenState('9999-12-31T00:00:00Z'); // nothing is "new" until the first load finishes
  return {
    activity,
    loaded: activity !== null && seen !== null,
    newKinds: (email?: string | null): ActivityKind[] => kindsFor(activity, state, email),
    isNew: (email?: string | null) => kindsFor(activity, state, email).length > 0,
    newestAt: (email?: string | null) => newestNewAt(activity, state, email),
    lastAt: (email?: string | null) => activity?.clients?.[(email || '').trim().toLowerCase()]?.last_at || '',
    markSeen: useCallback((email: string) => {
      const at = activity?.server_time;
      if (at) commit(markSeenIn(seenRef.current ?? emptySeenState(at), email, at));
    }, [activity, commit]),
    markAllSeen: useCallback(() => {
      if (activity) commit(markAllSeenIn(seenRef.current ?? emptySeenState(activity.server_time), activity));
    }, [activity, commit]),
    state,
  };
}
