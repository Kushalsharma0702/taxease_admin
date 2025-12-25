import { useState, useMemo } from 'react';
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

interface T1CRAReadyFormProps {
  clientId: string;
  filingYear: number;
  documents?: DocType[];
  onApproveDoc?: (docId: string) => void;
  onRequestReupload?: (docId: string, reason: string) => void;
  onRequestMissing?: (docName: string, reason: string) => void;
  onViewDoc?: (doc: DocType) => void;
  canEdit?: boolean;
}

const formatCurrency = (value: number | undefined): string => formatCurrencyUtil(value);
const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return `${value}%`;
};
const formatDate = (value: string | undefined): string => {
  if (!value) return 'N/A';
  return formatDateUtil(new Date(value));
};

export function T1CRAReadyForm({ 
  clientId, 
  filingYear,
  documents = [],
  onApproveDoc,
  onRequestReupload,
  onRequestMissing,
  onViewDoc,
  canEdit = true,
}: T1CRAReadyFormProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const { toast } = useToast();

  const formData = useMemo(() => getT1FormData(clientId), [clientId]);

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
          <div className="sm:col-span-2">
            <CopyableField
              label="Current Address with Postal Code"
              value={`${formData.personalInfo.currentAddress.street}, ${formData.personalInfo.currentAddress.city}, ${formData.personalInfo.currentAddress.province} ${formData.personalInfo.currentAddress.postalCode}`}
            />
          </div>
          <CopyableField label="Phone Number" value={formData.personalInfo.phone} />
          <CopyableField label="Email" value={formData.personalInfo.email} />
          <CopyableField label="Canadian Citizen" value={formData.personalInfo.isCanadianCitizen ? 'Yes' : 'No'} />
          <CopyableField label="Marital Status" value={formData.personalInfo.maritalStatus} />
        </div>
      </T1CRASection>

      {/* Spouse Information */}
      {formData.personalInfo.spouseInfo && (formData.personalInfo.maritalStatus === 'married' || formData.personalInfo.maritalStatus === 'common-law') && (
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

      {/* Q1: Foreign Property (> CAN$100,000) */}
      <T1CRASection
        title="Q1: Foreign Property (> CAN$100,000)"
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

      {/* Q2: Medical Expenses */}
      <T1CRASection
        title="Q2: Medical Expenses"
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
        <QuestionDocuments
          sectionKey="MEDICAL_EXPENSES"
          sectionTitle="Medical Expense Documents"
          documents={documents}
          requiredDocuments={['Medical Receipts', 'Pharmacy Receipts']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q3: Charitable Donations */}
      <T1CRASection
        title="Q3: Charitable Donations"
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

      {/* Q4: Moving Expenses */}
      <T1CRASection
        title="Q4: Moving Expenses (Province Change)"
        icon={<Truck className="h-5 w-5 text-primary" />}
        applicable={!!formData.movingExpenses?.applicable}
        sectionData={formData.movingExpenses as unknown as Record<string, unknown>}
      >
        {formData.movingExpenses && (
          <div className="space-y-6">
            {/* Addresses & Distances */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Addresses & Distances</h4>
              <div className="grid gap-3">
                <CopyableField label="Old Address" value={typeof formData.movingExpenses.oldAddress === 'string' ? formData.movingExpenses.oldAddress : `${formData.movingExpenses.oldAddress.street}, ${formData.movingExpenses.oldAddress.city}, ${formData.movingExpenses.oldAddress.province} ${formData.movingExpenses.oldAddress.postalCode}`} />
                <CopyableField label="New Address" value={typeof formData.movingExpenses.newAddress === 'string' ? formData.movingExpenses.newAddress : `${formData.movingExpenses.newAddress.street}, ${formData.movingExpenses.newAddress.city}, ${formData.movingExpenses.newAddress.province} ${formData.movingExpenses.newAddress.postalCode}`} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <CopyableField label="Distance Old → New" value={formData.movingExpenses.distanceFromOldToNew} />
                  <CopyableField label="Distance New → Office" value={formData.movingExpenses.distanceFromNewToOffice} />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Travel & Logistics Costs */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Travel & Logistics Costs</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="Date of Travel" value={formatDate(formData.movingExpenses.dateOfTravel)} />
                <CopyableField label="Air Tickets" value={formatCurrency(formData.movingExpenses.airTicketsCost)} />
                <CopyableField label="Movers & Packers" value={formatCurrency(formData.movingExpenses.moversPackersCost)} />
                <CopyableField label="Travel Meals & Accommodation" value={formatCurrency(formData.movingExpenses.travelMealsCost)} />
                <CopyableField label="Other Moving Costs" value={formatCurrency(formData.movingExpenses.otherMovingCosts)} />
                <CopyableField label="Total Moving Cost" value={formatCurrency(formData.movingExpenses.totalMovingCost)} />
              </div>
            </div>
            
            <Separator />
            
            {/* Employment Details After Move */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Employment Details After Move</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CopyableField label="Date of Joining" value={formatDate(formData.movingExpenses.dateJoinedCompany)} />
                <CopyableField label="Company Name" value={formData.movingExpenses.companyName} />
                <CopyableField label="Employer Address" value={formData.movingExpenses.employerAddress} />
                <CopyableField label="Income Earned After Move" value={formatCurrency(formData.movingExpenses.incomeEarnedAfterMove)} />
              </div>
            </div>
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
          </div>
        )}
      </T1CRASection>

      {/* Q5: Self-Employment */}
      <T1CRASection
        title="Q5: Self-Employment"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        applicable={!!formData.selfEmployment}
        sectionData={formData.selfEmployment as unknown as Record<string, unknown>}
      >
        {formData.selfEmployment && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Badge variant={formData.selfEmployment.hasUberSkipDoorDash ? 'default' : 'outline'}>
                {formData.selfEmployment.hasUberSkipDoorDash ? '✓' : '✗'} Uber/Skip/DoorDash
              </Badge>
              <Badge variant={formData.selfEmployment.hasGeneralBusiness ? 'default' : 'outline'}>
                {formData.selfEmployment.hasGeneralBusiness ? '✓' : '✗'} General Business
              </Badge>
              <Badge variant={formData.selfEmployment.hasRentalIncome ? 'default' : 'outline'}>
                {formData.selfEmployment.hasRentalIncome ? '✓' : '✗'} Rental Income
              </Badge>
            </div>
            
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

                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Summary</h5>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.uberIncome.netIncome)} className="font-semibold" />
                  </div>
                </div>
              </>
            )}

            {/* General Business Income - Full Detail (60+ fields) */}
            {formData.selfEmployment.generalBusiness && (
              <>
                <Separator />
                <h4 className="font-semibold text-base">General Business Income</h4>

                {/* Income & Cost of Goods Sold */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Income & Cost of Goods Sold</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="Sales / Commissions / Fees" value={formatCurrency(formData.selfEmployment.generalBusiness.salesCommissionsFees)} />
                    <CopyableField label="Minus HST Collected" value={formatCurrency(formData.selfEmployment.generalBusiness.minusHstCollected)} />
                    <CopyableField label="Gross Income" value={formatCurrency(formData.selfEmployment.generalBusiness.grossIncome)} className="font-medium" />
                    <CopyableField label="Opening Inventory" value={formatCurrency(formData.selfEmployment.generalBusiness.openingInventory)} />
                    <CopyableField label="Purchases During Year" value={formatCurrency(formData.selfEmployment.generalBusiness.purchasesDuringYear)} />
                    <CopyableField label="Subcontracts" value={formatCurrency(formData.selfEmployment.generalBusiness.subcontracts)} />
                    <CopyableField label="Direct Wage Costs" value={formatCurrency(formData.selfEmployment.generalBusiness.directWageCosts)} />
                    <CopyableField label="Other Costs" value={formatCurrency(formData.selfEmployment.generalBusiness.otherCosts)} />
                    <CopyableField label="Purchase Returns" value={formatCurrency(formData.selfEmployment.generalBusiness.purchaseReturns)} />
                  </div>
                </div>

                {/* Operating Expenses */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Operating Expenses</h5>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CopyableField label="Advertising" value={formatCurrency(formData.selfEmployment.generalBusiness.advertising)} />
                    <CopyableField label="Meals & Entertainment" value={formatCurrency(formData.selfEmployment.generalBusiness.mealsEntertainment)} />
                    <CopyableField label="Bad Debts" value={formatCurrency(formData.selfEmployment.generalBusiness.badDebts)} />
                    <CopyableField label="Insurance" value={formatCurrency(formData.selfEmployment.generalBusiness.insurance)} />
                    <CopyableField label="Interest" value={formatCurrency(formData.selfEmployment.generalBusiness.interest)} />
                    <CopyableField label="Fees, Licenses & Dues" value={formatCurrency(formData.selfEmployment.generalBusiness.feesLicensesDues)} />
                    <CopyableField label="Office Expenses" value={formatCurrency(formData.selfEmployment.generalBusiness.officeExpenses)} />
                    <CopyableField label="Supplies" value={formatCurrency(formData.selfEmployment.generalBusiness.supplies)} />
                    <CopyableField label="Legal & Accounting Fees" value={formatCurrency(formData.selfEmployment.generalBusiness.legalAccountingFees)} />
                    <CopyableField label="Management & Administration" value={formatCurrency(formData.selfEmployment.generalBusiness.managementAdministration)} />
                    <CopyableField label="Office Rent" value={formatCurrency(formData.selfEmployment.generalBusiness.officeRent)} />
                    <CopyableField label="Maintenance & Repairs" value={formatCurrency(formData.selfEmployment.generalBusiness.maintenanceRepairs)} />
                    <CopyableField label="Salaries, Wages & Benefits" value={formatCurrency(formData.selfEmployment.generalBusiness.salariesWagesBenefits)} />
                    <CopyableField label="Property Tax" value={formatCurrency(formData.selfEmployment.generalBusiness.propertyTax)} />
                    <CopyableField label="Travel" value={formatCurrency(formData.selfEmployment.generalBusiness.travel)} />
                    <CopyableField label="Telephone & Utilities" value={formatCurrency(formData.selfEmployment.generalBusiness.telephoneUtilities)} />
                    <CopyableField label="Fuel Costs (Excl. Vehicle)" value={formatCurrency(formData.selfEmployment.generalBusiness.fuelCosts)} />
                    <CopyableField label="Delivery / Freight / Express" value={formatCurrency(formData.selfEmployment.generalBusiness.deliveryFreightExpress)} />
                    <CopyableField label="Other Expense 1" value={formatCurrency(formData.selfEmployment.generalBusiness.otherExpense1)} />
                    <CopyableField label="Other Expense 2" value={formatCurrency(formData.selfEmployment.generalBusiness.otherExpense2)} />
                    <CopyableField label="Other Expense 3" value={formatCurrency(formData.selfEmployment.generalBusiness.otherExpense3)} />
                  </div>
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
                </div>

                {/* Summary */}
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-3">Summary</h5>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CopyableField label="Total Expenses" value={formatCurrency(formData.selfEmployment.generalBusiness.totalExpenses)} className="font-medium" />
                    <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.generalBusiness.netIncome)} className="font-semibold" />
                  </div>
                </div>
              </>
            )}

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
                          </div>
                          <CopyableField label="Property Type" value={rent.propertyType} />
                          <CopyableField label="Ownership %" value={`${rent.ownershipPercentage}%`} />
                          <CopyableField label="Number of Units" value={rent.numberOfUnits?.toString() || 'N/A'} />
                          <CopyableField label="Personal Use Portion" value={rent.personalUsePortion || 'N/A'} />
                          <CopyableField label="Gov't Income (Rental)" value={rent.anyGovtIncomeRelatingToRental || 'N/A'} />
                        </div>
                      </div>

                      {/* Co-owners */}
                      {(rent.coOwnerPartner1 || rent.coOwnerPartner2 || rent.coOwnerPartner3) && (
                        <div>
                          <h6 className="font-medium text-sm text-muted-foreground mb-3">Co-owners</h6>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {rent.coOwnerPartner1 && <CopyableField label="Co-owner 1" value={rent.coOwnerPartner1} />}
                            {rent.coOwnerPartner2 && <CopyableField label="Co-owner 2" value={rent.coOwnerPartner2} />}
                            {rent.coOwnerPartner3 && <CopyableField label="Co-owner 3" value={rent.coOwnerPartner3} />}
                          </div>
                        </div>
                      )}

                      {/* Income & Expenses */}
                      <div>
                        <h6 className="font-medium text-sm text-muted-foreground mb-3">Income & Expenses</h6>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <CopyableField label="Gross Rental Income" value={formatCurrency(rent.grossRentalIncome)} className="font-medium" />
                          <CopyableField label="Property Taxes" value={formatCurrency(rent.propertyTaxes)} />
                          <CopyableField label="Insurance" value={formatCurrency(rent.insurance)} />
                          <CopyableField label="Mortgage Interest" value={formatCurrency(rent.mortgageInterest)} />
                          <CopyableField label="Repairs & Maintenance" value={formatCurrency(rent.repairsAndMaintenance)} />
                          <CopyableField label="Utilities" value={formatCurrency(rent.utilities)} />
                          <CopyableField label="Management Fees" value={formatCurrency(rent.managementFees)} />
                          <CopyableField label="Cleaning Expense" value={formatCurrency(rent.cleaningExpense)} />
                          <CopyableField label="Motor Vehicle Expenses" value={formatCurrency(rent.motorVehicleExpenses)} />
                          <CopyableField label="Legal / Professional Fees" value={formatCurrency(rent.legalProfessionalFees)} />
                          <CopyableField label="Advertising & Promotion" value={formatCurrency(rent.advertisingPromotion)} />
                          <CopyableField label="Other Expenses" value={formatCurrency(rent.otherExpenses)} />
                          <CopyableField label="Total Expenses" value={formatCurrency(rent.totalExpenses)} className="font-medium" />
                          <CopyableField label="Net Rental Income" value={formatCurrency(rent.netRentalIncome)} className="font-semibold" />
                        </div>
                      </div>

                      {/* Property Purchase Details */}
                      {(rent.purchasePrice || rent.purchaseDate) && (
                        <div>
                          <h6 className="font-medium text-sm text-muted-foreground mb-3">Purchase Details</h6>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {rent.purchaseDate && <CopyableField label="Purchase Date" value={formatDate(rent.purchaseDate)} />}
                            {rent.purchasePrice && <CopyableField label="Purchase Price" value={formatCurrency(rent.purchasePrice)} />}
                            {rent.additionDeletionAmount && <CopyableField label="Addition / Deletion Amount" value={formatCurrency(rent.additionDeletionAmount)} />}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            <QuestionDocuments
              sectionKey="SELF_EMPLOYMENT"
              sectionTitle="Self-Employment Documents"
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

      {/* Q6: First Home Buyer */}
      <T1CRASection
        title="Q6: First Home Purchase"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.firstHomeBuyer}
        sectionData={formData.firstHomeBuyer as unknown as Record<string, unknown>}
      >
        {formData.firstHomeBuyer && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-3">
              <CopyableField label="Property Address" value={formData.firstHomeBuyer.propertyAddress} />
            </div>
            <CopyableField label="Purchase Date" value={formatDate(formData.firstHomeBuyer.purchaseDate)} />
            <CopyableField label="Purchase Price" value={formatCurrency(formData.firstHomeBuyer.purchasePrice)} />
          </div>
        )}
      </T1CRASection>

      {/* Q7: Sold Property (Long Term > 365 days) */}
      <T1CRASection
        title="Q7: Property Sale (Held > 365 days)"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        applicable={!!formData.capitalGainsLongTerm?.length}
        sectionData={formData.capitalGainsLongTerm as unknown as Record<string, unknown>}
      >
        {formData.capitalGainsLongTerm?.map((cg, idx) => (
          <div key={idx} className="mb-6 last:mb-0">
            <h4 className="font-medium text-sm mb-3">Property {idx + 1}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-3">
                <CopyableField label="Property Address" value={cg.propertyAddress} />
              </div>
              <CopyableField label="Purchase Date" value={formatDate(cg.purchaseDate)} />
              <CopyableField label="Sell Date" value={formatDate(cg.sellDate)} />
              <CopyableField label="Purchase & Sell Expenses" value={formatCurrency(cg.purchaseAndSellExpenses)} />
              <CopyableField label="Capital Gain Earned" value={formatCurrency(cg.capitalGainEarned)} />
            </div>
            {idx < (formData.capitalGainsLongTerm?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </T1CRASection>

      {/* Q8: Sold Property (Short Term < 365 days / FLIP) */}
      <T1CRASection
        title="Q8: Property Sale (Held < 365 days / FLIP)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.capitalGainsShortTerm?.length}
        sectionData={formData.capitalGainsShortTerm as unknown as Record<string, unknown>}
      >
        {formData.capitalGainsShortTerm?.map((cg, idx) => (
          <div key={idx} className="mb-6 last:mb-0">
            <h4 className="font-medium text-sm mb-3">Property {idx + 1}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-3">
                <CopyableField label="Property Address" value={cg.propertyAddress} />
              </div>
              <CopyableField label="Purchase Date" value={formatDate(cg.purchaseDate)} />
              <CopyableField label="Sell Date" value={formatDate(cg.sellDate)} />
              <CopyableField label="Purchase & Sell Expenses" value={formatCurrency(cg.purchaseAndSellExpenses)} />
            </div>
            {idx < (formData.capitalGainsShortTerm?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </T1CRASection>

      {/* Q9: Work From Home (T2200) */}
      <T1CRASection
        title="Q9: Work From Home Expense (T2200)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.workFromHome}
        sectionData={formData.workFromHome as unknown as Record<string, unknown>}
      >
        {formData.workFromHome && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Total House Area (Sq.Ft.)" value={`${formData.workFromHome.totalHomeArea} sq ft`} />
              <CopyableField label="Total Work Area (Sq.Ft.)" value={`${formData.workFromHome.workArea} sq ft`} />
            </div>
            <Separator />
            <h4 className="font-medium text-sm text-muted-foreground">Expenses</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Rent Expense" value={formatCurrency(formData.workFromHome.rentExpense)} />
              <CopyableField label="Mortgage Expense" value={formatCurrency(formData.workFromHome.mortgageInterest)} />
              <CopyableField label="Wifi Expense" value={formatCurrency(formData.workFromHome.internetExpense)} />
              <CopyableField label="Electricity Expense" value={formatCurrency(formData.workFromHome.utilities)} />
              <CopyableField label="Water Expense" value={formatCurrency(0)} />
              <CopyableField label="Heat Expense" value={formatCurrency(0)} />
              <CopyableField label="Total Insurance Expense" value={formatCurrency(formData.workFromHome.homeInsurance)} />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Claimable Amount</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(formData.workFromHome.claimableAmount)}</span>
              </div>
            </div>
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
          </div>
        )}
      </T1CRASection>

      {/* Q10: Student (T2202A) */}
      <T1CRASection
        title="Q10: Student (T2202A Form)"
        icon={<GraduationCap className="h-5 w-5 text-primary" />}
        applicable={!!formData.tuition?.length}
        sectionData={formData.tuition as unknown as Record<string, unknown>}
      >
        {formData.tuition?.map((tuit, idx) => (
          <div key={tuit.id} className="mb-6 last:mb-0">
            <h4 className="font-medium text-sm mb-3">{tuit.studentName} - {tuit.institutionName}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Institution Name" value={tuit.institutionName} />
              <CopyableField label="Program Name" value={tuit.programName} />
              <CopyableField label="T2202A Amount" value={formatCurrency(tuit.t2202aAmount)} />
            </div>
            {idx < (formData.tuition?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
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

      {/* Q11: Union Member / Union Dues */}
      <T1CRASection
        title="Q11: Union Dues"
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

      {/* Q12: Daycare Expenses */}
      <T1CRASection
        title="Q12: Daycare Expenses"
        icon={<Baby className="h-5 w-5 text-primary" />}
        applicable={!!formData.childcare?.length}
        sectionData={formData.childcare as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'providerName', header: 'Childcare Provider' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
            { key: 'identificationNumberSIN', header: 'Identification Number/SIN', format: (v) => (v as string) || 'N/A' },
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

      {/* Q13: First-Time Filer */}
      <T1CRASection
        title="Q13: First-Time Filer"
        icon={<Plane className="h-5 w-5 text-primary" />}
        applicable={!!formData.firstTimeFiler}
        sectionData={formData.firstTimeFiler as unknown as Record<string, unknown>}
      >
        {formData.firstTimeFiler && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CopyableField label="Date of Landing (Individual)" value={formatDate(formData.firstTimeFiler.dateOfLanding)} />
            <CopyableField label="Income Outside Canada (CAD)" value={formatCurrency(formData.firstTimeFiler.incomeOutsideCanada)} />
            <CopyableField label="Back Home Income 2024 (in CAD)" value={formatCurrency(formData.firstTimeFiler.backHomeIncome2024)} />
            <CopyableField label="Back Home Income 2023 (in CAD)" value={formatCurrency(formData.firstTimeFiler.backHomeIncome2023)} />
          </div>
        )}
      </T1CRASection>

      {/* Q14: Other Income (No T-Slips) */}
      <T1CRASection
        title="Q14: Other Income (No T-Slips)"
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

      {/* Q15: Professional Dues / License Fees */}
      <T1CRASection
        title="Q15: Professional Dues / License Fees"
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

      {/* Q16: RRSP/FHSA Investment */}
      <T1CRASection
        title="Q16: RRSP/FHSA Investment"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        applicable={!!formData.rrspContributions?.length}
        sectionData={formData.rrspContributions as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'institutionName', header: 'Institution' },
            { key: 'contributionAmount', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.rrspContributions || []}
        />
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

      {/* Q17: Children's Art & Sport Tax Credit */}
      <T1CRASection
        title="Q17: Children's Art & Sport Tax Credit"
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
      </T1CRASection>

      {/* Q18: Rent or Property Tax (Ontario/Alberta/Quebec) */}
      <T1CRASection
        title="Q18: Rent or Property Tax (Ontario/Alberta/Quebec)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.rentPropertyTax}
        sectionData={formData.rentPropertyTax as unknown as Record<string, unknown>}
      >
        {formData.rentPropertyTax && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CopyableField label="Rent or Property Tax" value={formData.rentPropertyTax.rentOrPropertyTax || (formData.rentPropertyTax.rentOrOwn === 'rent' ? 'Rent' : 'Property Tax')} />
            <div className="sm:col-span-2">
              <CopyableField label="Property Address" value={formData.rentPropertyTax.propertyAddress} />
            </div>
            <CopyableField label="Postal Code" value={formData.rentPropertyTax.postalCode || 'N/A'} />
            <CopyableField label="No. Of Months Resides" value={formData.rentPropertyTax.numberOfMonthsResides?.toString() || 'N/A'} />
            <CopyableField label="Amount Paid" value={formatCurrency(formData.rentPropertyTax.amountPaid || formData.rentPropertyTax.occupancyCost)} />
          </div>
        )}
      </T1CRASection>

      {/* Q19: Disability Tax Credit */}
      <T1CRASection
        title="Q19: Disability Tax Credit"
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
              <CopyableField label="Approved Year" value={member.approvedYear.toString()} />
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

      {/* Q20: Filing for Deceased */}
      <T1CRASection
        title="Q20: Filing for Deceased Person"
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
      </T1CRASection>
    </div>
  );
}
