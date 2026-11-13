// npx tsx tests/unavailableRequest.test.mts
import { readFileSync } from 'node:fs';
import { unavailableRequestMessage as msg } from '../src/lib/documentRequest.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
const yes = (name: string, cond: boolean) => eq(name, cond, true);

eq('default message names the document and says it was marked not available',
  msg('T5008'), 'You marked "T5008" as not available. Please upload it in the app if you can find it.');
eq('the admin note is added after it', msg('T5008', ' Needed for your sales. '),
  'You marked "T5008" as not available. Please upload it in the app if you can find it. Needed for your sales.');
eq('a blank note adds nothing', msg('T5008', '   '), msg('T5008'));

const row = readFileSync('src/components/client/UnavailableDocRow.tsx', 'utf8');
const qd = readFileSync('src/components/client/QuestionDocuments.tsx', 'utf8');
const cd = readFileSync('src/pages/ClientDetail.tsx', 'utf8');
yes('the row has a Re-request button', row.includes('Re-request'));
yes('the button is hidden without permission (canRequest)', row.includes('canRequest &&'));
yes('after a request the button is disabled and shows Re-requested', row.includes('Re-requested') && row.includes('disabled'));
yes('Documents tab uses the shared row, with the request permission', cd.includes('<UnavailableDocRow') && cd.includes('PERMISSIONS.REQUEST_DOCUMENTS'));
yes('Questionnaire tab uses the shared row', qd.includes('<UnavailableDocRow'));
yes('neither page still draws its own plain "Not available" row',
  !cd.includes('Client marked this document as not available') && !qd.includes('Client marked this document as not available'));
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
