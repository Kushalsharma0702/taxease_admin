import { useState, useMemo, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyableField } from './CopyableField';
import { CopyableTable } from './CopyableTable';
import { T1CRASection } from './T1CRASection';
import { QuestionDocuments } from './QuestionDocuments';
import { getT1FormData } from '@/data/mockT1FormData';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '@/lib/utils';
import { Document as DocType } from '@/types';
import { DOCUMENT_SECTION_KEYS } from '@/lib/api/config';
import {
  Copy,
  Check,
  User,
  Briefcase,
  DollarSign,
  Globe,
  HeartPulse,
  Gift,
  Truck,
  Building2,
  TrendingUp,
  Home,
  GraduationCap,
  Users,
  Baby,
  Plane,
  Receipt,
  Award,
  Palette,
  FileText,
  Calculator,
} from 'lucide-react';

import { convertApiDataToFormData } from '@/lib/t1FormAdapter';


interface T1CRAReadyFormProps {
  clientId: string;
  filingYear: number;
  t1FormData?: any; // Real T1 form data from API
  documents?: DocType[];
  onApproveDoc?: (docId: string) => void;
  onRequestReupload?: (docId: string, reason: string) => void;
  onRequestMissing?: (docName: string, reason: string) => void;
  onViewDoc?: (doc: DocType) => void;
  canEdit?: boolean;
}

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return '$0.00';
  return formatCurrencyUtil(value);
};
const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return 'N/A';
  return `${value}%`;
};
const formatDate = (value: string | undefined | null): string => {
  if (!value || value === 'N/A') return 'N/A';
  return formatDateUtil(value);
};

// Structured address breakdown — Rental Income and both Capital Gains
// sections (long-term and short-term share one underlying model) used to
// show only a single combined address string, unlike every other address on
// this form. `data` carries flat sibling fields (e.g. propertyAddressStreet),
// matching the client's own T1PropertySaleDetails/T1RentalIncome breakdown.
function AddressBreakdown({ data, prefix }: { data: Record<string, any>; prefix: string }) {
  const street = data[`${prefix}Street`];
  const city = data[`${prefix}City`];
  const province = data[`${prefix}Province`];
  if (!street && !city && !province) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3 pl-3 border-l-2 border-border">
      {street && <CopyableField label="Street" value={street} />}
      {data[`${prefix}AptSuite`] && <CopyableField label="Apt / Suite" value={data[`${prefix}AptSuite`]} />}
      {city && <CopyableField label="City" value={city} />}
      {province && <CopyableField label="Province" value={province} />}
      {data[`${prefix}PostalCode`] && <CopyableField label="Postal Code" value={data[`${prefix}PostalCode`]} />}
      {data[`${prefix}Country`] && <CopyableField label="Country" value={data[`${prefix}Country`]} />}
    </div>
  );
}

// Q1 slips: storage keys the in-form upload buttons use -> what the client sees.
const T_SLIP_LABELS: Record<string, string> = { T4A_P: 'T4A(P)', T4A_OAS: 'T4A(OAS)' };
const T_SLIP_DOC_PATTERN = /(^|[^A-Za-z0-9])T(3|4|5|4A|5008|4RSP|4E|4RIF)([^A-Za-z0-9]|$)/i;
// What the app tagged the upload with ("T4", "T4A_P", "uber_statement"). Uploaded files are
// usually phone photos named "scaled_<uuid>.jpg", so the name alone never identifies the document.
type DocFields = { name?: string; type?: string | null; document_type?: string | null; documentType?: string | null };
const docText = (d: DocFields) =>
  `${d.name || ''} ${d.type || ''} ${String(d.document_type ?? d.documentType ?? '').replace(/_/g, ' ')}`;
const isTSlipDoc = (d: DocFields) => T_SLIP_DOC_PATTERN.test(docText(d));

// Ride-share/delivery uploads (Uber, Skip, DoorDash, Lyft, U-Ride statements
// and the car purchase receipt) vs. everything else filed under
// self-employment - lets the two income sub-sections each show their own docs.
const RIDE_SHARE_DOC_PATTERN = /uber|skip|doordash|lyft|u-ride|car_purchase|car purchase/i;
const isRideShareDoc = (d: DocFields) =>
  RIDE_SHARE_DOC_PATTERN.test(`${d.name || ''} ${d.type || ''} ${d.document_type ?? d.documentType ?? ''}`);


// The app saves each ride-share/delivery service's income next to its statement upload, in the
// "uploaded documents" map as uber_income_<service> (e.g. uber_income_uber_ride = "36658").
const rideShareServiceLabel = (key: string) =>
  key.split(/[_-]+/).filter(Boolean)
    .map((w) => (w.toLowerCase() === 'doordash' ? 'DoorDash' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
const getRideShareIncomes = (uploaded: Record<string, unknown> | undefined | null) =>
  Object.entries(uploaded || {})
    .filter(([k, v]) => k.startsWith('uber_income_') && v !== '' && v !== null && v !== undefined && !isNaN(Number(v)))
    .map(([k, v]) => ({ key: k, label: rideShareServiceLabel(k.slice('uber_income_'.length)), amount: Number(v) }));

export function T1CRAReadyForm({ 
  clientId, 
  filingYear,
  t1FormData,
  documents = [],
  onApproveDoc,
  onRequestReupload,
  onRequestMissing,
  onViewDoc,
  canEdit = true,
}: T1CRAReadyFormProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const { toast } = useToast();

  // Use real T1 form data if available, otherwise fall back to mock data
  const formData = useMemo(() => {
    if (t1FormData && t1FormData.answers) {
      // Convert API answers to the format expected by the component
      const converted = convertApiDataToFormData(t1FormData);
      console.log('Converted T1 Form Data:', converted);
      return converted;
    }
    // Fallback to mock data
    console.log('Using mock data for client:', clientId);
    return getT1FormData(clientId);
  }, [t1FormData, clientId]);

  const se = formData?.selfEmployment;
  const rideShareIncomes = getRideShareIncomes(formData?.uploadedDocuments as Record<string, unknown> | undefined);
  const hasUberSection = !!se && (!!se.uberIncome || !!se.hasUberSkipDoorDash || rideShareIncomes.length > 0 || documents.some(isRideShareDoc));
  const hasGeneralBusinessSection = !!se && (!!se.generalBusiness || !!se.hasGeneralBusiness);
  const hasRentalSection = !!se && (!!se.hasRentalIncome || (se.rentalIncome?.length ?? 0) > 0);

  if (!formData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No T1 Form Data</p>
          <p className="text-sm text-muted-foreground mt-1">
            The client has not completed the tax questionnaire yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary totals based on questionnaire responses
  const totalMedical = formData.medicalExpenses?.reduce((sum, m) => sum + m.amountPaid, 0) || 0;
  const totalDonations = formData.charitableDonations?.reduce((sum, d) => sum + d.amountPaid, 0) || 0;
  const totalMovingExpenses = formData.movingExpenses?.totalMovingCost || 0;
  const totalChildcare = formData.childcare?.reduce((sum, c) => sum + c.amountPaid, 0) || 0;

  const handleCopyFullSummary = async () => {
    const lines = [
      `T1 Tax Summary - ${formData.personalInfo.firstName} ${formData.personalInfo.lastName} - Tax Year ${filingYear}`,
      ``,
      `PERSONAL INFORMATION`,
      `Name: ${formData.personalInfo.firstName} ${formData.personalInfo.middleName || ''} ${formData.personalInfo.lastName}`,
      `SIN: ${formData.personalInfo.sin}`,
      `Marital Status: ${formData.personalInfo.maritalStatus}`,
      ``,
      `DEDUCTIONS & EXPENSES`,
      formData.movingExpenses?.applicable ? `Moving Expenses: ${formatCurrency(totalMovingExpenses)}` : null,
      formData.childcare?.length ? `Daycare Expenses: ${formatCurrency(totalChildcare)}` : null,
      formData.unionDues?.length ? `Union Dues: ${formatCurrency(formData.unionDues.reduce((s, u) => s + u.amountPaid, 0))}` : null,
      formData.professionalDues?.length ? `Professional Dues: ${formatCurrency(formData.professionalDues.reduce((s, p) => s + p.amountPaid, 0))}` : null,
      formData.workFromHome ? `Work From Home: Claimed` : null,
      ``,
      `CREDITS`,
      `Medical Expenses: ${formatCurrency(totalMedical)}`,
      `Charitable Donations: ${formatCurrency(totalDonations)}`,
      formData.tuition?.length ? `Education (T2202): Claimed` : null,
      formData.childrenCredits?.length ? `Children's Art & Sport: ${formatCurrency(formData.childrenCredits.reduce((s, c) => s + c.amountPaid, 0))}` : null,
      ``,
      `OTHER INFORMATION`,
      formData.foreignProperty?.length ? `Foreign Property: ${formData.foreignProperty.length} item(s)` : null,
      formData.firstTimeFiler ? `First-Time Filer: Yes` : null,
      formData.selfEmployment ? `Self-Employment: Yes` : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedSummary(true);
      toast({
        title: 'Full Summary Copied!',
        description: 'T1 tax summary copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Copy Full Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            T1 Personal Tax Form
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-filled questionnaire data • Tax Year {filingYear}
          </p>
        </div>
        <Button onClick={handleCopyFullSummary} className="transition-all duration-200 hover:scale-105">
          {copiedSummary ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy T1 Summary
            </>
          )}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Medical Expenses</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalMedical)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Charitable Donations</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalDonations)}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Moving Expenses</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totalMovingExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Daycare Expenses</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(totalChildcare)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Personal Information */}
      <T1CRASection
        title="Individual Information"
        icon={<User className="h-5 w-5 text-primary" />}
        applicable={true}
        sectionData={formData.personalInfo as unknown as Record<string, unknown>}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CopyableField label="First Name" value={formData.personalInfo.firstName} />
          {formData.personalInfo.middleName && (
            <CopyableField label="Middle Name" value={formData.personalInfo.middleName} />
          )}
          <CopyableField label="Last Name" value={formData.personalInfo.lastName} />
          <CopyableField label="SIN (Individual)" value={formData.personalInfo.sin} />
          <CopyableField label="Date of Birth" value={formatDate(formData.personalInfo.dateOfBirth)} />
          <CopyableField label="Street Address" value={formData.personalInfo.currentAddress.street} />
          {formData.personalInfo.currentAddress.aptSuite && (
            <CopyableField label="Apt / Suite / Unit" value={formData.personalInfo.currentAddress.aptSuite} />
          )}
          <CopyableField label="City" value={formData.personalInfo.currentAddress.city} />
          <CopyableField label="Province" value={formData.personalInfo.currentAddress.province} />
          <CopyableField label="Postal Code" value={formData.personalInfo.currentAddress.postalCode} />
          {formData.personalInfo.currentAddress.country && (
            <CopyableField label="Country" value={formData.personalInfo.currentAddress.country} />
          )}
          <CopyableField label="Phone Number" value={formData.personalInfo.phone} />
          <CopyableField label="Email" value={formData.personalInfo.email} />
          <CopyableField label="Canadian Citizen" value={formData.personalInfo.isCanadianCitizen ? 'Yes' : 'No'} />
          <CopyableField label="Marital Status" value={formData.personalInfo.maritalStatus} />
        </div>
      </T1CRASection>

      {/* Spouse Information */}
      {formData.personalInfo.spouseInfo && (
        <T1CRASection
          title="Spouse Information"
          icon={<Users className="h-5 w-5 text-primary" />}
          applicable={true}
          sectionData={formData.personalInfo.spouseInfo as unknown as Record<string, unknown>}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CopyableField label="First Name" value={formData.personalInfo.spouseInfo.firstName} />
            {formData.personalInfo.spouseInfo.middleName && (
              <CopyableField label="Middle Name" value={formData.personalInfo.spouseInfo.middleName} />
            )}
            <CopyableField label="Last Name" value={formData.personalInfo.spouseInfo.lastName} />
            <CopyableField label="SIN (Spouse)" value={formData.personalInfo.spouseInfo.sin} />
            <CopyableField label="Date of Birth" value={formatDate(formData.personalInfo.spouseInfo.dateOfBirth)} />
            <CopyableField label="Canadian Citizen" value={formData.personalInfo.spouseInfo.isCanadianCitizen ? 'Yes' : 'No'} />
            {formData.personalInfo.spouseInfo.email && (
              <CopyableField label="Email" value={formData.personalInfo.spouseInfo.email} />
            )}
            {formData.personalInfo.spouseInfo.phoneNumber && (
              <CopyableField label="Phone Number" value={formData.personalInfo.spouseInfo.phoneNumber} />
            )}
            {formData.personalInfo.spouseInfo.street && (
              <CopyableField label="Street Address" value={formData.personalInfo.spouseInfo.street} />
            )}
            {formData.personalInfo.spouseInfo.city && (
              <CopyableField label="City" value={formData.personalInfo.spouseInfo.city} />
            )}
            {formData.personalInfo.spouseInfo.province && (
              <CopyableField label="Province" value={formData.personalInfo.spouseInfo.province} />
            )}
            {formData.personalInfo.spouseInfo.postalCode && (
              <CopyableField label="Postal Code" value={formData.personalInfo.spouseInfo.postalCode} />
            )}
            {/* One stored date serves several meanings. Label it by the CURRENT marital status
                and hide it when it can't apply (e.g. "married" but not married this year). */}
            {(() => {
              const status = String(formData.personalInfo.maritalStatus || '').toLowerCase();
              const date = formData.personalInfo.spouseInfo.dateOfMarriageOrSeparation;
              const labels: Record<string, string> = {
                married: 'Date of Marriage',
                'common-law': 'Date of Common-Law',
                separated: 'Date of Separation',
                divorced: 'Date of Divorce',
                widowed: 'Date of Death',
              };
              const label = labels[status];
              if (!date || !label) return null;
              const marriedGroup = status === 'married' || status === 'common-law';
              if (marriedGroup && !formData.personalInfo.spouseInfo.marriageInTaxYear) return null;
              return <CopyableField label={label} value={formatDate(date)} />;
            })()}
            {/* Only show the answer that matches the CURRENT marital status: a
                client who briefly picked "Separated" and switched back to
                "Married" can still have a stale separation answer stored. */}
            {formData.personalInfo.spouseInfo.marriageInTaxYear &&
              ['married', 'common-law'].includes(String(formData.personalInfo.maritalStatus || '').toLowerCase()) && (
              <CopyableField label="Married in Tax Year" value="Yes" />
            )}
            {formData.personalInfo.spouseInfo.separationInTaxYear &&
              ['separated', 'divorced', 'widowed'].includes(String(formData.personalInfo.maritalStatus || '').toLowerCase()) && (
              <CopyableField label="Separated in Tax Year" value="Yes" />
            )}
            {formData.personalInfo.spouseInfo.receivesSpousePayment && (
              <CopyableField label="Receives Spousal Support Payment" value="Yes" />
            )}
            {formData.personalInfo.spouseInfo.supportPaymentAmount > 0 && (
              <CopyableField label="Spousal Support Payment Amount" value={formatCurrency(formData.personalInfo.spouseInfo.supportPaymentAmount)} />
            )}
          </div>
        </T1CRASection>
      )}

      {/* Children Details */}
      {formData.personalInfo.children && formData.personalInfo.children.length > 0 && (
        <T1CRASection
          title="Children Details"
          icon={<Baby className="h-5 w-5 text-primary" />}
          applicable={true}
          sectionData={formData.personalInfo.children as unknown as Record<string, unknown>}
        >
          {formData.personalInfo.children.map((child, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              <h4 className="font-medium text-sm mb-3">Child {idx + 1}</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="First Name" value={child.firstName} />
                {child.middleName && (
                  <CopyableField label="Middle Name" value={child.middleName} />
                )}
                <CopyableField label="Last Name" value={child.lastName} />
                {child.sin && <CopyableField label="SIN" value={child.sin} />}
                <CopyableField label="Date of Birth" value={formatDate(child.dateOfBirth)} />
              </div>
              {idx < formData.personalInfo.children.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </T1CRASection>
      )}

      {/* Q1: Do you have any of the following documents? (T-slips) */}
      <T1CRASection
        title="Q1: Do you have any of the following documents?"
        icon={<FileText className="h-5 w-5 text-primary" />}
        applicable={!!formData.availableDocumentTypes?.length}
        sectionData={{ availableDocumentTypes: formData.availableDocumentTypes } as Record<string, unknown>}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Slips the client says they have (each one gets an upload button in the app):</p>
          <div className="flex flex-wrap gap-2">
            {(formData.availableDocumentTypes || []).map((t: string) => (
              <Badge key={t} variant="secondary">{T_SLIP_LABELS[t] || t}</Badge>
            ))}
          </div>
        </div>
        <QuestionDocuments
          sectionKey="AVAILABLE_DOCUMENTS"
          sectionTitle="T-slip Documents"
          documents={documents}
          docFilter={isTSlipDoc}
          requiredDocuments={(formData.availableDocumentTypes || []).map((t: string) => T_SLIP_LABELS[t] || t)}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q2: Foreign Property (> CAN$100,000) */}
      <T1CRASection
        title="Q2: Foreign Property (> CAN$100,000)"
        icon={<Globe className="h-5 w-5 text-primary" />}
        applicable={!!formData.foreignProperty?.length}
        sectionData={formData.foreignProperty as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'investmentDetails', header: 'Investment Details' },
            { key: 'grossIncome', header: 'Gross Income', format: (v) => formatCurrency(v as number) },
            { key: 'gainLoss', header: 'Gain/Loss on sale', format: (v) => formatCurrency(v as number) },
            { key: 'maxCostDuringYear', header: 'Maximum Cost during the year', format: (v) => formatCurrency(v as number) },
            { key: 'costAmountAtYearEnd', header: 'Cost amount at the year end', format: (v) => formatCurrency(v as number) },
            { key: 'country', header: 'Country' },
          ]}
          data={formData.foreignProperty || []}
        />
        <QuestionDocuments
          sectionKey="FOREIGN_PROPERTY"
          sectionTitle="Foreign Property Documents"
          documents={documents}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q3: Medical Expenses */}
      <T1CRASection
        title="Q3: Medical Expenses"
        icon={<HeartPulse className="h-5 w-5 text-primary" />}
        applicable={!!formData.medicalExpenses?.length}
        sectionData={formData.medicalExpenses as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'paymentDate', header: 'Payment Date', format: (v) => formatDate(v as string) },
            { key: 'patientName', header: 'Patient Name' },
            { key: 'paymentMadeTo', header: 'PAYMENT MADE TO' },
            { key: 'descriptionOfExpense', header: 'DESCRIPTION OF EXPENSE' },
            { key: 'insuranceCovered', header: 'INSURANCE COVERED', format: (v) => formatCurrency(v as number) },
            { key: 'amountPaid', header: 'Amount Paid from Pocket', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.medicalExpenses || []}
        />
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Medical Expenses</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(totalMedical)}</span>
          </div>
        </div>
      </T1CRASection>

      {/* Q4: Charitable Donations */}
      <T1CRASection
        title="Q4: Charitable Donations"
        icon={<Gift className="h-5 w-5 text-primary" />}
        applicable={!!formData.charitableDonations?.length}
        sectionData={formData.charitableDonations as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'organizationName', header: 'Organization Name' },
            { key: 'amountPaid', header: 'Amount Paid', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.charitableDonations || []}
        />
        <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Charitable Donations</span>
            <span className="text-lg font-bold text-purple-600">{formatCurrency(totalDonations)}</span>
          </div>
        </div>
        <QuestionDocuments
          sectionKey="CHARITABLE_DONATIONS"
          sectionTitle="Charitable Donation Documents"
          documents={documents}
          requiredDocuments={['Charitable Donation Receipts']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q5: Moving Expenses */}
      <T1CRASection
        title="Q5: Moving Expenses (Province Change)"
        icon={<Truck className="h-5 w-5 text-primary" />}
        applicable={!!formData.hasMovingExpenses || !!formData.movingExpenseForIndividual || !!formData.movingExpenseForSpouse}
        sectionData={formData.movingExpenses as unknown as Record<string, unknown>}
      >
        {[
          formData.movingExpenseForIndividual && formData.movingExpenses
            ? { label: 'Individual Moving Expenses', data: formData.movingExpenses }
            : null,
          formData.movingExpenseForSpouse && formData.movingExpensesSpouse
            ? { label: 'Spouse Moving Expenses', data: formData.movingExpensesSpouse }
            : null,
        ].filter(Boolean).map((entry: any, entryIdx) => (
          <div key={entryIdx} className="space-y-6 mb-6">
            {entryIdx > 0 && <Separator />}
            <h4 className="font-semibold text-base">{entry.label}</h4>
            {/* Addresses & Distances */}
            <div>
              <h5 className="font-medium text-sm text-muted-foreground mb-3">Addresses & Distances</h5>
              <div className="grid gap-3">
                <CopyableField label="Old Address" value={typeof entry.data.oldAddress === 'string' ? entry.data.oldAddress : ''} />
                {/* Structured breakdown — same fields as every other address
                    on this form (Personal Info, Rental, Capital Gains).
                    oldAddress/newAddress above are the legacy combined
                    strings, kept for backward compat with forms submitted
                    before this breakdown existed. */}
                {(entry.data.oldAddressStreet || entry.data.oldAddressCity || entry.data.oldAddressProvince) && (
                  <div className="grid gap-3 sm:grid-cols-3 pl-3 border-l-2 border-border">
                    {entry.data.oldAddressStreet && <CopyableField label="Street" value={entry.data.oldAddressStreet} />}
                    {entry.data.oldAddressAptSuite && <CopyableField label="Apt / Suite" value={entry.data.oldAddressAptSuite} />}
                    {entry.data.oldAddressCity && <CopyableField label="City" value={entry.data.oldAddressCity} />}
                    {entry.data.oldAddressProvince && <CopyableField label="Province" value={entry.data.oldAddressProvince} />}
                    {entry.data.oldAddressPostalCode && <CopyableField label="Postal Code" value={entry.data.oldAddressPostalCode} />}
                    {entry.data.oldAddressCountry && <CopyableField label="Country" value={entry.data.oldAddressCountry} />}
                  </div>
                )}
                <CopyableField label="New Address" value={typeof entry.data.newAddress === 'string' ? entry.data.newAddress : ''} />
                {(entry.data.newAddressStreet || entry.data.newAddressCity || entry.data.newAddressProvince) && (
                  <div className="grid gap-3 sm:grid-cols-3 pl-3 border-l-2 border-border">
                    {entry.data.newAddressStreet && <CopyableField label="Street" value={entry.data.newAddressStreet} />}
                    {entry.data.newAddressAptSuite && <CopyableField label="Apt / Suite" value={entry.data.newAddressAptSuite} />}
                    {entry.data.newAddressCity && <CopyableField label="City" value={entry.data.newAddressCity} />}
                    {entry.data.newAddressProvince && <CopyableField label="Province" value={entry.data.newAddressProvince} />}
                    {entry.data.newAddressPostalCode && <CopyableField label="Postal Code" value={entry.data.newAddressPostalCode} />}
                    {entry.data.newAddressCountry && <CopyableField label="Country" value={entry.data.newAddressCountry} />}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <CopyableField label="Distance Old → New" value={entry.data.distanceFromOldToNew} />
                  <CopyableField label="Distance New → Office" value={entry.data.distanceFromNewToOffice} />
                </div>
              </div>
            </div>
            <Separator />
            {/* Travel & Logistics Costs */}
            <div>
              <h5 className="font-medium text-sm text-muted-foreground mb-3">Travel & Logistics Costs</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="Date of Travel" value={formatDate(entry.data.dateOfTravel)} />
                <CopyableField label="Air Tickets" value={formatCurrency(entry.data.airTicketsCost)} />
                {entry.data.travelHotelName && (
                  <CopyableField label="Travel Hotel Name" value={entry.data.travelHotelName} />
                )}
                {entry.data.travelHotelNights > 0 && (
                  <CopyableField label="Travel Hotel Nights" value={String(entry.data.travelHotelNights)} />
                )}
                {entry.data.travelHotelCost > 0 && (
                  <CopyableField label="Travel Hotel Cost" value={formatCurrency(entry.data.travelHotelCost)} />
                )}
                <CopyableField label="Movers & Packers" value={formatCurrency(entry.data.moversPackersCost)} />
                <CopyableField label="Travel Meals & Accommodation" value={formatCurrency(entry.data.travelMealsCost)} />
                {entry.data.tempLivingHotelName && (
                  <CopyableField label="Temporary Living Hotel" value={entry.data.tempLivingHotelName} />
                )}
                {entry.data.tempLivingNights > 0 && (
                  <CopyableField label="Temporary Living Nights" value={String(entry.data.tempLivingNights)} />
                )}
                {entry.data.tempLivingCost > 0 && (
                  <CopyableField label="Temporary Living Cost" value={formatCurrency(entry.data.tempLivingCost)} />
                )}
                <CopyableField label="Other Moving Costs" value={formatCurrency(entry.data.otherMovingCosts)} />
                <CopyableField label="Total Moving Cost" value={formatCurrency(entry.data.totalMovingCost)} />
              </div>
            </div>
            <Separator />
            {/* Employment Details After Move */}
            <div>
              <h5 className="font-medium text-sm text-muted-foreground mb-3">Employment Details After Move</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="Date of Joining" value={formatDate(entry.data.dateJoinedCompany)} />
                <CopyableField label="Company Name" value={entry.data.companyName} />
                <CopyableField label="Employer Address" value={entry.data.employerAddress} />
                <CopyableField label="Income Earned After Move" value={formatCurrency(entry.data.incomeEarnedAfterMove)} />
              </div>
            </div>
          </div>
        ))}
        <QuestionDocuments
          sectionKey="MOVING_EXPENSES"
          sectionTitle="Moving Expense Documents"
          documents={documents}
          requiredDocuments={['Moving Expense Receipts']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q6 is three sections, in the order the client fills them, each followed by its own documents. */}
      {/* Q6a: Uber / Skip / DoorDash */}
      <T1CRASection
        title="Q6a: Uber / Skip / DoorDash"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        applicable={hasUberSection}
        sectionData={{ ...(se?.uberIncome as unknown as Record<string, unknown>), incomeByService: Object.fromEntries(rideShareIncomes.map((r) => [r.label, r.amount])) }}
      >
        {hasUberSection && (
          <div className="space-y-6">
            {rideShareIncomes.length > 0 && (
              <div>
                <h5 className="font-medium text-sm text-muted-foreground mb-3">Income by Service</h5>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rideShareIncomes.map((r) => (
                    <CopyableField key={r.key} label={`${r.label} Income`} value={formatCurrency(r.amount)} className="font-medium" />
                  ))}
                </div>
              </div>
            )}

            {/* Uber/Skip/DoorDash Income - Full Detail */}
            {formData.selfEmployment.uberIncome && (
              <>
                <Separator />
                <h4 className="font-semibold text-base">Uber/Skip/DoorDash Income</h4>
                
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Statement & HST Information</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <CopyableField label="Uber/Skip Statement" value={formData.selfEmployment.uberIncome.uberSkipStatement || 'N/A'} />
                    <CopyableField label="Business HST Number" value={formData.selfEmployment.uberIncome.businessHstNumber || 'N/A'} />
                    <CopyableField label="HST Access Code" value={formData.selfEmployment.uberIncome.hstAccessCode || 'N/A'} />
                    <CopyableField label="HST Filing Period" value={formData.selfEmployment.uberIncome.hstFillingPeriod || 'N/A'} />
                    {formData.selfEmployment.uberIncome.businessNumberVehicleRegistration && (
                      <CopyableField label="Business # / Vehicle Registration" value={formData.selfEmployment.uberIncome.businessNumberVehicleRegistration} />
                    )}
                    {(formData.selfEmployment.uberIncome.income > 0) && (
                      <CopyableField label="Gross Income" value={formatCurrency(formData.selfEmployment.uberIncome.income)} />
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Kilometers Driven</h5>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <CopyableField label="Total KM for Uber/Skip" value={`${formData.selfEmployment.uberIncome.totalKmForUberSkip || 0} km`} />
                    <CopyableField label="Total Official KM Driven" value={`${formData.selfEmployment.uberIncome.totalOfficialKmDriven || 0} km`} />
                    <CopyableField label="Total KM Driven (Entire Year)" value={`${formData.selfEmployment.uberIncome.totalKmDrivenEntireYear || 0} km`} />
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Operating Expenses</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="Meals" value={formatCurrency(formData.selfEmployment.uberIncome.meals)} />
                    <CopyableField label="Telephone" value={formatCurrency(formData.selfEmployment.uberIncome.telephone)} />
                    <CopyableField label="Parking Fees" value={formatCurrency(formData.selfEmployment.uberIncome.parkingFees)} />
                    <CopyableField label="Cleaning Expenses" value={formatCurrency(formData.selfEmployment.uberIncome.cleaningExpenses)} />
                    <CopyableField label="Safety Inspection" value={formatCurrency(formData.selfEmployment.uberIncome.safetyInspection)} />
                    <CopyableField label="Winter Tire Change" value={formatCurrency(formData.selfEmployment.uberIncome.winterTireChange)} />
                    <CopyableField label="Oil Change & Maintenance" value={formatCurrency(formData.selfEmployment.uberIncome.oilChangeAndMaintenance)} />
                    <CopyableField label="Depreciation" value={formatCurrency(formData.selfEmployment.uberIncome.depreciation)} />
                    <CopyableField label="Insurance on Vehicle" value={formatCurrency(formData.selfEmployment.uberIncome.insuranceOnVehicle)} />
                    <CopyableField label="Gas" value={formatCurrency(formData.selfEmployment.uberIncome.gas)} />
                    <CopyableField label="Financing Cost / Interest" value={formatCurrency(formData.selfEmployment.uberIncome.financingCostInterest)} />
                    <CopyableField label="Lease Cost" value={formatCurrency(formData.selfEmployment.uberIncome.leaseCost)} />
                    <CopyableField label="Other Expense" value={formatCurrency(formData.selfEmployment.uberIncome.otherExpense)} />
                  </div>
                </div>

                {formData.selfEmployment.uberIncome.netIncome > 0 && (
                  <div>
                    <h5 className="font-medium text-sm text-muted-foreground mb-3">Summary</h5>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.uberIncome.netIncome)} className="font-semibold" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Uber/Skip/DoorDash Documents - shown directly under their own sub-section. */}
            <QuestionDocuments
              sectionKey="SELF_EMPLOYMENT"
              sectionTitle="Uber/Skip/DoorDash Documents"
              documents={documents}
              docFilter={isRideShareDoc}
              onApprove={onApproveDoc}
              onRequestReupload={onRequestReupload}
              onRequestMissing={onRequestMissing}
              onView={onViewDoc}
              canEdit={canEdit}
            />

          </div>
        )}
      </T1CRASection>

      {/* Q6b: General Business */}
      <T1CRASection
        title="Q6b: General Business"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        applicable={hasGeneralBusinessSection}
        sectionData={se?.generalBusiness as unknown as Record<string, unknown>}
      >
        {hasGeneralBusinessSection && (
          <div className="space-y-6">
            {/* General Business Income - Full Detail (60+ fields) */}
            {formData.selfEmployment.generalBusiness && (
              <>
                <Separator />
                <h4 className="font-semibold text-base">General Business Income</h4>

                {/* Business Info */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Business Info</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="Client Name" value={formData.selfEmployment.generalBusiness.clientName || 'N/A'} />
                    <CopyableField label="Business Name" value={formData.selfEmployment.generalBusiness.businessName || 'N/A'} />
                    <CopyableField label="HST Number" value={formData.selfEmployment.generalBusiness.hstNumber || 'N/A'} />
                    <CopyableField label="HST Access Code" value={formData.selfEmployment.generalBusiness.hstAccessCode || 'N/A'} />
                    <CopyableField label="HST Filing Period" value={formData.selfEmployment.generalBusiness.hstFilingPeriod || 'N/A'} />
                  </div>
                </div>

                {/* Income & Cost of Goods Sold */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Income & Cost of Goods Sold</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="Sales / Commissions / Fees" value={formatCurrency(formData.selfEmployment.generalBusiness.salesCommissionsFees)} />
                    <CopyableField label="Minus HST Collected" value={formatCurrency(formData.selfEmployment.generalBusiness.minusHstCollected)} />
                    <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.generalBusiness.grossIncome)} className="font-medium" />
                    <CopyableField label="Opening Inventory" value={formatCurrency(formData.selfEmployment.generalBusiness.openingInventory)} />
                    <CopyableField label="Opening Inventory HST" value={formatCurrency(formData.selfEmployment.generalBusiness.openingInventoryHst)} />
                    <CopyableField label="Purchases During Year" value={formatCurrency(formData.selfEmployment.generalBusiness.purchasesDuringYear)} />
                    <CopyableField label="Purchases During Year HST" value={formatCurrency(formData.selfEmployment.generalBusiness.purchasesDuringYearHst)} />
                    <CopyableField label="Subcontracts" value={formatCurrency(formData.selfEmployment.generalBusiness.subcontracts)} />
                    <CopyableField label="Subcontracts HST" value={formatCurrency(formData.selfEmployment.generalBusiness.subcontractsHst)} />
                    <CopyableField label="Direct Wage Costs" value={formatCurrency(formData.selfEmployment.generalBusiness.directWageCosts)} />
                    <CopyableField label="Direct Wage Costs HST" value={formatCurrency(formData.selfEmployment.generalBusiness.directWageCostsHst)} />
                    <CopyableField label="Other Costs" value={formatCurrency(formData.selfEmployment.generalBusiness.otherCosts)} />
                    <CopyableField label="Other Costs HST" value={formatCurrency(formData.selfEmployment.generalBusiness.otherCostsHst)} />
                    <CopyableField label="Purchase Returns" value={formatCurrency(formData.selfEmployment.generalBusiness.purchaseReturns)} />
                    <CopyableField label="Purchase Returns HST" value={formatCurrency(formData.selfEmployment.generalBusiness.purchaseReturnsHst)} />
                  </div>
                </div>

                {/* Operating Expenses */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Operating Expenses</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      ['Advertising', 'advertising'],
                      ['Meals & Entertainment', 'mealsEntertainment'],
                      ['Bad Debts', 'badDebts'],
                      ['Insurance', 'insurance'],
                      ['Interest', 'interest'],
                      ['Fees, Licenses & Dues', 'feesLicensesDues'],
                      ['Office Expenses', 'officeExpenses'],
                      ['Supplies', 'supplies'],
                      ['Legal & Accounting Fees', 'legalAccountingFees'],
                      ['Management & Administration', 'managementAdministration'],
                      ['Office Rent', 'officeRent'],
                      ['Maintenance & Repairs', 'maintenanceRepairs'],
                      ['Salaries, Wages & Benefits', 'salariesWagesBenefits'],
                      ['Property Tax', 'propertyTax'],
                      ['Travel', 'travel'],
                      ['Telephone & Utilities', 'telephoneUtilities'],
                      ['Fuel Costs (Excl. Vehicle)', 'fuelCosts'],
                      ['Delivery / Freight / Express', 'deliveryFreightExpress'],
                    ] as const).map(([label, key]) => (
                      <Fragment key={key}>
                        <CopyableField label={label} value={formatCurrency(formData.selfEmployment.generalBusiness[key])} />
                        <CopyableField label={`${label} HST`} value={formatCurrency(formData.selfEmployment.generalBusiness.businessExpenseHst?.[key])} />
                      </Fragment>
                    ))}
                    <CopyableField label="Other Expense 1" value={formatCurrency(formData.selfEmployment.generalBusiness.otherExpense1)} />
                    <CopyableField label="Other Expense 2" value={formatCurrency(formData.selfEmployment.generalBusiness.otherExpense2)} />
                    <CopyableField label="Other Expense 3" value={formatCurrency(formData.selfEmployment.generalBusiness.otherExpense3)} />
                  </div>
                  {formData.selfEmployment.generalBusiness.otherExpenses?.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                      {formData.selfEmployment.generalBusiness.otherExpenses.map((exp, i) => (
                        <CopyableField key={i} label={exp.name || `Other Expense (extra) ${i + 1}`} value={formatCurrency(exp.amount)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Home Office */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Home Office</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="Area of Home for Business (sq ft)" value={formData.selfEmployment.generalBusiness.areaOfHomeForBusiness?.toString() || '0'} />
                    <CopyableField label="Total Area of Home (sq ft)" value={formData.selfEmployment.generalBusiness.totalAreaOfHome?.toString() || '0'} />
                    <CopyableField label="Heat" value={formatCurrency(formData.selfEmployment.generalBusiness.heat)} />
                    <CopyableField label="Electricity" value={formatCurrency(formData.selfEmployment.generalBusiness.electricity)} />
                    <CopyableField label="House Insurance" value={formatCurrency(formData.selfEmployment.generalBusiness.houseInsurance)} />
                    <CopyableField label="Home Maintenance" value={formatCurrency(formData.selfEmployment.generalBusiness.homeMaintenance)} />
                    <CopyableField label="Mortgage Interest" value={formatCurrency(formData.selfEmployment.generalBusiness.mortgageInterest)} />
                    <CopyableField label="Property Taxes" value={formatCurrency(formData.selfEmployment.generalBusiness.propertyTaxes)} />
                    <CopyableField label="House Rent" value={formatCurrency(formData.selfEmployment.generalBusiness.houseRent)} />
                    <CopyableField label="Home Other Expense 1" value={formatCurrency(formData.selfEmployment.generalBusiness.homeOtherExpense1)} />
                    <CopyableField label="Home Other Expense 2" value={formatCurrency(formData.selfEmployment.generalBusiness.homeOtherExpense2)} />
                  </div>
                  {formData.selfEmployment.generalBusiness.homeOtherExpenses?.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                      {formData.selfEmployment.generalBusiness.homeOtherExpenses.map((exp, i) => (
                        <CopyableField key={i} label={exp.name || `Home Other Expense (extra) ${i + 1}`} value={formatCurrency(exp.amount)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Vehicle</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="KM Driven for Business" value={`${formData.selfEmployment.generalBusiness.kmDrivenForBusiness || 0} km`} />
                    <CopyableField label="Total KM Driven in Year" value={`${formData.selfEmployment.generalBusiness.totalKmDrivenInYear || 0} km`} />
                    <CopyableField label="Vehicle Fuel" value={formatCurrency(formData.selfEmployment.generalBusiness.vehicleFuel)} />
                    <CopyableField label="Vehicle Insurance" value={formatCurrency(formData.selfEmployment.generalBusiness.vehicleInsurance)} />
                    <CopyableField label="License & Registration" value={formatCurrency(formData.selfEmployment.generalBusiness.licenseRegistration)} />
                    <CopyableField label="Vehicle Maintenance" value={formatCurrency(formData.selfEmployment.generalBusiness.vehicleMaintenance)} />
                    <CopyableField label="Business Parking" value={formatCurrency(formData.selfEmployment.generalBusiness.businessParking)} />
                    <CopyableField label="Vehicle Other Expense" value={formatCurrency(formData.selfEmployment.generalBusiness.vehicleOtherExpense)} />
                    <CopyableField label="Leasing / Finance Payments" value={formatCurrency(formData.selfEmployment.generalBusiness.leasingFinancePayments)} />
                  </div>
                  {formData.selfEmployment.generalBusiness.vehicleOtherExpenses?.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                      {formData.selfEmployment.generalBusiness.vehicleOtherExpenses.map((exp, i) => (
                        <CopyableField key={i} label={exp.name || `Vehicle Other Expense (extra) ${i + 1}`} value={formatCurrency(exp.amount)} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Summary</h5>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CopyableField label="Total Expenses" value={formatCurrency(formData.selfEmployment.generalBusiness.totalExpenses)} className="font-medium" />
                    <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.generalBusiness.netIncome)} className="font-semibold" />
                  </div>
                  {formData.selfEmployment.generalBusiness.notes && (
                    <div className="mt-3">
                      <CopyableField label="Notes" value={formData.selfEmployment.generalBusiness.notes} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* General Business Documents - shown directly under their own sub-section. */}
            {formData.selfEmployment.generalBusiness && (
              <QuestionDocuments
                sectionKey="SELF_EMPLOYMENT"
                sectionTitle="General Business Documents"
                documents={documents}
                docFilter={(d) => !isRideShareDoc(d)}
                onApprove={onApproveDoc}
                onRequestReupload={onRequestReupload}
                onRequestMissing={onRequestMissing}
                onView={onViewDoc}
                canEdit={canEdit}
              />
            )}

          </div>
        )}
      </T1CRASection>

      {/* Q6c: Rental Income */}
      <T1CRASection
        title="Q6c: Rental Income"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        applicable={hasRentalSection}
        sectionData={{ rentalIncome: se?.rentalIncome } as unknown as Record<string, unknown>}
      >
        {hasRentalSection && (
          <div className="space-y-6">
            {/* Rental Income - Extended with Co-owners */}
            {formData.selfEmployment.rentalIncome && formData.selfEmployment.rentalIncome.length > 0 && (
              <>
                <Separator />
                <h4 className="font-semibold text-base">Rental Income</h4>
                {formData.selfEmployment.rentalIncome.map((rent, idx) => (
                  <div key={idx} className="mb-6 last:mb-0 p-4 border rounded-lg">
                    <h5 className="font-medium text-base mb-4">Property {idx + 1}</h5>
                    
                    {/* Property Details */}
                    <div className="space-y-4">
                      <div>
                        <h6 className="font-medium text-sm text-muted-foreground mb-3">Property Details</h6>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="sm:col-span-3">
                            <CopyableField label="Property Address" value={rent.propertyAddress} />
                            <div className="mt-2"><AddressBreakdown data={rent} prefix="propertyAddress" /></div>
                          </div>
                          <CopyableField label="Number of Units" value={rent.numberOfUnits?.toString() || 'N/A'} />
                          <CopyableField label="Personal Use Portion" value={rent.personalUsePortion || 'N/A'} />
                        </div>
                      </div>

                      {/* Co-owners */}
                      {(rent.coOwnerPartner1 || rent.coOwnerPartner2 || rent.coOwnerPartner3) && (
                        <div>
                          <h6 className="font-medium text-sm text-muted-foreground mb-3">Co-owners</h6>
                          <div className="space-y-4">
                            {([
                              [1, rent.coOwnerPartner1],
                              [2, rent.coOwnerPartner2],
                              [3, rent.coOwnerPartner3],
                            ] as const).map(([n, name]) => {
                              if (!name) return null;
                              const docs = formData.uploadedDocuments || {};
                              const sin = docs[`rental_coowner${n}_sin`];
                              const dob = docs[`rental_coowner${n}_dob`];
                              const street = docs[`rental_coowner${n}_street`];
                              const city = docs[`rental_coowner${n}_city`];
                              const province = docs[`rental_coowner${n}_province`];
                              const postal = docs[`rental_coowner${n}_postal`];
                              const hasExtra = sin || dob || street || city || province || postal;
                              return (
                                <div key={n}>
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    <CopyableField label={`Co-owner ${n}`} value={name} />
                                    {sin && <CopyableField label="SIN" value={sin} />}
                                    {dob && <CopyableField label="Date of Birth" value={formatDate(dob)} />}
                                  </div>
                                  {hasExtra && (street || city || province || postal) && (
                                    <div className="grid gap-3 sm:grid-cols-3 mt-3">
                                      {street && <CopyableField label="Street Address" value={street} />}
                                      {city && <CopyableField label="City" value={city} />}
                                      {province && <CopyableField label="Province" value={province} />}
                                      {postal && <CopyableField label="Postal Code" value={postal} />}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Income & Expenses */}
                      <div>
                        <h6 className="font-medium text-sm text-muted-foreground mb-3">Income & Expenses</h6>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <CopyableField label="Gross Rental Income" value={formatCurrency(rent.grossRentalIncome)} className="font-medium" />
                          <CopyableField label="Gov't Income (Rental)" value={rent.anyGovtIncomeRelatingToRental ? formatCurrency(rent.anyGovtIncomeRelatingToRental) : 'N/A'} />
                          <CopyableField label="Property Taxes" value={formatCurrency(rent.propertyTaxes)} />
                          <CopyableField label="Insurance" value={formatCurrency(rent.insurance ?? rent.houseInsurance)} />
                          <CopyableField label="Mortgage Interest" value={formatCurrency(rent.mortgageInterest)} />
                          <CopyableField label="Repairs & Maintenance" value={formatCurrency(rent.repairsAndMaintenance ?? rent.repairAndMaintenance)} />
                          <CopyableField label="Utilities" value={formatCurrency(rent.utilities)} />
                          <CopyableField label="Management Fees" value={formatCurrency(rent.managementFees ?? rent.managementAdminFees)} />
                          <CopyableField label="Cleaning Expense" value={formatCurrency(rent.cleaningExpense)} />
                          <CopyableField label="Motor Vehicle Expenses" value={formatCurrency(rent.motorVehicleExpenses)} />
                          <CopyableField label="Legal / Professional Fees" value={formatCurrency(rent.legalProfessionalFees)} />
                          <CopyableField label="Advertising & Promotion" value={formatCurrency(rent.advertisingPromotion ?? rent.advertisingAndPromotion)} />
                          <CopyableField label="Other Expenses" value={formatCurrency(rent.otherExpenses ?? rent.otherExpense)} />
                          <CopyableField label="Total Expenses" value={formatCurrency(rent.totalExpenses)} className="font-medium" />
                          <CopyableField label="Net Rental Income" value={formatCurrency(rent.netRentalIncome)} className="font-semibold" />
                        </div>
                      </div>

                      {/* Property Purchase Details — "CCA/Depreciation (for building)" on the client form */}
                      {(rent.purchasePrice || rent.purchaseDate) && (
                        <div>
                          <h6 className="font-medium text-sm text-muted-foreground mb-3">CCA/Depreciation (for building)</h6>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {rent.purchaseDate && <CopyableField label="Purchase Date" value={formatDate(rent.purchaseDate)} />}
                            {rent.purchasePrice && <CopyableField label="Purchase Price" value={formatCurrency(rent.purchasePrice)} />}
                            {rent.additionDeletionAmount && <CopyableField label="Addition / Deletion Amount" value={formatCurrency(rent.additionDeletionAmount)} />}
                          </div>
                        </div>
                      )}

                      {/* CCA/Depreciation (other than building) — previously
                          written into a document-filename map on the client,
                          so this had no counterpart to render here at all
                          until that bug was fixed (see t1_form_models_simple.dart). */}
                      {(rent.ccaOtherDetails || rent.ccaOtherPurchaseDate || rent.ccaOtherAmount) && (
                        <div>
                          <h6 className="font-medium text-sm text-muted-foreground mb-3">CCA/Depreciation (other than building)</h6>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {rent.ccaOtherDetails && <CopyableField label="Addition Details" value={rent.ccaOtherDetails} />}
                            {rent.ccaOtherPurchaseDate && <CopyableField label="Purchase Date" value={formatDate(rent.ccaOtherPurchaseDate)} />}
                            {rent.ccaOtherAmount && <CopyableField label="Amount" value={formatCurrency(rent.ccaOtherAmount)} />}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {/* Rental Income's own documents (house insurance, property tax
                bill) previously fell through to this single Self-Employment
                call below, whose keywords never matched them — they only
                ever showed in the generic Documents tab, never here. */}
            <QuestionDocuments
              sectionKey="RENTAL_INCOME"
              sectionTitle="Rental Income Documents"
              documents={documents}
              onApprove={onApproveDoc}
              onRequestReupload={onRequestReupload}
              onRequestMissing={onRequestMissing}
              onView={onViewDoc}
              canEdit={canEdit}
            />
            <QuestionDocuments
              sectionKey="RENT_PROPERTY_TAX"
              sectionTitle="Property Tax Documents"
              documents={documents}
              onApprove={onApproveDoc}
              onRequestReupload={onRequestReupload}
              onRequestMissing={onRequestMissing}
              onView={onViewDoc}
              canEdit={canEdit}
            />
          </div>
        )}
      </T1CRASection>

      {/* Q7: First Home Buyer */}
      <T1CRASection
        title="Q7: First Home Purchase"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.isFirstHomeBuyer}
        sectionData={{ isFirstHomeBuyer: formData.isFirstHomeBuyer } as Record<string, unknown>}
      >
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium">
            Client purchased their first home in the tax year.
          </p>
        </div>
        {/* No document is requested for a first home purchase — the Statement of
            Adjustment requirement was removed on purpose (client and admin). */}
      </T1CRASection>

      {/* Q8: Sold Property (Long Term > 365 days) */}
      <T1CRASection
        title="Q8: Property Sale (Held > 365 days)"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        applicable={!!formData.propertySaleLongTerm}
        sectionData={formData.propertySaleLongTerm as unknown as Record<string, unknown>}
      >
        {formData.propertySaleLongTerm && (() => {
          const ps = formData.propertySaleLongTerm;
          return (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-3">
                  <CopyableField label="Property Address" value={ps.propertyAddress} />
                  <div className="mt-2"><AddressBreakdown data={ps} prefix="propertyAddress" /></div>
                </div>
                <CopyableField label="Purchase Date" value={formatDate(ps.purchaseDate)} />
                <CopyableField label="Sell Date" value={formatDate(ps.sellDate)} />
              </div>
              <Separator />
              <h5 className="font-medium text-sm text-muted-foreground">Purchase Costs (ACB)</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="Purchase Price" value={formatCurrency(ps.purchasePriceOfProperty)} />
                <CopyableField label="Legal Fees on Purchase" value={formatCurrency(ps.legalFeesOnPurchase)} />
                <CopyableField label="Land Transfer Tax" value={formatCurrency(ps.landTransferTax)} />
                <CopyableField label="Title Insurance" value={formatCurrency(ps.titleInsurance)} />
                <CopyableField label="Survey & Appraisal Fees" value={formatCurrency(ps.surveyAndAppraisalFees)} />
                <CopyableField label="Property Inspection Fees" value={formatCurrency(ps.propertyInspectionFees)} />
                <CopyableField label="GST/HST on New Home" value={formatCurrency(ps.gstHstOnNewHome)} />
                <CopyableField label="Major Capital Improvements" value={formatCurrency(ps.majorCapitalImprovements)} />
                <CopyableField label="Other Purchase Expenses" value={formatCurrency(ps.purchaseOtherExpenses)} />
              </div>
              <Separator />
              <h5 className="font-medium text-sm text-muted-foreground">Sale Related Expenses</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Stored under the legacy purchaseSellExpenses key; the client form labels it "Sales Price". */}
                <CopyableField label="Sales Price" value={formatCurrency(ps.purchaseSellExpenses)} />
                <CopyableField label="Real Estate Brokerage Charges" value={formatCurrency(ps.realEstateBrokerageCharges)} />
                <CopyableField label="Legal Fees on Sale" value={formatCurrency(ps.legalFeesOnSale)} />
                <CopyableField label="Advertising & Listing Fees" value={formatCurrency(ps.advertisingAndListingFees)} />
                <CopyableField label="Home Staging Costs" value={formatCurrency(ps.homeStagingCosts)} />
                <CopyableField label="Mortgage Discharge / Penalty Fees" value={formatCurrency(ps.mortgageDischargeOrPenaltyFees)} />
                <CopyableField label="Appraisal Fees on Sale" value={formatCurrency(ps.appraisalFeesOnSale)} />
                <CopyableField label="Equipment / Renovation During Sale" value={formatCurrency(ps.equipmentOrRenovationDuringSale)} />
                <CopyableField label="Other Sale Expenses" value={formatCurrency(ps.saleOtherExpenses)} />
              </div>
            </div>
          );
        })()}
      </T1CRASection>

      {/* Q9: Sold Property (Short Term < 365 days / FLIP) */}
      <T1CRASection
        title="Q9: Property Sale (Held < 365 days / FLIP)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.propertySaleShortTerm}
        sectionData={formData.propertySaleShortTerm as unknown as Record<string, unknown>}
      >
        {formData.propertySaleShortTerm && (() => {
          const ps = formData.propertySaleShortTerm;
          return (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-3">
                  <CopyableField label="Property Address" value={ps.propertyAddress} />
                  <div className="mt-2"><AddressBreakdown data={ps} prefix="propertyAddress" /></div>
                </div>
                <CopyableField label="Purchase Date" value={formatDate(ps.purchaseDate)} />
                <CopyableField label="Sell Date" value={formatDate(ps.sellDate)} />
              </div>
              <Separator />
              <h5 className="font-medium text-sm text-muted-foreground">Purchase Costs (ACB)</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="Purchase Price" value={formatCurrency(ps.purchasePriceOfProperty)} />
                <CopyableField label="Legal Fees on Purchase" value={formatCurrency(ps.legalFeesOnPurchase)} />
                <CopyableField label="Land Transfer Tax" value={formatCurrency(ps.landTransferTax)} />
                <CopyableField label="Title Insurance" value={formatCurrency(ps.titleInsurance)} />
                <CopyableField label="Survey & Appraisal Fees" value={formatCurrency(ps.surveyAndAppraisalFees)} />
                <CopyableField label="Property Inspection Fees" value={formatCurrency(ps.propertyInspectionFees)} />
                <CopyableField label="GST/HST on New Home" value={formatCurrency(ps.gstHstOnNewHome)} />
                <CopyableField label="Major Capital Improvements" value={formatCurrency(ps.majorCapitalImprovements)} />
                <CopyableField label="Other Purchase Expenses" value={formatCurrency(ps.purchaseOtherExpenses)} />
              </div>
              <Separator />
              <h5 className="font-medium text-sm text-muted-foreground">Sale Related Expenses</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Stored under the legacy purchaseSellExpenses key; the client form labels it "Sales Price". */}
                <CopyableField label="Sales Price" value={formatCurrency(ps.purchaseSellExpenses)} />
                <CopyableField label="Real Estate Brokerage Charges" value={formatCurrency(ps.realEstateBrokerageCharges)} />
                <CopyableField label="Legal Fees on Sale" value={formatCurrency(ps.legalFeesOnSale)} />
                <CopyableField label="Advertising & Listing Fees" value={formatCurrency(ps.advertisingAndListingFees)} />
                <CopyableField label="Home Staging Costs" value={formatCurrency(ps.homeStagingCosts)} />
                <CopyableField label="Mortgage Discharge / Penalty Fees" value={formatCurrency(ps.mortgageDischargeOrPenaltyFees)} />
                <CopyableField label="Appraisal Fees on Sale" value={formatCurrency(ps.appraisalFeesOnSale)} />
                <CopyableField label="Equipment / Renovation During Sale" value={formatCurrency(ps.equipmentOrRenovationDuringSale)} />
                <CopyableField label="Other Sale Expenses" value={formatCurrency(ps.saleOtherExpenses)} />
              </div>
            </div>
          );
        })()}
      </T1CRASection>

      {/* Q10: Work From Home (T2200) */}
      <T1CRASection
        title="Q10: Work From Home Expense (T2200)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.hasWorkFromHomeExpense || !!formData.workFromHomeForIndividual || !!formData.workFromHomeForSpouse || !!formData.workFromHome}
        sectionData={formData.workFromHome as unknown as Record<string, unknown>}
      >
        {[
          formData.workFromHomeForIndividual && formData.wfhIndividual
            ? { label: 'Individual WFH Expenses', data: formData.wfhIndividual }
            : formData.workFromHome
            ? { label: 'Work From Home Expenses', data: formData.workFromHome }
            : null,
          formData.workFromHomeForSpouse && formData.wfhSpouse
            ? { label: 'Spouse WFH Expenses', data: formData.wfhSpouse }
            : null,
        ].filter(Boolean).map((entry: any, entryIdx) => (
          <div key={entryIdx} className="space-y-4 mb-6">
            {entryIdx > 0 && <Separator />}
            <h4 className="font-semibold text-base">{entry.label}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Total House Area (Sq.Ft.)" value={`${entry.data.totalHomeArea || 0} sq ft`} />
              <CopyableField label="Total Work Area (Sq.Ft.)" value={`${entry.data.workArea || 0} sq ft`} />
            </div>
            <Separator />
            <h5 className="font-medium text-sm text-muted-foreground">Expenses</h5>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Rent Expense" value={formatCurrency(entry.data.rentExpense)} />
              <CopyableField label="Mortgage Expense" value={formatCurrency(entry.data.mortgageExpense)} />
              <CopyableField label="Mortgage Expense" value={formatCurrency(entry.data.mortgageInterest)} />
              <CopyableField label="Wifi Expense" value={formatCurrency(entry.data.internetExpense)} />
              <CopyableField label="Electricity Expense" value={formatCurrency(entry.data.utilities)} />
              <CopyableField label="Water Expense" value={formatCurrency(entry.data.waterExpense || 0)} />
              <CopyableField label="Heat Expense" value={formatCurrency(entry.data.heatExpense || 0)} />
              <CopyableField label="Total Insurance Expense" value={formatCurrency(entry.data.homeInsurance)} />
            </div>
          </div>
        ))}
        <QuestionDocuments
          sectionKey="WORK_FROM_HOME"
          sectionTitle="Work From Home Documents"
          documents={documents}
          requiredDocuments={['T2200 Form']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q11: Student (T2202A) */}
      <T1CRASection
        title="Q11: Student (T2202A Form)"
        icon={<GraduationCap className="h-5 w-5 text-primary" />}
        applicable={!!formData.isStudent}
        sectionData={{ isStudent: formData.isStudent } as Record<string, unknown>}
      >
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium">
            Client was a student last year.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Document required: T2202A form from educational institution
          </p>
        </div>
        <QuestionDocuments
          sectionKey="TUITION"
          sectionTitle="Tuition Documents"
          documents={documents}
          requiredDocuments={['T2202 Form']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q12: Union Member / Union Dues */}
      <T1CRASection
        title="Q12: Union Dues"
        icon={<Users className="h-5 w-5 text-primary" />}
        applicable={!!formData.unionDues?.length}
        sectionData={formData.unionDues as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'institutionName', header: 'Institution Name', format: (v) => (v as string) || (formData.unionDues?.find(u => u.institutionName === v)?.unionName) || 'N/A' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={(formData.unionDues || []).map(u => ({ ...u, institutionName: u.institutionName || u.unionName || 'N/A' }))}
        />
        <QuestionDocuments
          sectionKey="UNION_DUES"
          sectionTitle="Union Dues Documents"
          documents={documents}
          requiredDocuments={['Union Dues Receipt']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q13: Daycare Expenses */}
      <T1CRASection
        title="Q13: Daycare Expenses"
        icon={<Baby className="h-5 w-5 text-primary" />}
        applicable={!!formData.childcare?.length}
        sectionData={formData.childcare as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'childName', header: 'Child Name', format: (v) => (v as string) || 'N/A' },
            { key: 'providerName', header: 'Childcare Provider' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
            { key: 'identificationNumberSin', header: 'Provider SIN', format: (v) => (v as string) || 'N/A' },
            { key: 'weeks', header: 'Weeks', format: (v) => (v as number)?.toString() || 'N/A' },
          ]}
          data={formData.childcare || []}
        />
        <QuestionDocuments
          sectionKey="CHILDCARE"
          sectionTitle="Daycare Expense Documents"
          documents={documents}
          requiredDocuments={['Day Care Expense Receipts']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q14: First-Time Filer */}
      <T1CRASection
        title="Q14: First-Time Filer"
        icon={<Plane className="h-5 w-5 text-primary" />}
        applicable={!!formData.isFirstTimeFiler}
        sectionData={{ isFirstTimeFiler: formData.isFirstTimeFiler } as Record<string, unknown>}
      >
        {[
          formData.firstTimeFilerForIndividual && formData.firstTimeFilerIndividual
            ? { label: 'Individual First Time Filer', data: formData.firstTimeFilerIndividual }
            : null,
          formData.firstTimeFilerForSpouse && formData.firstTimeFilerSpouse
            ? { label: 'Spouse First Time Filer', data: formData.firstTimeFilerSpouse }
            : null,
        ].filter(Boolean).map((entry: any, entryIdx) => (
          <div key={entryIdx} className="mb-6">
            {entryIdx > 0 && <Separator className="mb-4" />}
            <h4 className="font-semibold text-base mb-3">{entry.label}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CopyableField label="Date of Landing" value={formatDate(entry.data.dateOfLanding)} />
              <CopyableField label="Income Outside Canada (CAD)" value={formatCurrency(entry.data.incomeOutsideCanada)} />
              <CopyableField label="Back Home Income 2024 (CAD)" value={formatCurrency(entry.data.backHomeIncome2024)} />
              <CopyableField label="Back Home Income 2023 (CAD)" value={formatCurrency(entry.data.backHomeIncome2023)} />
            </div>
          </div>
        ))}
      </T1CRASection>

      {/* Q15: Other Income (No T-Slips) */}
      <T1CRASection
        title="Q15: Other Income (No T-Slips)"
        icon={<Receipt className="h-5 w-5 text-primary" />}
        applicable={!!formData.otherIncome?.length}
        sectionData={formData.otherIncome as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'description', header: 'Description' },
            { key: 'amount', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.otherIncome || []}
          emptyMessage="No other income reported"
        />
      </T1CRASection>

      {/* Q16: Professional Dues / License Fees */}
      <T1CRASection
        title="Q16: Professional Dues / License Fees"
        icon={<Award className="h-5 w-5 text-primary" />}
        applicable={!!formData.professionalDues?.length}
        sectionData={formData.professionalDues as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'memberName', header: 'Name' },
            { key: 'organizationName', header: 'Organization' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.professionalDues || []}
          emptyMessage="No professional dues reported"
        />
        <QuestionDocuments
          sectionKey="PROFESSIONAL_DUES"
          sectionTitle="Professional Dues Documents"
          documents={documents}
          requiredDocuments={['Professional Fees Receipt']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q17: RRSP/FHSA Investment */}
      <T1CRASection
        title="Q17: RRSP/FHSA Investment"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        applicable={!!formData.hasRrspFhsaInvestment}
        sectionData={{ hasRrspFhsaInvestment: formData.hasRrspFhsaInvestment } as Record<string, unknown>}
      >
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium">
            Client has RRSP/FHSA investments.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Documents required: RRSP/FHSA contribution slips (T-slips). Enter contribution details from slips during CRA data entry.
          </p>
        </div>
        <QuestionDocuments
          sectionKey="RRSP"
          sectionTitle="RRSP/FHSA Documents"
          documents={documents}
          requiredDocuments={['RRSP/FHSA T-slips']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q18: Children's Art & Sport Tax Credit */}
      <T1CRASection
        title="Q18: Children's Art & Sport Tax Credit"
        icon={<Palette className="h-5 w-5 text-primary" />}
        applicable={!!formData.childrenCredits?.length}
        sectionData={formData.childrenCredits as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'instituteName', header: 'Institute Name' },
            { key: 'description', header: 'Description', format: (v) => (v as string) || (formData.childrenCredits?.find(c => c.description === v)?.programDescription) || 'N/A' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={(formData.childrenCredits || []).map(c => ({ ...c, description: c.description || c.programDescription || 'N/A' }))}
        />
        <QuestionDocuments
          sectionKey="CHILD_ART_SPORT"
          sectionTitle="Children's Art & Sport Receipts"
          documents={documents}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q19: Rent or Property Tax (Ontario/Quebec) */}
      <T1CRASection
        title="Q19: Rent or Property Tax (Ontario/Quebec)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.isProvinceFiler}
        sectionData={{ isProvinceFiler: formData.isProvinceFiler } as Record<string, unknown>}
      >
        {(formData.provinceFilerEntries || (formData.rentPropertyTax ? [formData.rentPropertyTax] : [])).map((entry: any, idx: number) => (
          <div key={idx} className="mb-6 last:mb-0">
            {idx > 0 && <Separator className="mb-4" />}
            {(formData.provinceFilerEntries?.length || 0) > 1 && (
              <h4 className="font-medium text-sm mb-3">Entry {idx + 1}</h4>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {entry.province && (
                <CopyableField label="Province" value={entry.province} />
              )}
              <CopyableField label="Rent or Property Tax" value={entry.rentOrPropertyTax || 'N/A'} />
              <div className="sm:col-span-2">
                <CopyableField label="Property Address" value={entry.propertyAddress} />
              </div>
              <CopyableField label="Postal Code" value={entry.postalCode || 'N/A'} />
              <CopyableField label="No. Of Months Resides" value={(entry.monthsResides || entry.numberOfMonthsResides)?.toString() || 'N/A'} />
              <CopyableField label="Amount Paid" value={formatCurrency(entry.amountPaid ?? entry.rentOrPropertyTaxAmount ?? entry.occupancyCost)} />
            </div>
          </div>
        ))}
      </T1CRASection>

      {/* Q20: Disability Tax Credit */}
      <T1CRASection
        title="Q20: Disability Tax Credit"
        icon={<HeartPulse className="h-5 w-5 text-primary" />}
        applicable={!!formData.disabilityTaxCredit?.length}
        sectionData={formData.disabilityTaxCredit as unknown as Record<string, unknown>}
      >
        {formData.disabilityTaxCredit?.map((member, idx) => (
          <div key={idx} className="mb-6 last:mb-0">
            <h4 className="font-medium text-sm mb-3">Family Member {idx + 1}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="First Name" value={member.firstName} />
              <CopyableField label="Last Name" value={member.lastName} />
              <CopyableField label="Relation" value={member.relation} />
              {member.approvedYear && (
                <CopyableField label="CRA Approval Year" value={String(member.approvedYear)} />
              )}
              {member.fromYear && (
                <CopyableField label="Approved From Year" value={String(member.fromYear)} />
              )}
              {member.toYear && (
                <CopyableField label="Approved To Year" value={String(member.toYear)} />
              )}
            </div>
            {idx < (formData.disabilityTaxCredit?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
        <QuestionDocuments
          sectionKey="DISABILITY"
          sectionTitle="Disability Tax Credit Documents"
          documents={documents}
          requiredDocuments={['Disability Approval form']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q21: Filing for Deceased */}
      <T1CRASection
        title="Q21: Filing for Deceased Person"
        icon={<FileText className="h-5 w-5 text-primary" />}
        applicable={!!formData.deceasedReturn}
        sectionData={formData.deceasedReturn as unknown as Record<string, unknown>}
      >
        {formData.deceasedReturn && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-3">
              <CopyableField label="Name of Deceased Person" value={formData.deceasedReturn.deceasedFullName} />
            </div>
            <CopyableField label="Date of Death" value={formatDate(formData.deceasedReturn.dateOfDeath)} />
            <CopyableField label="Deceased Person SIN" value={formData.deceasedReturn.deceasedSin} />
            <div className="sm:col-span-3">
              <CopyableField label="Mailing Address of Deceased" value={formData.deceasedReturn.deceasedMailingAddress} />
            </div>
            <CopyableField label="Legal Representative Name" value={formData.deceasedReturn.legalRepresentativeName} />
            <CopyableField label="Legal Rep. Contact Number" value={formData.deceasedReturn.legalRepresentativeContactNumber} />
            <div className="sm:col-span-3">
              <CopyableField label="Legal Rep. Address" value={formData.deceasedReturn.legalRepresentativeAddress} />
            </div>
          </div>
        )}
        <QuestionDocuments
          sectionKey="DECEASED_RETURN"
          sectionTitle="Deceased Return Documents"
          documents={documents}
          requiredDocuments={['ID of Person Submitting the Return']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>
    </div>
  );
}
