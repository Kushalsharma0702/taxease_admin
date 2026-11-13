// npx tsx tests/filingStatusOrder.test.mts
import { isMovingBack, isAlreadyFiled } from '../src/lib/filingStatusOrder.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = got === want; if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${got} want=${want}`)); };
eq('Approval Received -> Sent for Approval is back', isMovingBack('approved_by_client', 'awaiting_approval'), true);
eq('Work-in-Progress -> Under Review is back', isMovingBack('in_preparation', 'submitted'), true);
eq('Under Review -> Awaiting Payment is forward', isMovingBack('submitted', 'payment_request_sent'), false);
eq('same status is not a move', isMovingBack('submitted', 'submitted'), false);
eq('Sent for Approval <-> Changes Requested share a step, not back', isMovingBack('awaiting_approval', 'changes_requested'), false);
eq('anything -> cancelled is not "back"', isMovingBack('in_preparation', 'cancelled'), false);
eq('draft is not on the timeline', isMovingBack('draft', 'submitted'), false);
eq('completed counts as already filed', isAlreadyFiled('completed'), true);
eq('approved_by_client is not yet filed', isAlreadyFiled('approved_by_client'), false);
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
