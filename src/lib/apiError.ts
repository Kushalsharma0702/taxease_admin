/**
 * Turns a failed API call into a sentence a person can act on.
 *
 * The server answers with `detail` as a plain sentence (e.g. "Admin with this email already exists") or,
 * for a rejected form, as a list of field problems (FastAPI/pydantic 422). The dashboard used to show a
 * fixed "Failed to ..." for every failure, so nobody could tell a short password from a duplicate email.
 */
const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  name: 'Name',
  role: 'Role',
  permissions: 'Permissions',
};

const labelFor = (loc: unknown): string => {
  const last = Array.isArray(loc) ? String(loc[loc.length - 1] ?? '') : '';
  return FIELD_LABELS[last] || (last ? last.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'A field');
};

const describeProblem = (p: any): string => {
  const label = labelFor(p?.loc);
  const msg = String(p?.msg ?? '');
  const min = p?.ctx?.min_length;
  if (/at least \d+ character/i.test(msg) || p?.type === 'string_too_short') {
    return `${label} must be at least ${min ?? msg.match(/\d+/)?.[0] ?? 'a few'} characters`;
  }
  if (/valid email/i.test(msg)) return 'The email address is not valid';
  if (p?.type === 'missing' || /field required/i.test(msg)) return `${label} is required`;
  if (/string should match pattern/i.test(msg)) return `${label} has an unsupported value`;
  return msg ? `${label}: ${msg}` : `${label} is not valid`;
};

export function describeApiError(err: unknown, fallback: string): string {
  const e = err as any;
  const detail = e?.data?.detail;
  if (Array.isArray(detail) && detail.length) {
    return Array.from(new Set(detail.map(describeProblem))).join('. ');
  }
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (e?.status === 0) return 'Could not reach the server. Check your connection and try again.';
  if (e?.status === 403) return "You don't have permission to do this.";
  if (e?.status === 401) return 'Your session has expired. Please sign in again.';
  return fallback;
}
