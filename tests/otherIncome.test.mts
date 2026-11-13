// npx tsx tests/otherIncome.test.mts
import { buildOtherIncome as b } from '../src/lib/t1FormAdapter.ts';
import { otherIncomeAmountText as txt } from '../src/lib/otherIncome.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
const money = (n: number) => `$${n.toFixed(2)}`;
eq('description and amount come out as two separate values', b({ otherIncomeDescription: 'Cash tutoring', otherIncomeAmount: 1250.5 }, true), [{ description: 'Cash tutoring', amount: 1250.5 }]);
eq('amount typed as text is understood', b({ otherIncomeDescription: 'x', otherIncomeAmount: '$1,200.00' }, true), [{ description: 'x', amount: 1200 }]);
eq('an older draft (no amount key) keeps its description and has no fake $0.00', b({ otherIncomeDescription: 'tutoring about 800' }, true), [{ description: 'tutoring about 800', amount: null }]);
eq('description only, amount left at 0: shows $0.00 (the client typed nothing)', b({ otherIncomeDescription: 'tips', otherIncomeAmount: 0 }, true), [{ description: 'tips', amount: 0 }]);
eq('amount without a description still shows', b({ otherIncomeAmount: 300 }, true), [{ description: '', amount: 300 }]);
eq('answered "No" to Q15: nothing is shown even if old values linger', b({ otherIncomeDescription: 'old', otherIncomeAmount: 5 }, false), []);
eq('Yes but nothing filled in: nothing is shown', b({ otherIncomeDescription: ' ', otherIncomeAmount: 0 }, true), []);
eq('an explicit list (older web form) still works', b({ otherIncome: [{ description: 'A', amount: '10' }, { source: 'B', amount: 20 }] }, false), [{ description: 'A', amount: 10 }, { description: 'B', amount: 20 }]);
eq('amount text: money or a pointer to the description', [txt(12, money), txt(0, money), txt(null, money)], ['$12.00', '$0.00', 'See description']);
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
