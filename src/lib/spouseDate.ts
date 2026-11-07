/**
 * One stored date serves several meanings for the spouse (marriage, common-law, separation, divorce,
 * death). Label it by the CURRENT marital status, and hide it when it cannot apply. Shared by the admin
 * screen and the PDF export so they say the same thing.
 */
const LABELS: Record<string, string> = {
  married: 'Date of Marriage',
  'common-law': 'Date of Common-Law',
  separated: 'Date of Separation',
  divorced: 'Date of Divorce',
  widowed: 'Date of Death',
};

export function spouseDateLabel(maritalStatus: unknown): string | null {
  return LABELS[String(maritalStatus || '').toLowerCase()] ?? null;
}

/** Married / common-law: only when the client said they married that year. Other statuses always apply. */
export function spouseDateApplies(maritalStatus: unknown, marriageInTaxYear: unknown): boolean {
  const status = String(maritalStatus || '').toLowerCase();
  if (!LABELS[status]) return false;
  const marriedGroup = status === 'married' || status === 'common-law';
  return marriedGroup ? !!marriageInTaxYear : true;
}
