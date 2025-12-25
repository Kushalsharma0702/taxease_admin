import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have types
import autoTable from 'jspdf-autotable';
import { Client, Document, Payment, Note, TaxFile, T1Questionnaire } from '@/types';
import { T1FormData } from '@/types/t1-forms';
import { formatCurrency, formatDate } from './utils';
import { getT1FormData } from '@/data/mockT1FormData';
import { CATEGORY_TO_SECTION_KEY } from './api/config';

interface PDFExportOptions {
  client: Client;
  documents: Document[];
  payments: Payment[];
  notes: Note[];
  taxFiles: TaxFile[];
  questionnaire?: T1Questionnaire;
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

  // Get T1 form data
  const t1FormData = getT1FormData(client.id);

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
  
  if (t1FormData?.personalInfo) {
    const pi = t1FormData.personalInfo;
    const personalData = [
      ['Full Name', `${pi.firstName} ${pi.middleName || ''} ${pi.lastName}`.trim()],
      ['SIN', pi.sin],
      ['Date of Birth', pi.dateOfBirth],
      ['Marital Status', pi.maritalStatus],
      ['Email', pi.email],
      ['Phone', pi.phone],
      ['Address', formatAddress(pi.currentAddress)],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: personalData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 10 || yPosition + 30;
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

  // Q5: Self-Employment
  const hasSelfEmployment = t1FormData?.selfEmployment && (t1FormData.selfEmployment.hasUberSkipDoorDash || t1FormData.selfEmployment.hasGeneralBusiness);
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
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('General Business Income', 16, yPosition);
      yPosition += 5;
      
      const bizData = [
        ['Business Name', se.generalBusiness.businessName],
        ['Gross Income', formatCurrency(se.generalBusiness.grossIncome || 0)],
        ['Total Expenses', formatCurrency(se.generalBusiness.totalExpenses || 0)],
        ['Net Income', formatCurrency(se.generalBusiness.netIncome || 0)],
      ];

      autoTable(doc, {
        startY: yPosition,
        body: bizData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
      } as any);

      yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
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
  const hasWFH = t1FormData?.workFromHome?.hasT2200;
  addSectionHeader('Q6: Work From Home Expenses', hasWFH);
  
  if (hasWFH && t1FormData.workFromHome) {
    const wfh = t1FormData.workFromHome;
    const wfhData = [
      ['Employer Name', wfh.employerName],
      ['Work Area', `${wfh.workArea} sq.ft (${wfh.workAreaPercentage}%)`],
      ['Total Home Area', `${wfh.totalHomeArea} sq.ft`],
      ['Claimable Amount', formatCurrency(wfh.claimableAmount)],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: wfhData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 5 || yPosition + 15;
    
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
