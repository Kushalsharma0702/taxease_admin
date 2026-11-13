// npx tsx tests/documentStats.test.mts
import { documentBucket as b, summarizeDocuments as sum, documentsAwaitingReview as waiting } from '../src/lib/documentStats.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
eq('approved', b('approved'), 'approved');
eq('"uploaded" (what the app writes) is pending review, not lost', b('uploaded'), 'pending');
eq('"pending" is pending review', b('pending'), 'pending');
eq('old "complete" value is pending review', b('complete'), 'pending');
eq('missing status is missing', b('missing'), 'missing');
eq('rejected counts as missing', b('rejected'), 'missing');
eq('re-upload requested has its own bucket', b('reupload_requested'), 'reupload');
eq('empty / unknown status is pending review, never dropped', [b(''), b(null), b(undefined), b('something_new')], ['pending', 'pending', 'pending', 'pending']);
eq('status is case-insensitive', b('Approved'), 'approved');
// the live production mix (2026-11): pending 105, approved 100, uploaded 53, reupload_requested 2
const mix = [...Array(105).fill('pending'), ...Array(100).fill('approved'), ...Array(53).fill('uploaded'), ...Array(2).fill('reupload_requested')].map((status) => ({ status }));
eq('production mix: every document is counted exactly once', sum(mix), { approved: 100, pending: 158, reupload: 2, missing: 0, total: 260 });
eq('no documents -> all zero', sum([]), { approved: 0, pending: 0, reupload: 0, missing: 0, total: 0 });
eq('the four buckets always add up to the total', (() => { const s = sum(mix); return s.approved + s.pending + s.reupload + s.missing === s.total; })(), true);
const docs = ['pending', 'uploaded', 'approved', 'reupload_requested', 'missing', 'rejected', 'complete', ''].map((status, i) => ({ id: i, status }));
eq('Approve all picks only what is waiting for review (pending, uploaded, complete, blank)', waiting(docs).map((d) => d.id), [0, 1, 6, 7]);
eq('Approve all never touches approved, re-upload requested, missing or rejected documents', waiting(docs).some((d) => ['approved', 'reupload_requested', 'missing', 'rejected'].includes(d.status)), false);
eq('Approve all with nothing waiting picks nothing', [waiting([{ status: 'approved' }]).length, waiting([]).length, waiting(null).length], [0, 0, 0]);
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
