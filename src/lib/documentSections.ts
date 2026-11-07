/**
 * Single source of truth for "which T1 question does this document belong to".
 *
 * The Documents tab and the Detailed Data tab used to carry two different
 * keyword lists, so the same upload landed in different (or no) sections on
 * each tab — e.g. Moving Expenses showed 5 docs on Documents but 3 on Detailed
 * Data. Both tabs now classify through `classifyDocSection`, so every document
 * appears under exactly one section, identically on both tabs.
 */

// Order matters: the first section whose keywords match wins.
// Short slip names (t3/t4a/t4e) are NOT keywords: they match inside ordinary
// filenames. Those slips are placed by their exact upload category/sectionKey.
export const DOC_SECTION_KEYWORDS: Record<string, string[]> = {
  available_documents: ['t4a_p', 't4a_oas', 't4rsp', 't4rif', 't5008'],
  employment_income: ['form 16', 'salary', 'employment', 'employer', 't4'],
  investment_income: ['investment', 'fd', 'dividend', 'interest certificate', 'mutual fund statement', 't5'],
  foreign_property: ['foreign', 'us income', 'dtaa', 'overseas'],
  medical_expenses: ['medical', 'hospital', 'health', 'pharmacy', 'doctor', 'medicine', 'clinic'],
  charitable_donations: ['donation', 'charity', 'ngo', 'trust'],
  moving_expenses: ['moving', 'relocation', 'transport', 'air_ticket', 'air ticket', 'airfare', 'meals_receipt',
    'hotel_stay', 'hotel stay', 'short_term', 'accommodation', 'vehicle_change', 'change_permit'],
  uber_income: ['uber', 'skip', 'doordash', 'lyft'],
  self_employment: ['self-employment', 'freelance', 'consulting', 'invoice', 'business', 'gst'],
  // 'insurance' - a rental property's house-insurance statement belongs here.
  rental_income: ['rent', 'rental', 'tenant', 'landlord', 'insurance'],
  capital_gains: ['capital gain', 'stock', 'trading', 'property sale'],
  work_from_home: ['work from home', 't2200', 'home office'],
  tuition: ['tuition', 't2202', 'education', 'school', 'college', 'university'],
  childcare: ['daycare', 'childcare', 'babysitter', 'child care'],
  child_art_sport: ['child_art_sport', 'art_sport', 'art & sport', 'fitness'],
  union_dues: ['union', 'dues'],
  professional_dues: ['professional', 'license', 'certification', 'membership'],
  disability_tax_credit: ['disability', 'dtc'],
  first_time_filer: ['first time', 'landing'],
  rrsp_contributions: ['rrsp', 'fhsa'],
  rent_property_tax: ['property tax', 'rent receipt', 'rl31', 'rl-31', 'province_filer'],
  deceased_return: ['deceased', 'submitter_id', 'death'],
  t183_form: ['t183'],
};

// 'rent' (rental_income) would otherwise swallow "rent receipt"/"property tax"
// uploads that belong to Q19; check these more specific sections first.
const PRIORITY_SECTIONS = ['rent_property_tax', 'child_art_sport', 'uber_income'];

// Compared with every non-alphanumeric character removed, so the app's upload
// categories ("T4A_P", "T4A_OAS") and the on-screen labels ("T4A(P)") both match.
const T_SLIP_LABELS = new Set([
  'T4', 'T4A', 'T5', 'T5008', 'T4AP', 'T4RSP', 'T4E', 'T4AOAS', 'T3', 'T4RIF',
]);

type DocLike = {
  sectionKey?: string | null;
  name?: string | null;
  type?: string | null;
  document_type?: string | null;
  documentType?: string | null;
};

/** Returns the section key for a document, or '__other__'. */
export function classifyDocSection(doc: DocLike, knownSections?: Record<string, unknown>): string {
  const explicit = doc.sectionKey || '';
  if (explicit && (!knownSections || explicit in knownSections || explicit in DOC_SECTION_KEYWORDS)) {
    return explicit;
  }
  // Q1 T-slip upload slots are keyed by the bare slip label ("T4", "T4A(P)").
  const bare = String(doc.document_type || doc.documentType || doc.name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (T_SLIP_LABELS.has(bare)) return 'available_documents';
  const hay = [doc.name, doc.document_type, doc.documentType, doc.type]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  const matches = (sk: string) =>
    (DOC_SECTION_KEYWORDS[sk] || []).some((kw) => hay.some((h) => h.includes(kw)));
  for (const sk of PRIORITY_SECTIONS) if (matches(sk)) return sk;
  for (const sk of Object.keys(DOC_SECTION_KEYWORDS)) if (matches(sk)) return sk;
  return '__other__';
}

/**
 * Documents the client explicitly marked "not available" in the app
 * (answers `unavailableDocuments.<key> = true`). Keys are upload-slot ids such
 * as "donation_receipt_0" or a label such as "Moving Expense Receipts".
 */
export function unavailableDocsForSection(
  unavailable: Record<string, unknown> | undefined | null,
  sectionKey: string,
): string[] {
  if (!unavailable) return [];
  return Object.entries(unavailable)
    .filter(([, v]) => v === true || v === 'true')
    .map(([k]) => k)
    .filter((k) => classifyDocSection({ name: k }) === sectionKey);
}

/** "donation_receipt_0" -> "Donation Receipt 1"; labels pass through. */
export function prettifyDocKey(key: string): string {
  if (/[A-Z]/.test(key) || key.includes(' ')) return key;
  const m = key.match(/^(.*?)_(\d+)$/);
  const base = (m ? m[1] : key)
    .split(/[_-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return m ? `${base} ${Number(m[2]) + 1}` : base;
}

const slotId = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Drops "not available" keys that already have an uploaded file for the same slot.
 * A file the client actually uploaded beats a leftover unavailable flag (the app applies
 * the same rule on its Documents tab), so one document is never shown as both.
 */
export function withoutUploadedSlots(keys: string[], docs: DocLike[]): string[] {
  const uploaded = new Set<string>();
  for (const d of docs) {
    for (const v of [d.document_type, d.documentType]) if (v) uploaded.add(slotId(v));
  }
  return keys.filter((k) => !uploaded.has(slotId(k)));
}
