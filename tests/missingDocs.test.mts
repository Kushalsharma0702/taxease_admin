// npx tsx tests/missingDocs.test.mts
import { readFileSync } from 'node:fs';
import { requiredDocsToFlag as flag } from '../src/lib/missingDocs.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
const req = ['T2200 Form'];
eq('answered No / Not Applicable: nothing is flagged missing (the reported bug)', flag({ applicable: false, required: req, uploadedCount: 0, unavailableCount: 0 }), []);
eq('answered Yes and nothing uploaded: the required document is Missing', flag({ applicable: true, required: req, uploadedCount: 0, unavailableCount: 0 }), req);
eq('answered Yes and something uploaded: not flagged', flag({ applicable: true, required: req, uploadedCount: 1, unavailableCount: 0 }), []);
eq('answered Yes and marked not available: not flagged as missing', flag({ applicable: true, required: req, uploadedCount: 0, unavailableCount: 1 }), []);
eq('no required documents: nothing', flag({ applicable: true, required: [], uploadedCount: 0, unavailableCount: 0 }), []);

const qd = readFileSync('src/components/client/QuestionDocuments.tsx', 'utf8');
const sec = readFileSync('src/components/client/T1CRASection.tsx', 'utf8');
const yes = (name: string, c: boolean) => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name); };
yes('the section tells its documents whether the answer was Yes or No', sec.includes('SectionApplicableContext.Provider value={applicable}'));
yes('the documents box asks the section before flagging anything missing', qd.includes('useContext(SectionApplicableContext)') && qd.includes('requiredDocsToFlag('));
yes('a Not Applicable section with no uploads shows no empty documents box', qd.includes('const requiredForThisSection = sectionApplicable ? requiredDocuments : []'));
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
