// npx tsx tests/paymentSummary.test.mts
import { summarizePayments as sum } from '../src/lib/paymentSummary.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
const pick = (r: ReturnType<typeof sum>) => [r.totalDue, r.receivedTotal, r.balanceDue, r.status];

// Attempt 1 from the doc: requested $120, recorded $110 (stored total was $0, stored paid $110, status "paid")
eq('attempt 1: 120 requested, 110 paid -> balance 10, partial',
  pick(sum({ requestAmounts: [120], recordedAmounts: [110], storedTotal: 0, storedPaid: 110, storedStatus: 'paid' })), [120, 110, 10, 'partial']);
// Attempt 2: requested 500, recorded 500, then requested 50 -> total 550, paid 500, balance 50
eq('attempt 2: 500 + 50 requested, 500 paid -> total 550, balance 50, partial',
  pick(sum({ requestAmounts: [50, 500], recordedAmounts: [500], storedTotal: 0, storedPaid: 500, storedStatus: 'paid' })), [550, 500, 50, 'partial']);
eq('after the 50 is paid too -> balance 0, paid',
  pick(sum({ requestAmounts: [50, 500], recordedAmounts: [500, 50], storedTotal: 0, storedPaid: 550, storedStatus: 'paid' })), [550, 550, 0, 'paid']);
eq('request only, nothing paid -> pending',
  pick(sum({ requestAmounts: [120], recordedAmounts: [], storedTotal: 0, storedPaid: 0, storedStatus: 'pending' })), [120, 0, 120, 'pending']);
eq('server already added requests to its total: not counted twice',
  pick(sum({ requestAmounts: [500, 50], recordedAmounts: [500], storedTotal: 550, storedPaid: 500, storedStatus: 'partial' })), [550, 500, 50, 'partial']);
eq('overpaid shows balance 0 and the extra amount',
  [sum({ requestAmounts: [100], recordedAmounts: [130], storedTotal: 100, storedPaid: 130 }).balanceDue, sum({ requestAmounts: [100], recordedAmounts: [130], storedTotal: 100, storedPaid: 130 }).overpaid], [0, 30]);
eq('payment recorded with no request at all -> paid (as the server does)',
  pick(sum({ requestAmounts: [], recordedAmounts: [200], storedTotal: 0, storedPaid: 200 })), [0, 200, 0, 'paid']);
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
