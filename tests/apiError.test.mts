// npx tsx tests/apiError.test.mts
import { describeApiError as d } from '../src/lib/apiError.ts';
let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = got === want; if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got=${JSON.stringify(got)}`)); };
eq('duplicate email (400) shows the server sentence', d({ status: 400, data: { detail: 'Admin with this email already exists' } }, 'x'), 'Admin with this email already exists');
eq('short password (422)', d({ status: 422, data: { detail: [{ type: 'string_too_short', loc: ['body', 'password'], msg: 'String should have at least 8 characters', ctx: { min_length: 8 } }] } }, 'x'), 'Password must be at least 8 characters');
eq('bad email (422)', d({ status: 422, data: { detail: [{ type: 'value_error', loc: ['body', 'email'], msg: 'value is not a valid email address: An email address must have an @-sign.' }] } }, 'x'), 'The email address is not valid');
eq('two problems are both listed once', d({ status: 422, data: { detail: [
  { type: 'missing', loc: ['body', 'name'], msg: 'Field required' },
  { type: 'string_too_short', loc: ['body', 'password'], msg: 'String should have at least 8 characters', ctx: { min_length: 8 } }] } }, 'x'), 'Name is required. Password must be at least 8 characters');
eq('network failure with no detail', d({ status: 0, data: {} }, 'x'), 'Could not reach the server. Check your connection and try again.');
eq('permission', d({ status: 403, data: {} }, 'x'), "You don't have permission to do this.");
eq('unknown error uses the fallback', d(new Error('boom'), 'Failed to create admin.'), 'Failed to create admin.');
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`); process.exit(bad ? 1 : 0);
