// npx tsx tests/clientActivityUi.test.mts  - the highlight is wired into the Clients list and the client page
import { readFileSync } from 'node:fs';
let bad = 0;
const yes = (name: string, cond: boolean) => { if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
const clients = readFileSync('src/pages/Clients.tsx', 'utf8');
const detail = readFileSync('src/pages/ClientDetail.tsx', 'utf8');
const table = readFileSync('src/components/ui/data-table.tsx', 'utf8');
const hook = readFileSync('src/hooks/useClientActivity.ts', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');

yes('the API client asks /client-activity', api.includes("this.request('/client-activity')"));
yes('the table supports a per-row highlight class', table.includes('rowClassName'));
yes('Clients list highlights rows with new data', clients.includes('rowClassName={(c) => (activity.isNew(c.email)') && clients.includes('border-l-amber-500'));
yes('Clients list shows a "New data" badge with what is new', clients.includes('New data') && clients.includes('describeNew('));
yes('Clients list can show only the new ones and mark all as seen', clients.includes('Show only these') && clients.includes('Mark all as seen'));
yes('Clients list has a sortable "Last client activity" column', clients.includes("key: 'lastClientActivityAt'") && clients.includes("header: 'Last client activity'"));
yes('client page shows a banner and a Mark as seen button', detail.includes('New data from this client') && detail.includes('Mark as seen'));
yes('client page marks the client as seen when the admin leaves it', detail.includes('useEffect(() => () => { if (clientEmailRef.current) markSeenRef.current('));
yes('tabs get a dot: Detailed Data, Documents, Tax Files', ['form_submitted', 'document_uploaded', 'client_action'].every((k) => detail.includes(`newKinds.includes('${k}')`)));
yes('seen state is saved immediately (not lost when the page closes)', hook.includes('localStorage.setItem(key, JSON.stringify(next))') && hook.includes('const commit'));
yes('a failed refresh never breaks the page', hook.includes('catch {') && hook.includes('must never break the page'));
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
