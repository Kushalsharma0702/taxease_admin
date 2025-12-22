import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have types
import autoTable from 'jspdf-autotable';
import { Client, Document, Payment, Note, TaxFile } from '@/types';
import { formatCurrency, formatDate } from './utils';

interface PDFExportOptions {
  client: Client;
  documents: Document[];
  payments: Payment[];
  notes: Note[];
  taxFiles: TaxFile[];
}

export async function exportClientPDF(options: PDFExportOptions): Promise<void> {
  const { client, documents, payments, notes, taxFiles } = options;
  const doc = new jsPDF();
  let yPosition = 20;

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information Export', 14, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, yPosition);
  yPosition += 15;

  // Client Overview
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Overview', 14, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const overviewData = [
    ['Client Name', client.name],
    ['Email', client.email],
    ['Phone', client.phone],
    ['Filing Year', client.filingYear.toString()],
    ['Status', client.status],
    ['Payment Status', client.paymentStatus],
    ['Total Amount', formatCurrency(client.totalAmount)],
    ['Paid Amount', formatCurrency(client.paidAmount)],
    ['Balance', formatCurrency(client.totalAmount - client.paidAmount)],
    ['Assigned Admin', client.assignedAdminName || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Field', 'Value']],
    body: overviewData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 9 },
  } as any);

  yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 30;

  // Personal Information
  if (client.personalInfo) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Information', 14, yPosition);
    yPosition += 10;

    const personalData = [
      ['SIN', client.personalInfo.sin],
      ['Date of Birth', formatDate(client.personalInfo.dateOfBirth)],
      ['Marital Status', client.personalInfo.maritalStatus],
    ];

    if (client.personalInfo.address) {
      personalData.push(['Address', 
        `${client.personalInfo.address.street}, ${client.personalInfo.address.city}, ${client.personalInfo.address.province} ${client.personalInfo.address.postalCode}`
      ]);
    }

    if (client.personalInfo.bankInfo) {
      personalData.push(['Bank Institution', client.personalInfo.bankInfo.institution]);
      personalData.push(['Account Number', client.personalInfo.bankInfo.accountNumber]);
    }

    // Spouse Information
    if (client.personalInfo.maritalStatus === 'married' && client.personalInfo.spouseInfo) {
      personalData.push(['--- Spouse Information ---', '']);
      if (client.personalInfo.spouseInfo.fullName) {
        personalData.push(['Spouse Full Name', client.personalInfo.spouseInfo.fullName]);
      }
      if (client.personalInfo.spouseInfo.email) {
        personalData.push(['Spouse Email', client.personalInfo.spouseInfo.email]);
      }
      if (client.personalInfo.spouseInfo.dateOfMarriage) {
        personalData.push(['Date of Marriage', formatDate(client.personalInfo.spouseInfo.dateOfMarriage)]);
      }
      if (client.personalInfo.spouseInfo.incomePastYear !== undefined) {
        personalData.push(['Spouse Income (Past Year)', formatCurrency(client.personalInfo.spouseInfo.incomePastYear)]);
      }
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Field', 'Value']],
      body: personalData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 30;
  }

  // Payment History
  if (payments.length > 0) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment History', 14, yPosition);
    yPosition += 10;

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
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 30;
  }

  // Documents
  if (documents.length > 0) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Documents', 14, yPosition);
    yPosition += 10;

    const documentRows = documents.map(doc => [
      doc.name,
      doc.type,
      doc.status,
      doc.uploadedAt ? formatDate(doc.uploadedAt) : 'N/A',
      doc.url ? 'Available' : 'No URL',
      doc.notes || '',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Document Name', 'Type', 'Status', 'Upload Date', 'Availability', 'Notes']],
      body: documentRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 30;
  }

  // Tax Files
  if (taxFiles.length > 0) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Files', 14, yPosition);
    yPosition += 10;

    const taxFileRows = taxFiles.map(tf => [
      tf.refundOrOwing === 'refund' ? 'Refund' : 'Owing',
      formatCurrency(tf.amount),
      tf.status,
      formatDate(tf.createdAt),
      tf.note || '',
      tf.t1ReturnUrl ? 'Yes' : 'No',
      tf.t183FormUrl ? 'Yes' : 'No',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Amount', 'Status', 'Created Date', 'Note', 'T1 Return', 'T183 Form']],
      body: taxFileRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
    } as any);

    yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 30;
  }

  // Notes
  if (notes.length > 0) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes & Communication', 14, yPosition);
    yPosition += 10;

    notes.forEach((note, index) => {
      checkNewPage(40);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Note ${index + 1}`, 14, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(note.content, 180);
      doc.text(noteLines, 14, yPosition);
      yPosition += noteLines.length * 5 + 3;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`By: ${note.authorName} | Date: ${formatDate(note.createdAt)} | ${note.isClientFacing ? 'Client Visible' : 'Internal'}`, 14, yPosition);
      yPosition += 10;
    });
  }

  // Document Links Section
  if (documents.some(d => d.url)) {
    checkNewPage(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Document URLs', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    documents.filter(d => d.url).forEach((document) => {
      checkNewPage(15);
      doc.setFont('helvetica', 'bold');
      doc.text(`${document.name}:`, 14, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 255);
      const urlLines = doc.splitTextToSize(document.url || '', 180);
      doc.text(urlLines, 20, yPosition);
      yPosition += urlLines.length * 5 + 5;
      doc.setTextColor(0, 0, 0);
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Page ${i} of ${pageCount} | ${client.name} - Tax Hub Client Export`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const dateStr = formatDate(new Date()).replace(/-/g, '_');
  const fileName = `${client.name.replace(/\s+/g, '_')}_Export_${dateStr}.pdf`;
  doc.save(fileName);
}

