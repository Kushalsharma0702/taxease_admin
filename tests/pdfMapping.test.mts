// Generates a real PDF from a fixture shaped like a filled-in app form and checks that the text of the
// fields the admin screen shows is in it. Run: npx vite-node tests/pdfMapping.test.mts
import { jsPDF } from 'jspdf';
import { exportClientPDF } from '../src/lib/pdfExport';


let captured = '';
// jsPDF copies its API onto each instance, so the hook goes on jsPDF.API (not the prototype).
(jsPDF as any).API.save = function () { captured = this.output(); };

const a = (field_key: string, value: unknown) => ({ field_key, value });
const t1FormData: any = { id: 'f1', answers: [
  a('personalInfo.firstName', 'Bhagya'), a('personalInfo.lastName', 'Nov'), a('personalInfo.sin', '123456789'),
  a('personalInfo.maritalStatus', 'married'), a('personalInfo.isCanadianCitizen', true),
  a('personalInfo.spouseInfo.firstName', 'Spouse'), a('personalInfo.spouseInfo.isCanadianCitizen', true),
  a('personalInfo.spouseInfo.dateOfMarriageOrSeparation', '2025-06-05'), a('personalInfo.spouseInfo.marriageInTaxYear', true),
  a('hasMovingExpenses', true), a('movingExpenseForIndividual', true),
  a('movingExpenseIndividual.oldAddressStreet', '1 Old St'), a('movingExpenseIndividual.oldAddressCity', 'Halifax'),
  a('movingExpenseIndividual.newAddressStreet', '9 New Ave'), a('movingExpenseIndividual.newAddressCity', 'Calgary'),
  a('movingExpenseIndividual.travelHotelName', 'Hotel Lux'), a('movingExpenseIndividual.travelHotelNights', 3), a('movingExpenseIndividual.travelHotelCost', 450),
  a('movingExpenseIndividual.tempLivingHotelName', 'Stay Inn'), a('movingExpenseIndividual.tempLivingNights', 14), a('movingExpenseIndividual.tempLivingCost', 1400),
  a('movingExpenseIndividual.companyName', 'Acme Corp'), a('movingExpenseIndividual.dateOfJoining', '2025-04-12'),
  a('movingExpenseIndividual.newEmployerAddress', '5 Work Rd, Calgary'), a('movingExpenseIndividual.newEmployerAddressStreet', '5 Work Rd'),
  a('movingExpenseIndividual.newEmployerAddressCity', 'Calgary'), a('movingExpenseIndividual.grossIncomeAfterMoving', 52000),
  a('isSelfEmployed', true), a('selfEmployment.hasUberSkipDoorDash', true),
  a('uploadedDocuments.uber_income_uber_ride', '36658'), a('uploadedDocuments.uber_income_doordash', '556'), a('uploadedDocuments.uber_income_lyft', '585'),
  a('selfEmployment.hasRentalIncome', true), a('selfEmployment.rentalIncome.propertyAddress', '12 York St, Toronto'),
  a('selfEmployment.rentalIncome.coOwnerPartner1', 'Pat Coowner'),
  a('uploadedDocuments.rental_coowner1_street', '88 Maple Rd'), a('uploadedDocuments.rental_coowner1_apt', 'Unit 12B'),
  a('uploadedDocuments.rental_coowner1_city', 'Ajax'),
  a('isProvinceFiler', true), a('provinceFilerEntries[0].province', 'ON'), a('provinceFilerEntries[0].postalCode', 'M5J 0A9'),
  a('provinceFilerEntries[0].monthsResides', 11), a('provinceFilerEntries[0].propertyAddress', '12 York St'),
  a('provinceFilerEntries[0].propertyStreet', '12 York St'), a('provinceFilerEntries[0].propertyAptSuite', 'Unit 907'), a('provinceFilerEntries[0].propertyCity', 'Toronto'), a('provinceFilerEntries[0].propertyProvince', 'Ontario'),
  a('hasOtherIncome', true), a('otherIncomeDescription', 'Cash tutoring'), a('otherIncomeAmount', 1250.5),
  a('isFilingForDeceased', true), a('deceasedReturnInfo.deceasedFullName', 'Late Person'),
  a('deceasedReturnInfo.deceasedMailingAddress', '7 Elm St, Ajax'), a('deceasedReturnInfo.deceasedMailingAddressStreet', '7 Elm St'),
  a('deceasedReturnInfo.deceasedMailingAddressCity', 'Ajax'), a('deceasedReturnInfo.legalRepresentativeAddressCity', 'Oshawa'),
]};

await exportClientPDF({
  client: { id: 'c1', name: 'Bhagya Nov', email: 'b@example.com', phone: '', filingYear: 2025, status: 'in_preparation', paymentStatus: 'pending', totalAmount: 0, paidAmount: 0, createdAt: new Date(), updatedAt: new Date() } as any,
  documents: [
    // phone photos: the file name says nothing, the category the app tagged them with does
    { id: 'd1', name: 'scaled_slip_t4.jpg', type: 'jpg', document_type: 'T4', status: 'approved', client_id: 'c1', uploaded_at: new Date(), version: 1 },
    { id: 'd2', name: 'scaled_air_ticket.jpg', type: 'jpg', document_type: 'air_ticket_receipts', status: 'pending', client_id: 'c1', uploaded_at: new Date(), version: 1 },
    { id: 'd3', name: 'scaled_utility_bill.jpg', type: 'jpg', document_type: 'Utility Bill', status: 'pending', client_id: 'c1', uploaded_at: new Date(), version: 1 },
    // the server files this rental upload under Professional Dues; it belongs to Rental Income
    { id: 'd4', name: 'scaled_legal_fees.jpg', type: 'jpg', document_type: 'Legal and Professional Fees Receipt', sectionKey: 'professional_dues', status: 'pending', client_id: 'c1', uploaded_at: new Date(), version: 1 },
    { id: 'd5', name: 'scaled_deceased_id.jpg', type: 'jpg', document_type: 'deceased_submitter_id', status: 'pending', client_id: 'c1', uploaded_at: new Date(), version: 1 },
  ] as any, payments: [], notes: [], taxFiles: [], t1FormData,
});

// jsPDF writes text as (escaped string) Tj in uncompressed content streams
const text = [...captured.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => m[1].replace(/\\([()\\])/g, '$1')).join('\n');
let bad = 0;
const has = (name: string, needle: string) => { const ok = text.includes(needle); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  (missing "${needle}")`)); };

has('personal: Canadian Citizen', 'Canadian Citizen');
has('spouse: date labelled by marital status (married)', 'Date of Marriage');
has('spouse: Married in Tax Year', 'Married in Tax Year');
has('moving: travel hotel name', 'Hotel Lux');
has('moving: travel hotel nights label', 'Travel Hotel Nights');
has('moving: temporary living hotel', 'Stay Inn');
has('moving: temporary living cost label', 'Temporary Living Cost');
has('moving: company name', 'Acme Corp');
has('moving: employer address breakdown', '5 Work Rd, Calgary');
has('moving: income earned after move', 'Income Earned After Move');
has('uber: Uber Ride income by service', 'Uber Ride Income');
has('uber: DoorDash income by service', 'DoorDash Income');
has('uber: Lyft income amount', '585');
has('rental: co-owner address includes the apt / suite / unit', 'Unit 12B');
has('Q15: description of income', 'Cash tutoring');
has('Q15: amount as its own value', '1,250.50');
has('Q15: column heading', 'Description of income');
has('Q19: postal code', 'M5J 0A9');
has('Q19: street', '12 York St');
has('Q19: apt / suite / unit', 'Unit 907');
has('Q19: city', 'Toronto');
has('Q19: address province', 'Ontario');
has('Q19: months resides column', 'No. Of Months Resides');
has('deceased: structured mailing address', '7 Elm St, Ajax');
// each document must sit under its own question: after that question's header, before the next one
const between = (name: string, file: string, from: string, to: string) => {
  const a = text.indexOf(from), b = text.indexOf(to, a + 1), f = text.indexOf(file);
  const ok = a >= 0 && b > a && f > a && f < b;
  if (!ok) bad++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  (header ${a}, file ${f}, next header ${b})`));
};
between('docs: T4 photo is listed under Q1 slips', 'scaled_slip_t4.jpg', 'Q1: Available Documents', 'Q1: Employment Income');
between('docs: air ticket photo is listed under Q5 moving', 'scaled_air_ticket.jpg', 'Q5: Moving Expenses', 'Q6: Self-Employment');
between('docs: utility bill photo is listed under the rental income part of Q6', 'scaled_utility_bill.jpg', 'Q6: Self-Employment', 'Q7: First Home Purchase');
between('docs: Legal and Professional Fees Receipt is under Q6 rental, not Q16 professional dues', 'scaled_legal_fees.jpg', 'Q6: Self-Employment', 'Q7: First Home Purchase');
between('docs: deceased submitter ID is listed under Q21', 'scaled_deceased_id.jpg', 'Q21: Filing for a Deceased Person', 'All Documents Summary');
console.log(bad === 0 ? 'ALL PASSED' : `${bad} FAILED`);
process.exit(bad ? 1 : 0);
