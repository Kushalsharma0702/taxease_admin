// Audit: every upload slot the app defines must land in the same T1 section whether the client
// UPLOADED a file or marked it UNAVAILABLE, on both admin tabs.
// Run: npx tsx tests/docSlotAudit.mts   (server sections below are what services/admin-api computes)
import { classifyDocSection as c } from '../src/lib/documentSections.ts';

type Row = { key: string; expected?: string; serverSk: string | null };
const INLINE: Row[] = [
 {
  "key": "T4",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T4A",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T5",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T5008",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T4A_P",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T4RSP",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T4E",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T4A_OAS",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T3",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "T4RIF",
  "expected": "available_documents",
  "serverSk": null
 },
 {
  "key": "t2200",
  "expected": "work_from_home",
  "serverSk": "work_from_home"
 },
 {
  "key": "t2200_spouse",
  "expected": "work_from_home",
  "serverSk": "work_from_home"
 },
 {
  "key": "t2202",
  "expected": "tuition",
  "serverSk": "tuition"
 },
 {
  "key": "union_dues_0",
  "expected": "union_dues",
  "serverSk": "union_dues"
 },
 {
  "key": "daycare_receipt_0",
  "expected": "childcare",
  "serverSk": "childcare"
 },
 {
  "key": "professional_dues_0",
  "expected": "professional_dues",
  "serverSk": "professional_dues"
 },
 {
  "key": "rrsp_fhsa_0",
  "expected": "rrsp_contributions",
  "serverSk": "rrsp_contributions"
 },
 {
  "key": "child_art_sport_0",
  "expected": "child_art_sport",
  "serverSk": "child_art_sport"
 },
 {
  "key": "province_filer_0",
  "expected": "rent_property_tax",
  "serverSk": "rent_property_tax"
 },
 {
  "key": "rl31_form_0",
  "expected": "rent_property_tax",
  "serverSk": "rent_property_tax"
 },
 {
  "key": "cra_disability_approval_0",
  "expected": "disability_tax_credit",
  "serverSk": "disability_tax_credit"
 },
 {
  "key": "donation_receipt_0",
  "expected": "charitable_donations",
  "serverSk": "charitable_donations"
 },
 {
  "key": "air_ticket_receipts",
  "expected": "moving_expenses",
  "serverSk": null
 },
 {
  "key": "meals_receipt",
  "expected": "moving_expenses",
  "serverSk": null
 },
 {
  "key": "moving_expense_receipts",
  "expected": "moving_expenses",
  "serverSk": "moving_expenses"
 },
 {
  "key": "hotel_stay_receipts",
  "expected": "moving_expenses",
  "serverSk": "moving_expenses"
 },
 {
  "key": "short_term_accommodation",
  "expected": "moving_expenses",
  "serverSk": "moving_expenses"
 },
 {
  "key": "deceased_submitter_id",
  "expected": "deceased_return",
  "serverSk": "deceased_return"
 },
 {
  "key": "uber_statement_uber",
  "expected": "uber_income",
  "serverSk": "self_employment"
 },
 {
  "key": "uber_statement_skip",
  "expected": "uber_income",
  "serverSk": "self_employment"
 },
 {
  "key": "uber_car_purchase_receipt",
  "expected": "uber_income",
  "serverSk": "self_employment"
 },
 {
  "key": "House Insurance Statement",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Bank Mortgage Statement",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Property Tax Bill",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Utility Bill",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Management / Admin Fees Receipt",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Repair and Maintenance Receipt",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Cleaning Expense Receipt",
  "expected": "rental_income",
  "serverSk": "rental_income"
 },
 {
  "key": "Legal and Professional Fees Receipt",
  "expected": "rental_income",
  "serverSk": "professional_dues"
 },
 {
  "key": "Advertising and Promotion Receipt",
  "expected": "rental_income",
  "serverSk": "rental_income"
 }
];
const LABELS: Row[] = [
 {"key": "Rent / Property Tax Receipt", "serverSk": "rent_property_tax"},
 {
  "key": "Disability Approval form",
  "serverSk": "disability_tax_credit"
 },
 {
  "key": "Clearance Certificate",
  "serverSk": null
 },
 {
  "key": "Charitable Donation Receipts",
  "serverSk": "charitable_donations"
 },
 {
  "key": "Moving Expense",
  "serverSk": "moving_expenses"
 },
 {
  "key": "Air Tickets",
  "serverSk": "moving_expenses"
 },
 {
  "key": "Meals receipts (Optional)",
  "serverSk": null
 },
 {
  "key": "Hotel stay receipts \u2013 14 nights accommodation on the first move",
  "serverSk": "moving_expenses"
 },
 {
  "key": "Short term accomodation in between provinces",
  "serverSk": null
 },
 {
  "key": "Uber Income Statement",
  "serverSk": "self_employment"
 },
 {
  "key": "Skip Income Statement",
  "serverSk": "self_employment"
 },
 {
  "key": "Uber Eats Statement",
  "serverSk": "self_employment"
 },
 {
  "key": "Doordash Income Statement",
  "serverSk": "self_employment"
 },
 {
  "key": "U-Ride Income Statement",
  "serverSk": "self_employment"
 },
 {
  "key": "Lyft Income Statement",
  "serverSk": "self_employment"
 },
 {
  "key": "Car purchase Receipt (ONLY IF YOU PURCHASED A CAR)",
  "serverSk": null
 },
 {
  "key": "Car purchase Receipt \u2013 Optional (if you purchased a new car)",
  "serverSk": null
 },
 {
  "key": "RL-31 Form",
  "serverSk": "rent_property_tax"
 },
 {
  "key": "Documents for sale/purchase of residential property",
  "serverSk": "rental_income"
 },
 {
  "key": "House Insurance Statement",
  "serverSk": "rental_income"
 },
 {
  "key": "Bank Mortgage Statement",
  "serverSk": "rental_income"
 },
 {
  "key": "Property Tax Bill",
  "serverSk": "rental_income"
 },
 {
  "key": "Utility Bill",
  "serverSk": "rental_income"
 },
 {
  "key": "Management / Admin Fees Receipt",
  "serverSk": "rental_income"
 },
 {
  "key": "Repair and Maintenance Receipt",
  "serverSk": "rental_income"
 },
 {
  "key": "Cleaning Expense Receipt",
  "serverSk": "rental_income"
 },
 {
  "key": "Legal and Professional Fees Receipt",
  "serverSk": "professional_dues"
 },
 {
  "key": "Advertising and Promotion Receipt",
  "serverSk": "rental_income"
 },
 {
  "key": "T2202 Form",
  "serverSk": "tuition"
 },
 {
  "key": "Union Dues Receipt",
  "serverSk": "union_dues"
 },
 {
  "key": "Day Care Expense Receipts",
  "serverSk": "childcare"
 },
 {
  "key": "Professional Fees Receipt",
  "serverSk": "professional_dues"
 },
 {
  "key": "RRSP/FHSA T-slips",
  "serverSk": "rrsp_contributions"
 },
 {
  "key": "T2200 Form",
  "serverSk": "work_from_home"
 },
 {
  "key": "Spouse T2200 Form",
  "serverSk": "work_from_home"
 },
 {
  "key": "T4",
  "serverSk": null
 },
 {
  "key": "T4A",
  "serverSk": null
 },
 {
  "key": "T5",
  "serverSk": null
 },
 {
  "key": "T5008",
  "serverSk": null
 },
 {
  "key": "T4A(P)",
  "serverSk": null
 },
 {
  "key": "T4RSP",
  "serverSk": null
 },
 {
  "key": "T4E",
  "serverSk": null
 },
 {
  "key": "T4A(OAS)",
  "serverSk": null
 },
 {
  "key": "T3",
  "serverSk": null
 },
 {
  "key": "T4RIF",
  "serverSk": null
 }
];

let bad = 0;
for (const r of INLINE) {
  const up = c({ document_type: r.key, sectionKey: r.serverSk });
  const un = c({ name: r.key });
  if (up !== r.expected || un !== r.expected) { bad++; console.log('FAIL inline', r.key, 'expected', r.expected, 'uploaded', up, 'unavailable', un); }
}
for (const r of LABELS) {
  const up = c({ document_type: r.key, sectionKey: r.serverSk });
  const un = c({ name: r.key });
  // Card labels have no hand-written expectation: they must agree and must never fall into Other
  // (a few optional cards legitimately have none; add them here if that is ever intended).
  if (up !== un || up === '__other__') { bad++; console.log('FAIL label', r.key, 'uploaded', up, 'unavailable', un); }
}
console.log(bad === 0 ? `PASS ${INLINE.length + LABELS.length} slots consistent` : `${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
