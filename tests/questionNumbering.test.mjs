// Client app question numbers are the master. The admin detail screen and the PDF export
// must use the SAME number for the SAME question (Q1 = available documents ... Q21 = deceased).
// Reads the Flutter source in the sibling repo, so run from the monorepo checkout:
//     node tests/questionNumbering.test.mjs
import fs from "node:fs";
const dart = fs.readFileSync(new URL("../../tax_ease_app_client/lib/features/tax_forms/presentation/widgets/t1_questionnaire_1_step.dart", import.meta.url), "utf8");
const admin = fs.readFileSync(new URL("../src/components/client/T1CRAReadyForm.tsx", import.meta.url), "utf8");
const pdf = fs.readFileSync(new URL("../src/lib/pdfExport.ts", import.meta.url), "utf8");

// One keyword per question that must appear in BOTH the client wording and the admin/PDF title.
const EXPECT = { 1: "documents", 2: "foreign", 3: "medical", 4: "charitable", 5: "province", 6: "self", 7: "first home", 8: "365", 9: "365",
  10: "work from home", 11: "student|tuition", 12: "union", 13: "day ?care", 14: "first time|first-time", 15: "other income", 16: "professional",
  17: "rrsp", 18: "children", 19: "ontario", 20: "disability", 21: "died|deceased" };
let pass = 0, total = 0; const eq = (n, ok, d = "") => { total++; if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  " + d)); };

const client = {}; for (const m of dart.matchAll(/'(\d{1,2})\. (.{4,90})/g)) client[+m[1]] ??= m[2];   // .+ : Q18 has an escaped apostrophe
const adminT = {}; for (const m of admin.matchAll(/title="Q(\d{1,2}): ([^"]+)"/g)) adminT[+m[1]] = m[2];
const pdfT = {}; for (const m of pdf.matchAll(/addSectionHeader\((?:"Q(\d{1,2}): ([^"]+)"|'Q(\d{1,2}): ([^']+)')/g)) pdfT[+(m[1] || m[3])] ??= m[2] || m[4];

eq("client app has questions 1..21", Object.keys(client).length === 21 && Object.keys(client).map(Number).every((n, i) => n === i + 1), Object.keys(client).join());
for (let n = 1; n <= 21; n++) {
  const re = new RegExp(EXPECT[n], "i");
  eq(`Q${n} client wording matches the keyword (sanity)`, re.test(client[n] || ""), client[n]);
  eq(`Q${n} admin screen title = same question`, re.test(adminT[n] || ""), `admin: ${adminT[n]}`);
  eq(`Q${n} PDF heading = same question`, re.test(pdfT[n] || ""), `pdf: ${pdfT[n]}`);
}
console.log(`\n${pass}/${total} passed`); process.exit(pass === total ? 0 : 1);
