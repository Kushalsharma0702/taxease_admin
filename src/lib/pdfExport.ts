import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have types
import autoTable from 'jspdf-autotable';
import { Client, Document, Payment, Note, TaxFile, T1Questionnaire } from '@/types';
import { formatCurrency, formatDate } from './utils';
import { getT1FormData } from '@/data/mockT1FormData';
import { convertApiDataToFormData } from './t1FormAdapter';
import { CATEGORY_TO_SECTION_KEY } from './api/config';

interface PDFExportOptions {
  client: Client;
  documents: Document[];
  payments: Payment[];
  notes: Note[];
  taxFiles: TaxFile[];
  questionnaire?: T1Questionnaire;
  /** Raw T1 form from GET /users/{id}/t1-form-data — `{ ..., answers: [...] }`. */
  t1FormData?: any;
}

// Section configuration for T1 form
const T1_SECTIONS = [
  { key: 'FOREIGN_PROPERTY', title: 'Q1: Foreign Property (> CAN$100,000)', dataKey: 'foreignProperty' },
  { key: 'MEDICAL_EXPENSES', title: 'Q2: Medical Expenses', dataKey: 'medicalExpenses' },
  { key: 'CHARITABLE_DONATIONS', title: 'Q3: Charitable Donations', dataKey: 'charitableDonations' },
  { key: 'MOVING_EXPENSES', title: 'Q4: Moving Expenses (Province Change)', dataKey: 'movingExpenses' },
  { key: 'SELF_EMPLOYMENT', title: 'Q5: Self-Employment Income', dataKey: 'selfEmployment' },
  { key: 'WORK_FROM_HOME', title: 'Q6: Work From Home Expenses', dataKey: 'workFromHome' },
  { key: 'TUITION', title: 'Q7: Tuition & Education', dataKey: 'tuition' },
  { key: 'UNION_DUES', title: 'Q8: Union Dues', dataKey: 'unionDues' },
  { key: 'DAYCARE', title: 'Q9: Daycare Expenses', dataKey: 'childcare' },
  { key: 'PROFESSIONAL_DUES', title: 'Q10: Professional Dues', dataKey: 'professionalDues' },
  { key: 'RRSP', title: 'Q11: RRSP/FHSA Contributions', dataKey: 'rrspContributions' },
  { key: 'DISABILITY', title: 'Q12: Disability Tax Credit', dataKey: 'disabilityTaxCredit' },
  { key: 'CAPITAL_GAINS', title: 'Q13: Capital Gains', dataKey: 'capitalGains' },
  { key: 'RENTAL_INCOME', title: 'Q14: Rental Income', dataKey: 'selfEmployment.rentalIncome' },
  { key: 'FIRST_TIME_FILER', title: 'Q15: First Time Filer', dataKey: 'firstTimeFiler' },
  { key: 'EMPLOYMENT_INCOME', title: 'Employment Income', dataKey: 'employmentIncome' },
  { key: 'INVESTMENT_INCOME', title: 'Investment Income', dataKey: 'investmentIncome' },
];

// Keywords to match documents to sections
const SECTION_KEYWORDS: Record<string, string[]> = {
  'FOREIGN_PROPERTY': ['foreign', 'us income', 'dtaa', 'overseas'],
  'MEDICAL_EXPENSES': ['medical', 'hospital', 'health', 'pharmacy', 'doctor', 'medicine', 'clinic', 'fortis', 'apollo'],
  'CHARITABLE_DONATIONS': ['donation', 'charity', 'ngo', 'trust', 'pm cares', 'cry', 'charitable'],
  'MOVING_EXPENSES': ['moving', 'relocation', 'transport'],
  'SELF_EMPLOYMENT': ['self-employment', 'freelance', 'consulting', 'invoice', 'business', 'gst', 'uber', 'skip'],
  'WORK_FROM_HOME': ['work from home', 't2200', 'home office'],
  'TUITION': ['tuition', 't2202', 'education', 'school', 'college', 'university'],
  'UNION_DUES': ['union', 'dues'],
  'DAYCARE': ['daycare', 'childcare', 'babysitter', 'child care'],
  'PROFESSIONAL_DUES': ['professional', 'license', 'certification', 'membership'],
  'RRSP': ['rrsp', 'fhsa', 'ppf', 'epf', 'nps', 'lic', 'insurance premium'],
  'DISABILITY': ['disability', 'dtc'],
  'CAPITAL_GAINS': ['capital gain', 'stock', 'trading', 'zerodha', 'groww', 'mutual fund', 'redemption'],
  'RENTAL_INCOME': ['rent', 'rental', 'tenant', 'property tax', 'landlord'],
  'EMPLOYMENT_INCOME': ['form 16', 'salary', 'employment', 'employer'],
  'INVESTMENT_INCOME': ['investment', 'fd', 'dividend', 'interest certificate', 'mutual fund statement'],
};

function getDocsForSection(sectionKey: string, documents: Document[]): Document[] {
  const keywords = SECTION_KEYWORDS[sectionKey] || [];
  return documents.filter((d) => {
    if (d.sectionKey === sectionKey) return true;
    const docNameLower = d.name.toLowerCase();
    return keywords.some(keyword => docNameLower.includes(keyword.toLowerCase()));
  });
}

function formatAddress(address: string | { street: string; city: string; province: string; postalCode: string }): string {
  if (typeof address === 'string') return address;
  return `${address.street}, ${address.city}, ${address.province} ${address.postalCode}`;
}

export async function exportClientPDF(options: PDFExportOptions): Promise<void> {
  const { client, documents, payments, notes, taxFiles, questionnaire } = options;
  const doc = new jsPDF();
  let yPosition = 20;

  // Real answers first. This used to read
  //   questionnaire?.questions?.length ? null : getT1FormData(client.id)
  // — i.e. it deliberately threw the data away the moment a client actually
  // had answers, leaving every section "Not Applicable" and every personal
  // detail "N/A". convertApiDataToFormData is the same adapter the on-screen
  // Detailed Data tab uses, so the PDF now matches what the admin sees.
  // `any`: the adapter's inferred shape and the mock's T1FormData differ in
  // dozens of optional fields, and every read below is already defensive.
  const t1FormData: any =
    convertApiDataToFormData(options.t1FormData) ??
    (questionnaire?.questions?.length ? null : getT1FormData(client.id));

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Helper to add clickable document link
  const addDocumentLink = (document: Document, xPos: number, yPos: number): number => {
    const statusText = document.status === 'approved' ? '✓' : document.status === 'missing' ? '✗' : '○';
    const statusColor = document.status === 'approved' ? [0, 128, 0] : document.status === 'missing' ? [255, 0, 0] : [128, 128, 128];
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusText, xPos, yPos);
    
    doc.setTextColor(0, 0, 255);
    doc.setFont('helvetica', 'normal');
    const linkText = document.name;
    const textWidth = doc.getTextWidth(linkText);
    doc.text(linkText, xPos + 5, yPos);
    
    // Add clickable link if URL exists
    if (document.url) {
      doc.link(xPos + 5, yPos - 3, textWidth, 4, { url: document.url });
    }
    
    doc.setTextColor(0, 0, 0);
    return yPos + 5;
  };

  // Helper to add section header
  const addSectionHeader = (title: string, applicable: boolean) => {
    checkNewPage(30);
    doc.setFillColor(applicable ? 66 : 128, applicable ? 139 : 128, applicable ? 202 : 128);
    doc.rect(14, yPosition - 5, doc.internal.pageSize.width - 28, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 16, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 8;
    
    if (!applicable) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text('Not Applicable', 16, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;
    }
  };

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 139, 202);
  doc.text('T1 Personal Tax Form', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${client.name} - Tax Year ${client.filingYear}`, 14, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 15;

  // ============ PERSONAL INFORMATION ============
  addSectionHeader('Individual Information', true);
  const pi = t1FormData?.personalInfo;
  const personalData = [
    ['Full Name', pi ? `${pi.firstName} ${pi.middleName || ''} ${pi.lastName}`.trim() : client.name || 'N/A'],
    ['SIN', pi?.sin || 'N/A'],
    ['Date of Birth', pi?.dateOfBirth || 'N/A'],
    ['Marital Status', pi?.maritalStatus || 'N/A'],
    ['Email', pi?.email || client.email || 'N/A'],
    ['Phone', pi?.phone || client.phone || 'N/A'],
    ['Address', pi?.currentAddress ? formatAddress(pi.currentAddress) : 'N/A'],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: personalData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  } as any);

  yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 30;

  // ============ SPOUSE INFORMATION ============
  if (pi?.spouseInfo) {
    const sp = pi.spouseInfo;
    checkNewPage(40);
    addSectionHeader('Spouse Information', true);
    const spouseData = [
      ['Full Name', `${sp.firstName || ''} ${sp.middleName || ''} ${sp.lastName || ''}`.trim() || 'N/A'],
      ['SIN', sp.sin || 'N/A'],
      ['Date of Birth', sp.dateOfBirth || 'N/A'],
      ['Email', sp.email || 'N/A'],
      ['Phone', sp.phoneNumber || 'N/A'],
      ['Address', sp.street ? `${sp.street}, ${sp.city || ''}, ${sp.province || ''} ${sp.postalCode || ''}` : 'N/A'],
      ['Date of Marriage/Separation', sp.dateOfMarriageOrSeparation || 'N/A'],
      ...(sp.receivesSpousePayment ? [['Spousal Support Payment', formatCurrency(sp.supportPaymentAmount || 0)]] : []),
    ];
    autoTable(doc, {
      startY: yPosition,
      body: spouseData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 30;
  }

  // ============ CHILDREN / DEPENDENTS ============
  if (pi?.children && pi.children.length > 0) {
    checkNewPage(30);
    addSectionHeader('Children / Dependents', true);
    const childRows = pi.children.map((c: any) => [
      `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      c.dateOfBirth || 'N/A',
      c.sin || 'N/A',
    ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Name', 'Date of Birth', 'SIN']],
      body: childRows,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 30;
  }

  // ============ QUESTIONNAIRE ANSWERS (RAW) ============
  // Only rendered as a last resort: `question` here is a prettified field_key
  // ("MedicalExpenses.0.PatientName"), not a real question title, so it is
  // suppressed whenever the structured sections below have data to print.
  if (!t1FormData && questionnaire?.questions?.length) {
    checkNewPage(40);
    addSectionHeader('Questionnaire Answers (Live Data)', true);

    const answerRows = questionnaire.questions.map((q, idx) => [
      `Q${idx + 1}`,
      q.question || 'N/A',
      q.answer === '' || q.answer === null || q.answer === undefined ? 'N/A' : String(q.answer),
      q.category || 'General',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Question', 'Answer', 'Category']],
      body: answerRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 90 },
        2: { cellWidth: 35 },
        3: { cellWidth: 40 },
      },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 8 || yPosition + 25;
  }

  // ============ T1 FORM SECTIONS ============
  
  // Q1: Foreign Property
  const hasForeignProperty = t1FormData?.foreignProperty && t1FormData.foreignProperty.length > 0;
  addSectionHeader('Q1: Foreign Property (> CAN$100,000)', hasForeignProperty);
  
  if (hasForeignProperty) {
    const fpData = t1FormData.foreignProperty!.map(fp => [
      fp.investmentDetails || fp.propertyType || '',
      formatCurrency(fp.grossIncome),
      formatCurrency(fp.gainLoss || 0),
      fp.country,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Investment Details', 'Gross Income', 'Gain/Loss', 'Country']],
      body: fpData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 20;
    
    // Add documents for this section
    const fpDocs = getDocsForSection('FOREIGN_PROPERTY', documents);
    if (fpDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      fpDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q2: Medical Expenses
  const hasMedical = t1FormData?.medicalExpenses && t1FormData.medicalExpenses.length > 0;
  addSectionHeader('Q2: Medical Expenses', hasMedical);
  
  if (hasMedical) {
    const medData = t1FormData.medicalExpenses!.map(m => [
      m.paymentDate,
      m.patientName,
      m.paymentMadeTo || m.providerName || '',
      formatCurrency(m.amountPaid),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Patient', 'Provider', 'Amount']],
      body: medData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 3 || yPosition + 20;
    
    const totalMedical = t1FormData.medicalExpenses!.reduce((sum, m) => sum + m.amountPaid, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Medical Expenses: ${formatCurrency(totalMedical)}`, 16, yPosition);
    yPosition += 5;
    
    // Add documents
    const medDocs = getDocsForSection('MEDICAL_EXPENSES', documents);
    if (medDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      medDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q3: Charitable Donations
  const hasDonations = t1FormData?.charitableDonations && t1FormData.charitableDonations.length > 0;
  addSectionHeader('Q3: Charitable Donations', hasDonations);
  
  if (hasDonations) {
    const donData = t1FormData.charitableDonations!.map(d => [
      d.organizationName,
      formatCurrency(d.amountPaid),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Organization', 'Amount']],
      body: donData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 3 || yPosition + 20;
    
    const totalDonations = t1FormData.charitableDonations!.reduce((sum, d) => sum + d.amountPaid, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Charitable Donations: ${formatCurrency(totalDonations)}`, 16, yPosition);
    yPosition += 5;
    
    // Add documents
    const donDocs = getDocsForSection('CHARITABLE_DONATIONS', documents);
    if (donDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      donDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(255, 0, 0);
      doc.text('⚠ Missing: Charitable Donation Receipts', 16, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
    }
    yPosition += 5;
  }

  // Q4: Moving Expenses
  const hasMoving = t1FormData?.movingExpenses?.applicable;
  addSectionHeader('Q4: Moving Expenses (Province Change)', hasMoving);
  
  if (hasMoving && t1FormData.movingExpenses) {
    const me = t1FormData.movingExpenses;
    checkNewPage(60);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Addresses & Distances', 16, yPosition);
    yPosition += 5;
    
    const movingAddressData = [
      ['Old Address', formatAddress(me.oldAddress)],
      ['New Address', formatAddress(me.newAddress)],
      ['Distance Old → New', me.distanceFromOldToNew || 'N/A'],
      ['Distance New → Office', me.distanceFromNewToOffice || 'N/A'],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: movingAddressData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 20;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Travel & Logistics Costs', 16, yPosition);
    yPosition += 5;
    
    const movingCostData = [
      ['Date of Travel', me.dateOfTravel || me.dateOfTravel || 'N/A'],
      ['Air Tickets', formatCurrency(me.airTicketCost || me.airTicketsCost || 0)],
      ['Movers & Packers', formatCurrency(me.moversAndPackers || me.moversPackersCost || 0)],
      ['Meals & Other', formatCurrency(me.mealsAndOtherCost || me.travelMealsCost || 0)],
      ['Other Costs', formatCurrency(me.anyOtherCost || me.otherMovingCosts || 0)],
      ['Total Moving Cost', formatCurrency(me.totalMovingCost || 0)],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: movingCostData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 20;
    
    // Add documents
    const movDocs = getDocsForSection('MOVING_EXPENSES', documents);
    if (movDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      movDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  if (t1FormData?.movingExpenseForSpouse && t1FormData.movingExpensesSpouse) {
    const mes = t1FormData.movingExpensesSpouse;
    checkNewPage(50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Moving Expenses — Spouse', 16, yPosition);
    yPosition += 5;

    const spouseMoveData = [
      ['Old Address', formatAddress(mes.oldAddress)],
      ['New Address', formatAddress(mes.newAddress)],
      ['Date of Travel', mes.dateOfTravel || 'N/A'],
      ['Air Tickets', formatCurrency(mes.airTicketsCost || 0)],
      ['Movers & Packers', formatCurrency(mes.moversPackersCost || 0)],
      ['Meals & Other', formatCurrency(mes.travelMealsCost || 0)],
      ['Other Costs', formatCurrency(mes.otherMovingCosts || 0)],
      ['Total Moving Cost', formatCurrency(mes.totalMovingCost || 0)],
    ];
    autoTable(doc, {
      startY: yPosition,
      body: spouseMoveData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 20;
  }

  // Q5: Self-Employment
  const hasSelfEmployment = t1FormData?.selfEmployment && (t1FormData.selfEmployment.hasUberSkipDoorDash || t1FormData.selfEmployment.hasGeneralBusiness || t1FormData.selfEmployment.hasRentalIncome || t1FormData.selfEmployment.rentalIncome?.length > 0);
  addSectionHeader('Q5: Self-Employment Income', hasSelfEmployment);
  
  if (hasSelfEmployment && t1FormData.selfEmployment) {
    const se = t1FormData.selfEmployment;
    
    if (se.hasUberSkipDoorDash && se.uberIncome) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Uber/Skip/DoorDash Income', 16, yPosition);
      yPosition += 5;
      
      const uberData = [
        ['Gross Income', formatCurrency(se.uberIncome.income || se.uberIncome.grossIncome || 0)],
        ['Total Expenses', formatCurrency(se.uberIncome.totalExpenses || 0)],
        ['Net Income', formatCurrency(se.uberIncome.netIncome || 0)],
      ];

      autoTable(doc, {
        startY: yPosition,
        body: uberData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
      } as any);

      yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    }
    
    if (se.hasGeneralBusiness && se.generalBusiness) {
      const gb = se.generalBusiness;
      checkNewPage(60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('General Business Income', 16, yPosition);
      yPosition += 5;

      const bizData = [
        ['Business Name', gb.businessName || 'N/A'],
        ['HST Number', gb.hstNumber || 'N/A'],
        ['Sales / Commissions / Fees', formatCurrency(gb.salesCommissionsFees || 0)],
        ['Minus HST Collected', formatCurrency(gb.minusHstCollected || 0)],
        ['Gross Income', formatCurrency(gb.grossIncome || 0)],
        ['Total Expenses', formatCurrency(gb.totalExpenses || 0)],
        ['Net Income', formatCurrency(gb.netIncome || 0)],
      ];
      autoTable(doc, {
        startY: yPosition,
        body: bizData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      } as any);
      yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;

      const expenseLines: [string, string][] = [
        ['Advertising', 'advertising'], ['Meals & Entertainment', 'mealsEntertainment'],
        ['Bad Debts', 'badDebts'], ['Insurance', 'insurance'], ['Interest', 'interest'],
        ['Fees, Licenses & Dues', 'feesLicensesDues'], ['Office Expenses', 'officeExpenses'],
        ['Supplies', 'supplies'], ['Legal & Accounting Fees', 'legalAccountingFees'],
        ['Management & Administration', 'managementAdministration'], ['Office Rent', 'officeRent'],
        ['Maintenance & Repairs', 'maintenanceRepairs'], ['Salaries, Wages & Benefits', 'salariesWagesBenefits'],
        ['Property Tax', 'propertyTax'], ['Travel', 'travel'], ['Telephone & Utilities', 'telephoneUtilities'],
        ['Fuel Costs', 'fuelCosts'], ['Delivery / Freight / Express', 'deliveryFreightExpress'],
      ];
      const expenseRows = expenseLines
        .filter(([, key]) => (gb[key] || 0) > 0 || (gb.businessExpenseHst?.[key] || 0) > 0)
        .map(([label, key]) => [label, formatCurrency(gb[key] || 0), formatCurrency(gb.businessExpenseHst?.[key] || 0)]);
      if (expenseRows.length > 0) {
        checkNewPage(20 + expenseRows.length * 6);
        autoTable(doc, {
          startY: yPosition,
          head: [['Operating Expense', 'Amount', 'HST']],
          body: expenseRows,
          theme: 'grid',
          headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
          styles: { fontSize: 8 },
        } as any);
        yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
      }
    }

    if (se.rentalIncome && se.rentalIncome.length > 0) {
      se.rentalIncome.forEach((rent: any, idx: number) => {
        checkNewPage(50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rental Property ${idx + 1}${rent.propertyAddress ? ': ' + rent.propertyAddress : ''}`, 16, yPosition);
        yPosition += 5;

        const rentData = [
          ['Gross Rental Income', formatCurrency(rent.grossRentalIncome || 0)],
          ['Property Taxes', formatCurrency(rent.propertyTaxes || 0)],
          ['Insurance', formatCurrency(rent.insurance ?? rent.houseInsurance ?? 0)],
          ['Mortgage Interest', formatCurrency(rent.mortgageInterest || 0)],
          ['Repairs & Maintenance', formatCurrency(rent.repairsAndMaintenance ?? rent.repairAndMaintenance ?? 0)],
          ['Utilities', formatCurrency(rent.utilities || 0)],
          ['Management Fees', formatCurrency(rent.managementFees ?? rent.managementAdminFees ?? 0)],
          ['Total Expenses', formatCurrency(rent.totalExpenses || 0)],
          ['Net Rental Income', formatCurrency(rent.netRentalIncome || 0)],
        ];
        autoTable(doc, {
          startY: yPosition,
          body: rentData,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
        } as any);
        yPosition = (doc as any).lastAutoTable?.finalY + 3 || yPosition + 15;

        const coOwners = [1, 2, 3]
          .map((n) => ({ n, name: rent[`coOwnerPartner${n}`] }))
          .filter((c) => c.name);
        if (coOwners.length > 0) {
          const docs = t1FormData.uploadedDocuments || {};
          const coOwnerRows = coOwners.map(({ n, name }) => [
            name,
            docs[`rental_coowner${n}_sin`] || 'N/A',
            docs[`rental_coowner${n}_dob`] || 'N/A',
            [docs[`rental_coowner${n}_street`], docs[`rental_coowner${n}_city`], docs[`rental_coowner${n}_province`], docs[`rental_coowner${n}_postal`]]
              .filter(Boolean).join(', ') || 'N/A',
          ]);
          autoTable(doc, {
            startY: yPosition,
            head: [['Co-owner', 'SIN', 'Date of Birth', 'Address']],
            body: coOwnerRows,
            theme: 'grid',
            headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
            styles: { fontSize: 8 },
          } as any);
          yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
        }
      });
    }

    // Add documents
    const seDocs = getDocsForSection('SELF_EMPLOYMENT', documents);
    if (seDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      seDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q6: Work From Home
  const hasWFH = t1FormData?.hasWorkFromHomeExpense || t1FormData?.workFromHome || t1FormData?.wfhIndividual || t1FormData?.wfhSpouse;
  addSectionHeader('Q6: Work From Home Expenses', hasWFH);

  if (hasWFH) {
    const wfhEntries: [string, any][] = [];
    if (t1FormData.workFromHomeForIndividual && t1FormData.wfhIndividual) wfhEntries.push(['Individual', t1FormData.wfhIndividual]);
    if (t1FormData.workFromHomeForSpouse && t1FormData.wfhSpouse) wfhEntries.push(['Spouse', t1FormData.wfhSpouse]);
    if (wfhEntries.length === 0 && t1FormData.workFromHome) wfhEntries.push(['Work From Home', t1FormData.workFromHome]);

    wfhEntries.forEach(([label, wfh]) => {
      checkNewPage(45);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 16, yPosition);
      yPosition += 5;
      const wfhData = [
        ['Total Home Area', `${wfh.totalHomeArea || 0} sq.ft`],
        ['Work Area', `${wfh.workArea || 0} sq.ft`],
        ['Rent Expense', formatCurrency(wfh.rentExpense || 0)],
        ['Mortgage Interest', formatCurrency(wfh.mortgageInterest || 0)],
        ['Internet Expense', formatCurrency(wfh.internetExpense || 0)],
        ['Utilities', formatCurrency(wfh.utilities || 0)],
        ['Water', formatCurrency(wfh.waterExpense || 0)],
        ['Heat', formatCurrency(wfh.heatExpense || 0)],
        ['Home Insurance', formatCurrency(wfh.homeInsurance || 0)],
        ['Claimable Amount', formatCurrency(wfh.claimableAmount || 0)],
      ];
      autoTable(doc, {
        startY: yPosition,
        body: wfhData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
      } as any);
      yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    });

    const wfhDocs = getDocsForSection('WORK_FROM_HOME', documents);
    if (wfhDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      wfhDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q7: Tuition
  const hasTuition = t1FormData?.tuition && t1FormData.tuition.length > 0;
  addSectionHeader('Q7: Tuition & Education', hasTuition);
  
  if (hasTuition) {
    const tuitionData = t1FormData.tuition!.map(t => [
      t.studentName,
      t.institutionName,
      t.programName,
      formatCurrency(t.tuitionFees),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Student', 'Institution', 'Program', 'Tuition']],
      body: tuitionData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    
    const tuitionDocs = getDocsForSection('TUITION', documents);
    if (tuitionDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      tuitionDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q8: Union Dues
  const hasUnion = t1FormData?.unionDues && t1FormData.unionDues.length > 0;
  addSectionHeader('Q8: Union Dues', hasUnion);
  
  if (hasUnion) {
    const unionData = t1FormData.unionDues!.map(u => [
      u.institutionName || u.unionName || '',
      formatCurrency(u.amountPaid),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Institution/Union', 'Amount']],
      body: unionData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    
    const unionDocs = getDocsForSection('UNION_DUES', documents);
    if (unionDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      unionDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q9: Daycare
  const hasDaycare = t1FormData?.childcare && t1FormData.childcare.length > 0;
  addSectionHeader('Q9: Daycare Expenses', hasDaycare);
  
  if (hasDaycare) {
    const daycareData = t1FormData.childcare!.map(c => [
      c.providerName,
      c.childName || '',
      formatCurrency(c.amountPaid),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Provider', 'Child', 'Amount']],
      body: daycareData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    
    const daycareDocs = getDocsForSection('DAYCARE', documents);
    if (daycareDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      daycareDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // Q10: Professional Dues
  const hasProfDues = t1FormData?.professionalDues && t1FormData.professionalDues.length > 0;
  addSectionHeader('Q10: Professional Dues', hasProfDues);
  if (hasProfDues) {
    const profRows = t1FormData.professionalDues.map((p: any) => [
      p.memberName || p.name || 'N/A',
      p.organizationName || p.organization || 'N/A',
      formatCurrency(p.amountPaid || 0),
    ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Member Name', 'Organization', 'Amount']],
      body: profRows,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 25;
  }

  // Q11: RRSP/FHSA
  addSectionHeader('Q11: RRSP/FHSA Contributions', !!t1FormData?.hasRrspFhsaInvestment);

  // Q12: Disability Tax Credit
  const hasDisability = t1FormData?.disabilityTaxCredit && t1FormData.disabilityTaxCredit.length > 0;
  addSectionHeader('Q12: Disability Tax Credit', hasDisability);
  if (hasDisability) {
    const dtcRows = t1FormData.disabilityTaxCredit.map((m: any) => [
      `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'N/A',
      m.relation || 'N/A',
      m.approvedYear || 'N/A',
      [m.fromYear, m.toYear].filter(Boolean).join(' - ') || 'N/A',
    ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Name', 'Relation', 'CRA Approval Year', 'Approved Period']],
      body: dtcRows,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 25;
  }

  // Q13: Capital Gains (Property Sale)
  const hasCapitalGains = !!t1FormData?.propertySaleLongTerm || !!t1FormData?.propertySaleShortTerm;
  addSectionHeader('Q13: Capital Gains', hasCapitalGains);
  if (hasCapitalGains) {
    [
      ['Property Sale (Held > 365 days)', t1FormData.propertySaleLongTerm],
      ['Property Sale (Held < 365 days)', t1FormData.propertySaleShortTerm],
    ].forEach(([label, ps]: [string, any]) => {
      if (!ps) return;
      checkNewPage(35);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 16, yPosition);
      yPosition += 5;
      const psData = [
        ['Property Address', ps.propertyAddress || 'N/A'],
        ['Purchase Date', ps.purchaseDate || 'N/A'],
        ['Sell Date', ps.sellDate || 'N/A'],
        ['Purchase & Sell Expenses', formatCurrency(ps.purchaseSellExpenses || 0)],
        ['Capital Gain Earned', formatCurrency(ps.capitalGainEarned || 0)],
      ];
      autoTable(doc, {
        startY: yPosition,
        body: psData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      } as any);
      yPosition = (doc as any).lastAutoTable?.finalY + 8 || yPosition + 25;
    });
  }

  // Q15: First-Time Filer
  const hasFirstTimeFiler = !!t1FormData?.firstTimeFilerIndividual || !!t1FormData?.firstTimeFilerSpouse;
  addSectionHeader('Q15: First-Time Filer', hasFirstTimeFiler);
  if (hasFirstTimeFiler) {
    [
      ['Individual', t1FormData.firstTimeFilerIndividual],
      ['Spouse', t1FormData.firstTimeFilerSpouse],
    ].forEach(([label, f]: [string, any]) => {
      if (!f) return;
      checkNewPage(30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 16, yPosition);
      yPosition += 5;
      const ftfData = [
        ['Date of Landing', f.dateOfLanding || 'N/A'],
        ['Income Outside Canada (CAD)', formatCurrency(f.incomeOutsideCanada || 0)],
        ['Back Home Income 2024 (CAD)', formatCurrency(f.backHomeIncome2024 || 0)],
        ['Back Home Income 2023 (CAD)', formatCurrency(f.backHomeIncome2023 || 0)],
      ];
      autoTable(doc, {
        startY: yPosition,
        body: ftfData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      } as any);
      yPosition = (doc as any).lastAutoTable?.finalY + 8 || yPosition + 25;
    });
  }

  // Rent or Property Tax (Province Filer)
  const hasProvinceFiler = t1FormData?.provinceFilerEntries && t1FormData.provinceFilerEntries.length > 0;
  addSectionHeader('Rent or Property Tax', hasProvinceFiler);
  if (hasProvinceFiler) {
    const pfRows = t1FormData.provinceFilerEntries.map((e: any) => [
      e.province || 'N/A',
      e.rentOrPropertyTax || 'N/A',
      e.propertyAddress || 'N/A',
      formatCurrency(e.amountPaid ?? e.rentOrPropertyTaxAmount ?? 0),
    ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Province', 'Rent/Property Tax', 'Address', 'Amount Paid']],
      body: pfRows,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 25;
  }

  // Other Income
  const hasOtherIncome = t1FormData?.otherIncome && t1FormData.otherIncome.length > 0;
  addSectionHeader('Other Income', hasOtherIncome);
  if (hasOtherIncome) {
    const oiRows = t1FormData.otherIncome.map((o: any) => [o.description || 'N/A', formatCurrency(o.amount || 0)]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Amount']],
      body: oiRows,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 25;
  }

  // Deceased Return
  if (t1FormData?.deceasedReturn) {
    const dr = t1FormData.deceasedReturn;
    checkNewPage(45);
    addSectionHeader('Filing for Deceased Person', true);
    const drData = [
      ['Name of Deceased', dr.deceasedFullName || 'N/A'],
      ['Date of Death', dr.dateOfDeath || 'N/A'],
      ['Deceased SIN', dr.deceasedSin || 'N/A'],
      ['Mailing Address', dr.deceasedMailingAddress || 'N/A'],
      ['Legal Representative', dr.legalRepresentativeName || 'N/A'],
      ['Legal Rep. Contact', dr.legalRepresentativeContactNumber || 'N/A'],
      ['Legal Rep. Address', dr.legalRepresentativeAddress || 'N/A'],
    ];
    autoTable(doc, {
      startY: yPosition,
      body: drData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    } as any);
    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 25;
  }

  // Employment Income Section
  const hasEmployment = t1FormData?.employmentIncome && t1FormData.employmentIncome.length > 0;
  addSectionHeader('Employment Income (Form 16)', hasEmployment);
  
  if (hasEmployment) {
    t1FormData.employmentIncome!.forEach((emp, idx) => {
      checkNewPage(40);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Employer ${idx + 1}: ${emp.employerName}`, 16, yPosition);
      yPosition += 5;
      
      const empData = [
        ['Employment Income', formatCurrency(emp.t4Box14)],
        ['Income Tax Deducted', formatCurrency(emp.t4Box22)],
        ['CPP Contributions', formatCurrency(emp.t4Box16)],
        ['EI Premiums', formatCurrency(emp.t4Box18)],
      ];

      autoTable(doc, {
        startY: yPosition,
        body: empData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
      } as any);

      yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    });
    
    const empDocs = getDocsForSection('EMPLOYMENT_INCOME', documents);
    if (empDocs.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Supporting Documents:', 16, yPosition);
      yPosition += 5;
      empDocs.forEach((d) => {
        yPosition = addDocumentLink(d, 20, yPosition);
      });
    }
    yPosition += 5;
  }

  // ============ PAYMENT HISTORY ============
  if (payments.length > 0) {
    checkNewPage(60);
    addSectionHeader('Payment History', true);

    const paymentRows = payments.map(payment => [
      formatCurrency(payment.amount),
      payment.isRequest && payment.status === 'pending' ? 'Requested' : (payment.method || 'N/A'),
      formatDate(payment.createdAt),
      payment.createdBy,
      payment.note || '',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Amount', 'Method/Status', 'Date', 'Created By', 'Note']],
      body: paymentRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 30;
  }

  // ============ ALL DOCUMENTS SUMMARY ============
  checkNewPage(60);
  addSectionHeader('All Documents Summary', documents.length > 0);
  
  if (documents.length > 0) {
    const docRows = documents.map(d => [
      d.name,
      d.type,
      d.status,
      d.uploadedAt ? formatDate(d.uploadedAt) : 'Not Uploaded',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Document Name', 'Type', 'Status', 'Upload Date']],
      body: docRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
      styles: { fontSize: 8 },
      didDrawCell: (data: any) => {
        // Color status cells
        if (data.section === 'body' && data.column.index === 2) {
          const status = data.cell.raw;
          if (status === 'approved') {
            doc.setTextColor(0, 128, 0);
          } else if (status === 'missing') {
            doc.setTextColor(255, 0, 0);
          } else if (status === 'pending') {
            doc.setTextColor(255, 165, 0);
          }
        }
      },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 30;
  }

  // ============ DOCUMENT LINKS (Clickable) ============
  const docsWithUrls = documents.filter(d => d.url);
  if (docsWithUrls.length > 0) {
    checkNewPage(40);
    addSectionHeader('Document Downloads (Click to Open)', true);
    
    docsWithUrls.forEach((document) => {
      checkNewPage(10);
      yPosition = addDocumentLink(document, 16, yPosition);
    });
    yPosition += 5;
  }

  // ============ NOTES ============
  if (notes.length > 0) {
    checkNewPage(40);
    addSectionHeader('Notes & Communication', true);

    notes.forEach((note, index) => {
      checkNewPage(30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Note ${index + 1}`, 16, yPosition);
      yPosition += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(note.content, 175);
      doc.text(noteLines, 16, yPosition);
      yPosition += noteLines.length * 4 + 3;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text(`By: ${note.authorName} | ${formatDate(note.createdAt)} | ${note.isClientFacing ? 'Client Visible' : 'Internal'}`, 16, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;
    });
  }

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages?.() || (doc as any).getNumberOfPages?.() || 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | ${client.name} - T1 Tax Form Export | Tax Year ${client.filingYear}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const dateStr = formatDate(new Date()).replace(/[\/\-]/g, '_');
  const fileName = `T1_${client.name.replace(/\s+/g, '_')}_${client.filingYear}_${dateStr}.pdf`;
  doc.save(fileName);
}
