// npx tsx tests/clientActivity.test.mts
import {
  newKinds, hasNewData, newestNewAt, markSeen, markAllSeen, newClientCount, parseSeenState, emptySeenState, timeAgo, describeNew,
  type ActivityResponse, type SeenState,
} from '../src/lib/clientActivity.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };

const act: ActivityResponse = {
  server_time: '2026-11-13T15:00:00Z',
  clients: {
    'a@x.com': { last_at: '2026-11-13T14:00:00Z', kinds: { document_uploaded: '2026-11-13T12:00:00Z', form_updated: '2026-11-13T14:00:00Z' } },
    'b@x.com': { last_at: '2026-11-01T10:00:00Z', kinds: { form_submitted: '2026-11-01T10:00:00Z' } },
  },
};
const st = (baseline: string, seen: Record<string, string> = {}): SeenState => ({ baseline, seen });

eq('activity after the baseline is new', newKinds(act, st('2026-11-13T00:00:00Z'), 'a@x.com'), ['document_uploaded', 'form_updated']);
eq('old history before the baseline is NOT new (no flood on first use)', hasNewData(act, st('2026-11-13T00:00:00Z'), 'b@x.com'), false);
eq('e-mail match ignores case and spaces', hasNewData(act, st('2026-11-13T00:00:00Z'), ' A@X.com '), true);
eq('a client with no activity is not new', newKinds(act, st('2026-01-01T00:00:00Z'), 'nobody@x.com'), []);
eq('after the admin opens the client, it clears', hasNewData(act, markSeen(st('2026-11-13T00:00:00Z'), 'a@x.com', act.server_time), 'a@x.com'), false);
eq('a later upload after that is new again', newKinds({ ...act, clients: { 'a@x.com': { last_at: '2026-11-13T16:00:00Z', kinds: { document_uploaded: '2026-11-13T16:00:00Z' } } } }, markSeen(st('2026-11-13T00:00:00Z'), 'a@x.com', act.server_time), 'a@x.com'), ['document_uploaded']);
eq('only the kinds newer than the seen time are listed', newKinds(act, st('2026-11-13T00:00:00Z', { 'a@x.com': '2026-11-13T13:00:00Z' }), 'a@x.com'), ['form_updated']);
eq('markSeen never moves the seen time backwards', markSeen(st('2026-11-13T00:00:00Z', { 'a@x.com': '2026-11-13T15:00:00Z' }), 'a@x.com', '2026-11-13T10:00:00Z').seen['a@x.com'], '2026-11-13T15:00:00Z');
eq('newest new time', newestNewAt(act, st('2026-11-13T00:00:00Z'), 'a@x.com'), '2026-11-13T14:00:00Z');
eq('newest new time is empty when nothing is new', newestNewAt(act, st('2026-11-13T15:00:00Z'), 'a@x.com'), '');
eq('mark all as seen clears everyone', newClientCount(act, markAllSeen(st('2026-01-01T00:00:00Z'), act), ['a@x.com', 'b@x.com']), 0);
eq('count of clients with new data (a duplicate e-mail counts once)', newClientCount(act, st('2026-01-01T00:00:00Z'), ['a@x.com', 'A@x.com', 'b@x.com', null]), 2);
eq('kinds come in importance order: submitted before uploaded before updated',
  newKinds({ server_time: '', clients: { 'c@x.com': { last_at: '', kinds: { form_updated: '2026-11-13T10:00:00Z', form_submitted: '2026-11-13T09:00:00Z', document_uploaded: '2026-11-13T08:00:00Z' } } } }, st('2026-01-01T00:00:00Z'), 'c@x.com'),
  ['form_submitted', 'document_uploaded', 'form_updated']);
eq('stored state that is corrupt starts fresh at "now"', parseSeenState('{not json', '2026-11-13T15:00:00Z'), emptySeenState('2026-11-13T15:00:00Z'));
eq('stored state round trips', parseSeenState(JSON.stringify(st('2026-11-13T00:00:00Z', { 'a@x.com': '2026-11-13T01:00:00Z' })), 'x'), st('2026-11-13T00:00:00Z', { 'a@x.com': '2026-11-13T01:00:00Z' }));
eq('time ago', [timeAgo('2026-11-13T14:59:50Z', Date.parse('2026-11-13T15:00:00Z')), timeAgo('2026-11-13T14:30:00Z', Date.parse('2026-11-13T15:00:00Z')), timeAgo('2026-11-13T12:00:00Z', Date.parse('2026-11-13T15:00:00Z')), timeAgo('2026-11-10T15:00:00Z', Date.parse('2026-11-13T15:00:00Z'))], ['just now', '30 min ago', '3 h ago', '3 d ago']);
eq('description', describeNew(['document_uploaded', 'form_updated']), 'Document uploaded · Form answers updated');
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
