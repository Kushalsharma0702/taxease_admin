// npx tsx tests/approveAllUi.test.mts - "Approve all" is wired into the Documents tab
import { readFileSync } from 'node:fs';
let bad = 0;
const yes = (name: string, cond: boolean) => { if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
const cd = readFileSync('src/pages/ClientDetail.tsx', 'utf8');
yes('the Documents tab has an Approve all button', cd.includes('Approve all') && cd.includes('onClick={() => setIsApproveAllOpen(true)}'));
yes('only admins who may handle documents see it', cd.includes('hasPermission(PERMISSIONS.REQUEST_DOCUMENTS)') && cd.indexOf('Approve all') > cd.indexOf('hasPermission(PERMISSIONS.REQUEST_DOCUMENTS)'));
yes('it is disabled when nothing is waiting for review', cd.includes('documentsAwaitingReview(documents).length === 0 || isApprovingAll'));
yes('a confirmation dialog explains what changes and that the client is not notified', cd.includes('Approve all documents?') && cd.includes('The client is not notified'));
yes('it approves through the same status update as approving one document', cd.includes("api.updateDocument(d.id, { status: 'approved' })"));
yes('it reports how many worked and how many failed', cd.includes('Some documents were not approved') && cd.includes('All documents approved'));
yes('the page updates every approved document at once', cd.includes('approvedIds.has(d.id)'));
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
