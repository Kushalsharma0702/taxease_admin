// tests/t1FormAdapter.test.mjs - checks that client-saved answers actually reach
// the admin screen through convertApiDataToFormData (the adapter rebuilds some
// sections field by field, so a field it does not copy silently disappears).
//
// No test runner is configured in this repo; this is a standalone script like
// the Python test_*.py files. Node >= 24 runs the .ts adapter directly:
//     node tests/t1FormAdapter.test.mjs
import { convertApiDataToFormData as conv } from "../src/lib/t1FormAdapter.ts";
let pass = 0, total = 0;
const eq = (name, got, want) => { total++; const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };
const a = (k, v) => ({ field_key: k, value: v });
const data = conv({ answers: [
  a("hasMovingExpenses", true), a("movingExpenseForIndividual", true),
  a("movingExpenseIndividual.oldAddress", "1 Old St, Halifax"),
  a("movingExpenseIndividual.oldAddressStreet", "1 Old St"), a("movingExpenseIndividual.oldAddressCity", "Halifax"),
  a("movingExpenseIndividual.oldAddressProvince", "NS"),
  a("movingExpenseIndividual.newAddressStreet", "9 New Ave"), a("movingExpenseIndividual.newAddressCity", "Calgary"),
  a("movingExpenseIndividual.newAddressProvince", "AB"), a("movingExpenseIndividual.newAddressPostalCode", "T2P 1A1"),
  a("movingExpenseIndividual.newEmployerAddress", "5 Work Rd, Calgary"),
  a("movingExpenseIndividual.newEmployerAddressStreet", "5 Work Rd"), a("movingExpenseIndividual.newEmployerAddressCity", "Calgary"),
  a("movingExpenseIndividual.newEmployerAddressProvince", "AB"), a("movingExpenseIndividual.newEmployerAddressPostalCode", "T2P 2B2"),
  a("movingExpenseIndividual.airTicketCost", "420"),
  a("isFilingForDeceased", true), a("deceasedReturnInfo.deceasedMailingAddress", "7 Elm St, Ajax"),
  a("deceasedReturnInfo.deceasedMailingAddressStreet", "7 Elm St"), a("deceasedReturnInfo.deceasedMailingAddressCity", "Ajax"),
  a("deceasedReturnInfo.legalRepresentativeAddressCity", "Oshawa"),
  a("movingExpenseForSpouse", true), a("movingExpenseSpouse.newAddressCity", "Calgary"), a("movingExpenseSpouse.airTicketCost", "300"),
  a("hasWorkFromHomeExpense", true), a("workFromHome.rentExpense", "1000"), a("workFromHome.mortgageExpense", "750"),
  a("personalInfo.firstName", "Sam"),
  a("personalInfo.children[0].firstName", "Ava"), a("personalInfo.children[0].middleName", "Rose"),
  a("personalInfo.children[1].firstName", "Leo"), a("personalInfo.children[1].middleName", "James"),
]});
const m = data.movingExpenses || {}, ms = data.movingExpensesSpouse || {};
eq("7.7 moving old street reaches admin", m.oldAddressStreet, "1 Old St");
eq("7.7 moving old city/province", [m.oldAddressCity, m.oldAddressProvince], ["Halifax", "NS"]);
eq("7.7 moving new street/city/prov/postal", [m.newAddressStreet, m.newAddressCity, m.newAddressProvince, m.newAddressPostalCode], ["9 New Ave", "Calgary", "AB", "T2P 1A1"]);
eq("7.7 legacy one-line address still present", m.oldAddress, "1 Old St, Halifax");
eq("7.7 moving employer address breakdown reaches admin", [m.employerAddress, m.employerAddressStreet, m.employerAddressCity, m.employerAddressProvince, m.employerAddressPostalCode], ["5 Work Rd, Calgary", "5 Work Rd", "Calgary", "AB", "T2P 2B2"]);
eq("7.7 deceased + legal rep address breakdown reaches admin", [data.deceasedReturn?.deceasedMailingAddressStreet, data.deceasedReturn?.deceasedMailingAddressCity, data.deceasedReturn?.legalRepresentativeAddressCity], ["7 Elm St", "Ajax", "Oshawa"]);
eq("7.7 spouse structured address reaches admin", ms.newAddressCity, "Calgary");
eq("7.7 empty parts are not invented", "oldAddressAptSuite" in m, false);
eq("7.21 air ticket cost carried", [m.airTicketsCost, ms.airTicketsCost], [420, 300]);
const w = data.workFromHome || {};
eq("7.15 WFH mortgage expense reaches admin", [w.rentExpense, w.mortgageExpense], [1000, 750]);
const kids = (data.personalInfo || {}).children || [];
eq("7.6 child middle names (two children)", kids.map((k) => k.middleName), ["Rose", "James"]);
// single child with no middle name must not break or invent one
const one = conv({ answers: [a("personalInfo.children[0].firstName", "Zed")] });
eq("7.6 single child without middle name", (one.personalInfo.children || []).map((k) => k.middleName), [""]);

const d2 = conv({ answers: [
  a("selfEmployment.generalBusiness.purchasesDuringYear", "1000"), a("selfEmployment.generalBusiness.purchasesDuringYearHst", "130"),
  a("selfEmployment.generalBusiness.subcontractsHst", "26"), a("selfEmployment.generalBusiness.otherCostsHst", "13"),
  a("selfEmployment.generalBusiness.minusHstCollected", "200"),
  a("selfEmployment.generalBusiness.openingInventoryHst", "11"), a("selfEmployment.generalBusiness.directWageCostsHst", "22"), a("selfEmployment.generalBusiness.purchaseReturnsHst", "33"),
  a("rentalIncome[0].propertyTaxes", "3000"), a("rentalIncome[0].houseInsurance", "900"),
  a("rentalIncome[0].ccaOtherDetails", "Fridge"), a("rentalIncome[0].ccaOtherAmount", "650"), a("rentalIncome[0].ccaOtherPurchaseDate", "2025-03-01"),
]});
const gb = (d2.selfEmployment || {}).generalBusiness || {};
eq("7.2 COGS HST fields reach admin", [gb.purchasesDuringYearHst, gb.subcontractsHst, gb.otherCostsHst], ["130", "26", "13"]);
eq("7.2 minus HST collected", gb.minusHstCollected, "200");
eq("7.2 HST next to opening inventory, direct wages, purchase returns", [gb.openingInventoryHst, gb.directWageCostsHst, gb.purchaseReturnsHst], ["11", "22", "33"]);
const rent = (d2.selfEmployment || {}).rentalIncome || d2.rentalIncome || [];
const r = rent[0] || {};
eq("7.10 rental CCA (other) details/amount/date", [r.ccaOtherDetails, r.ccaOtherAmount, r.ccaOtherPurchaseDate], ["Fridge", "650", "2025-03-01"]);
eq("7.11 rental property tax + house insurance", [r.propertyTaxes, r.houseInsurance], ["3000", "900"]);

// Q20: every disability member the client adds must reach the admin (they used to collapse into one)
const mem = (i, first, rel, yr) => [a(`disabilityClaimMembers[${i}].firstName`, first), a(`disabilityClaimMembers[${i}].lastName`, "Rao"),
  a(`disabilityClaimMembers[${i}].relation`, rel), a(`disabilityClaimMembers[${i}].approvedYear`, yr), a(`disabilityClaimMembers[${i}].fromYear`, "2022")];
const three = conv({ answers: [a("hasDisabilityTaxCredit", true), ...mem(0, "Asha", "Spouse", "2024"), ...mem(1, "Ben", "Child", "2023"), ...mem(2, "Cara", "Parent", "2021"), a("disabilityMemberCount", 3)] });
eq("Q20 all three members reach the admin, in order", three.disabilityTaxCredit.map((d) => d.firstName), ["Asha", "Ben", "Cara"]);
eq("Q20 each member keeps its own relation and year", three.disabilityTaxCredit.map((d) => [d.relation, String(d.approvedYear)]), [["Spouse", "2024"], ["Child", "2023"], ["Parent", "2021"]]);
const removed = conv({ answers: [a("hasDisabilityTaxCredit", true), ...mem(0, "Asha", "Spouse", "2024"), ...mem(1, "Ben", "Child", "2023"), ...mem(2, "Cara", "Parent", "2021"), a("disabilityMemberCount", 2)] });
eq("Q20 a member the client removed (old keys still on the server) is not shown", removed.disabilityTaxCredit.map((d) => d.firstName), ["Asha", "Ben"]);
const legacy = conv({ answers: [a("hasDisabilityTaxCredit", true), a("hasDisabilityTaxCredit.first_name", "Asha"), a("hasDisabilityTaxCredit.last_name", "Rao"), a("hasDisabilityTaxCredit.relation", "Spouse"), a("hasDisabilityTaxCredit.approved_year", "2024")] });
eq("Q20 an older draft (one set of index-free keys) still shows its one member", legacy.disabilityTaxCredit.map((d) => [d.firstName, d.relation, d.approvedYear]), [["Asha", "Spouse", "2024"]]);
const gap = conv({ answers: [a("hasDisabilityTaxCredit", true), ...mem(0, "Asha", "Spouse", "2024"), ...mem(2, "Cara", "Parent", "2021")] });
eq("Q20 an index with no data does not show as an empty member", gap.disabilityTaxCredit.map((d) => d.firstName), ["Asha", "Cara"]);
eq("Q20 no members: nothing shown", conv({ answers: [a("hasDisabilityTaxCredit", false)] }).disabilityTaxCredit, []);

console.log(`${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
