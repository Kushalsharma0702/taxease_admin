// npx tsx tests/provinceFilerAddress.test.mts
import { provinceFilerAddress as pa } from '../src/lib/provinceFilerAddress.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
eq('separate parts are returned as entered',
  pa({ propertyStreet: '12 Main St', propertyAptSuite: 'Apt 4', propertyCity: 'Toronto', propertyProvince: 'Ontario', postalCode: 'M5V 1A1', propertyAddress: 'x' }),
  { street: '12 Main St', aptSuite: 'Apt 4', city: 'Toronto', province: 'Ontario', postalCode: 'M5V 1A1' });
eq('an older draft (one-line address only) shows under Street, postal code kept',
  pa({ propertyAddress: '5 Rue X, Montreal', postalCode: 'H2X 1Y4' }),
  { street: '5 Rue X, Montreal', aptSuite: '', city: '', province: '', postalCode: 'H2X 1Y4' });
eq('only an Apt entered still counts as the new format (no one-line fallback)',
  pa({ propertyAptSuite: '12', propertyAddress: '12' }), { street: '', aptSuite: '12', city: '', province: '', postalCode: '' });
eq('missing entry gives empty strings', pa(undefined), { street: '', aptSuite: '', city: '', province: '', postalCode: '' });
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
