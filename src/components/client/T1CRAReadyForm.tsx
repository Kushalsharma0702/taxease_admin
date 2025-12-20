import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyableField } from './CopyableField';
import { CopyableTable } from './CopyableTable';
import { T1CRASection } from './T1CRASection';
import { T1FormData, CRA_LINE_NUMBERS } from '@/types/t1-forms';
import { getT1FormData } from '@/data/mockT1FormData';
import { useToast } from '@/hooks/use-toast';
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
}

const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return `${value}%`;
};

const formatDate = (value: string | undefined): string => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function T1CRAReadyForm({ clientId, filingYear }: T1CRAReadyFormProps) {
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

  // Calculate summary totals
  const totalEmploymentIncome = formData.employmentIncome?.reduce((sum, e) => sum + e.t4Box14, 0) || 0;
  const totalInvestmentIncome = formData.investmentIncome?.reduce((sum, i) => {
    return sum + (i.interestIncome || 0) + (i.dividendsEligible || 0) + (i.dividendsOther || 0);
  }, 0) || 0;
  const totalRRSP = formData.rrspContributions?.reduce((sum, r) => sum + r.contributionAmount, 0) || 0;
  const totalMedical = formData.medicalExpenses?.reduce((sum, m) => sum + m.netAmount, 0) || 0;
  const totalDonations = formData.charitableDonations?.reduce((sum, d) => sum + d.amountPaid, 0) || 0;
  const totalCapitalGains = formData.capitalGains?.reduce((sum, c) => sum + c.taxableCapitalGain, 0) || 0;

  const handleCopyFullSummary = async () => {
    const lines = [
      `T1 Tax Return Summary - ${formData.personalInfo.firstName} ${formData.personalInfo.lastName} - ${filingYear}`,
      ``,
      `INCOME`,
      `Line ${CRA_LINE_NUMBERS.employmentIncome}: ${formatCurrency(totalEmploymentIncome)}`,
      `Line ${CRA_LINE_NUMBERS.interestIncome}: ${formatCurrency(formData.investmentIncome?.[0]?.interestIncome)}`,
      `Line ${CRA_LINE_NUMBERS.dividendIncome}: ${formatCurrency(totalInvestmentIncome - (formData.investmentIncome?.[0]?.interestIncome || 0))}`,
      `Line ${CRA_LINE_NUMBERS.capitalGains}: ${formatCurrency(totalCapitalGains)}`,
      formData.selfEmployment?.uberIncome ? `Line ${CRA_LINE_NUMBERS.selfEmploymentIncome}: ${formatCurrency(formData.selfEmployment.uberIncome.netIncome)}` : null,
      ``,
      `DEDUCTIONS`,
      `Line ${CRA_LINE_NUMBERS.rrspDeduction}: ${formatCurrency(totalRRSP)}`,
      `Line ${CRA_LINE_NUMBERS.unionDues}: ${formatCurrency(formData.unionDues?.[0]?.amountPaid)}`,
      formData.movingExpenses?.applicable ? `Line ${CRA_LINE_NUMBERS.movingExpenses}: ${formatCurrency(formData.movingExpenses.totalMovingCost)}` : null,
      formData.childcare?.length ? `Line ${CRA_LINE_NUMBERS.childcareExpenses}: ${formatCurrency(formData.childcare.reduce((s, c) => s + c.amountPaid, 0))}` : null,
      ``,
      `CREDITS`,
      `Line ${CRA_LINE_NUMBERS.medicalExpenses}: ${formatCurrency(totalMedical)}`,
      `Line ${CRA_LINE_NUMBERS.charitableDonations}: ${formatCurrency(totalDonations)}`,
      formData.tuition?.length ? `Line ${CRA_LINE_NUMBERS.tuitionCredits}: ${formatCurrency(formData.tuition.reduce((s, t) => s + t.t2202aAmount, 0))}` : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedSummary(true);
      toast({
        title: 'Full Summary Copied!',
        description: 'T1 summary with CRA line numbers copied to clipboard',
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
            T1 CRA Ready Form
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-filled data ready for CRA portal entry • {filingYear} Tax Year
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
              Copy Full T1 Summary
            </>
          )}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Employment Income</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalEmploymentIncome)}</p>
            <Badge variant="outline" className="text-[10px] mt-1">Line {CRA_LINE_NUMBERS.employmentIncome}</Badge>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">RRSP Deductions</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalRRSP)}</p>
            <Badge variant="outline" className="text-[10px] mt-1">Line {CRA_LINE_NUMBERS.rrspDeduction}</Badge>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Capital Gains</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totalCapitalGains)}</p>
            <Badge variant="outline" className="text-[10px] mt-1">Line {CRA_LINE_NUMBERS.capitalGains}</Badge>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Charitable Donations</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(totalDonations)}</p>
            <Badge variant="outline" className="text-[10px] mt-1">Line {CRA_LINE_NUMBERS.charitableDonations}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Personal Information */}
      <T1CRASection
        title="Personal Information"
        icon={<User className="h-5 w-5 text-primary" />}
        applicable={true}
        sectionData={formData.personalInfo as unknown as Record<string, unknown>}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CopyableField label="First Name" value={formData.personalInfo.firstName} />
          <CopyableField label="Last Name" value={formData.personalInfo.lastName} />
          <CopyableField label="SIN" value={formData.personalInfo.sin} />
          <CopyableField label="Date of Birth" value={formatDate(formData.personalInfo.dateOfBirth)} />
          <CopyableField label="Marital Status" value={formData.personalInfo.maritalStatus} />
          <CopyableField label="Email" value={formData.personalInfo.email} />
          <CopyableField label="Phone" value={formData.personalInfo.phone} />
          <div className="sm:col-span-2">
            <CopyableField
              label="Current Address"
              value={`${formData.personalInfo.currentAddress.street}, ${formData.personalInfo.currentAddress.city}, ${formData.personalInfo.currentAddress.province} ${formData.personalInfo.currentAddress.postalCode}`}
            />
          </div>
          {formData.personalInfo.directDeposit && formData.personalInfo.bankInfo && (
            <>
              <CopyableField label="Bank Institution" value={formData.personalInfo.bankInfo.institution} />
              <CopyableField label="Transit Number" value={formData.personalInfo.bankInfo.transitNumber} />
              <CopyableField label="Account Number" value={formData.personalInfo.bankInfo.accountNumber} />
            </>
          )}
        </div>
      </T1CRASection>

      {/* Employment Income */}
      <T1CRASection
        title="Employment Income (T4/T4A)"
        icon={<Briefcase className="h-5 w-5 text-primary" />}
        applicable={!!formData.employmentIncome?.length}
        craLines={['Line 10100', 'Line 10400']}
        sectionData={formData.employmentIncome as unknown as Record<string, unknown>}
      >
        {formData.employmentIncome?.map((emp, idx) => (
          <div key={emp.id} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">
                {emp.slipType} - {emp.employerName}
              </h4>
              <Badge variant="secondary">{emp.slipType}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Employer Name" value={emp.employerName} />
              <div className="sm:col-span-2">
                <CopyableField label="Employer Address" value={emp.employerAddress} />
              </div>
              <CopyableField label="Box 14 - Employment Income" value={formatCurrency(emp.t4Box14)} craLine="10100" />
              <CopyableField label="Box 16 - CPP Contributions" value={formatCurrency(emp.t4Box16)} />
              <CopyableField label="Box 18 - EI Premiums" value={formatCurrency(emp.t4Box18)} />
              <CopyableField label="Box 22 - Income Tax Deducted" value={formatCurrency(emp.t4Box22)} />
              <CopyableField label="Box 24 - EI Insurable Earnings" value={formatCurrency(emp.t4Box24)} />
              <CopyableField label="Box 26 - CPP/QPP Pensionable" value={formatCurrency(emp.t4Box26)} />
              {emp.t4Box44 && <CopyableField label="Box 44 - Union Dues" value={formatCurrency(emp.t4Box44)} />}
              {emp.t4Box52 && <CopyableField label="Box 52 - Pension Adjustment" value={formatCurrency(emp.t4Box52)} />}
            </div>
            {idx < (formData.employmentIncome?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </T1CRASection>

      {/* Investment Income */}
      <T1CRASection
        title="Investment Income (T5/T3/T5008)"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        applicable={!!formData.investmentIncome?.length}
        craLines={['Line 12000', 'Line 12100']}
        sectionData={formData.investmentIncome as unknown as Record<string, unknown>}
      >
        {formData.investmentIncome?.map((inv, idx) => (
          <div key={inv.id} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">{inv.institutionName}</h4>
              <Badge variant="secondary">{inv.slipType}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inv.interestIncome !== undefined && (
                <CopyableField label="Interest Income" value={formatCurrency(inv.interestIncome)} craLine="12100" />
              )}
              {inv.dividendsEligible !== undefined && (
                <CopyableField label="Eligible Dividends" value={formatCurrency(inv.dividendsEligible)} craLine="12000" />
              )}
              {inv.dividendsOther !== undefined && (
                <CopyableField label="Other Dividends" value={formatCurrency(inv.dividendsOther)} />
              )}
              {inv.capitalGainsDistributions !== undefined && (
                <CopyableField label="Capital Gains Distributions" value={formatCurrency(inv.capitalGainsDistributions)} />
              )}
              {inv.foreignIncome !== undefined && (
                <CopyableField label="Foreign Income" value={formatCurrency(inv.foreignIncome)} />
              )}
              {inv.returnOfCapital !== undefined && (
                <CopyableField label="Return of Capital" value={formatCurrency(inv.returnOfCapital)} />
              )}
            </div>
            {idx < (formData.investmentIncome?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </T1CRASection>

      {/* Foreign Property (T1135) */}
      <T1CRASection
        title="Foreign Property (T1135)"
        icon={<Globe className="h-5 w-5 text-primary" />}
        applicable={!!formData.foreignProperty?.length}
        sectionData={formData.foreignProperty as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'country', header: 'Country' },
            { key: 'propertyType', header: 'Property Type' },
            { key: 'investmentDetails', header: 'Investment Details' },
            { key: 'costAmount', header: 'Cost Amount (CAD)', format: (v) => formatCurrency(v as number) },
            { key: 'grossIncome', header: 'Gross Income (CAD)', format: (v) => formatCurrency(v as number) },
            { key: 'gainLoss', header: 'Gain/Loss (CAD)', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.foreignProperty || []}
        />
      </T1CRASection>

      {/* RRSP Contributions */}
      <T1CRASection
        title="RRSP Contributions"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        applicable={!!formData.rrspContributions?.length}
        craLines={['Line 20800']}
        sectionData={formData.rrspContributions as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'institutionName', header: 'Institution' },
            { key: 'contributionDate', header: 'Date', format: (v) => formatDate(v as string) },
            { key: 'contributionAmount', header: 'Amount', format: (v) => formatCurrency(v as number) },
            { key: 'receiptNumber', header: 'Receipt #' },
            { key: 'isSpouseRRSP', header: 'Spouse RRSP', format: (v) => v ? 'Yes' : 'No' },
          ]}
          data={formData.rrspContributions || []}
        />
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total RRSP Deduction</span>
            <span className="text-lg font-bold text-green-600">{formatCurrency(totalRRSP)}</span>
          </div>
        </div>
      </T1CRASection>

      {/* Capital Gains */}
      <T1CRASection
        title="Capital Gains"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        applicable={!!formData.capitalGains?.length}
        craLines={['Line 12700']}
        sectionData={formData.capitalGains as unknown as Record<string, unknown>}
      >
        {formData.capitalGains?.map((cg, idx) => (
          <div key={cg.id} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">{cg.description}</h4>
              <Badge variant="secondary" className="capitalize">{cg.assetType.replace('_', ' ')}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cg.propertyAddress && (
                <div className="sm:col-span-3">
                  <CopyableField label="Property Address" value={cg.propertyAddress} />
                </div>
              )}
              <CopyableField label="Purchase Date" value={formatDate(cg.purchaseDate)} />
              <CopyableField label="Sale Date" value={formatDate(cg.saleDate)} />
              <CopyableField label="Purchase Price" value={formatCurrency(cg.purchasePrice)} />
              <CopyableField label="Sale Price" value={formatCurrency(cg.salePrice)} />
              <CopyableField label="Purchase Expenses" value={formatCurrency(cg.purchaseExpenses)} />
              <CopyableField label="Sale Expenses" value={formatCurrency(cg.saleExpenses)} />
              <CopyableField label="Capital Gain" value={formatCurrency(cg.capitalGain)} />
              <CopyableField label="Taxable Capital Gain (50%)" value={formatCurrency(cg.taxableCapitalGain)} craLine="12700" />
            </div>
            {idx < (formData.capitalGains?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </T1CRASection>

      {/* Medical Expenses */}
      <T1CRASection
        title="Medical Expenses"
        icon={<HeartPulse className="h-5 w-5 text-primary" />}
        applicable={!!formData.medicalExpenses?.length}
        craLines={['Line 33099']}
        sectionData={formData.medicalExpenses as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'paymentDate', header: 'Payment Date', format: (v) => formatDate(v as string) },
            { key: 'patientName', header: 'Patient Name' },
            { key: 'relationship', header: 'Relationship' },
            { key: 'expenseType', header: 'Expense Type' },
            { key: 'providerName', header: 'Provider' },
            { key: 'amountPaid', header: 'Amount Paid', format: (v) => formatCurrency(v as number) },
            { key: 'amountReimbursed', header: 'Reimbursed', format: (v) => formatCurrency(v as number) },
            { key: 'netAmount', header: 'Net Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.medicalExpenses || []}
        />
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Net Medical Expenses</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(totalMedical)}</span>
          </div>
        </div>
      </T1CRASection>

      {/* Charitable Donations */}
      <T1CRASection
        title="Charitable Donations"
        icon={<Gift className="h-5 w-5 text-primary" />}
        applicable={!!formData.charitableDonations?.length}
        craLines={['Line 34900']}
        sectionData={formData.charitableDonations as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'organizationName', header: 'Organization' },
            { key: 'registrationNumber', header: 'Registration #' },
            { key: 'donationDate', header: 'Date', format: (v) => formatDate(v as string) },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
            { key: 'receiptNumber', header: 'Receipt #' },
          ]}
          data={formData.charitableDonations || []}
        />
        <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Charitable Donations</span>
            <span className="text-lg font-bold text-purple-600">{formatCurrency(totalDonations)}</span>
          </div>
        </div>
      </T1CRASection>

      {/* Moving Expenses (Individual) */}
      <T1CRASection
        title="Moving Expenses (Individual)"
        icon={<Truck className="h-5 w-5 text-primary" />}
        applicable={!!formData.movingExpenses?.applicable}
        craLines={['Line 21900']}
        sectionData={formData.movingExpenses as unknown as Record<string, unknown>}
      >
        {formData.movingExpenses && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Old Address</h4>
                <CopyableField
                  label="Full Address"
                  value={`${formData.movingExpenses.oldAddress.street}, ${formData.movingExpenses.oldAddress.city}, ${formData.movingExpenses.oldAddress.province} ${formData.movingExpenses.oldAddress.postalCode}`}
                />
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">New Address</h4>
                <CopyableField
                  label="Full Address"
                  value={`${formData.movingExpenses.newAddress.street}, ${formData.movingExpenses.newAddress.city}, ${formData.movingExpenses.newAddress.province} ${formData.movingExpenses.newAddress.postalCode}`}
                />
              </div>
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Distance Old → Old Office (KM)" value={`${formData.movingExpenses.distanceOldToOldOffice} km`} />
              <CopyableField label="Distance New Address → Office (KM)" value={`${formData.movingExpenses.distanceNewToNewOffice} km`} />
              <CopyableField label="Date of Travel" value={formatDate(formData.movingExpenses.dateOfTravel)} />
              <CopyableField label="Air Tickets / Travel Cost" value={formatCurrency(formData.movingExpenses.airTicketsCost)} />
              <CopyableField label="Meals & Travel Costs" value={formatCurrency(formData.movingExpenses.travelMealsCost)} />
              <CopyableField label="Movers & Packers" value={formatCurrency(formData.movingExpenses.moversPackersCost)} />
              <CopyableField label="Temporary Lodging" value={formatCurrency(formData.movingExpenses.temporaryLodgingCost)} />
              <CopyableField label="Other Moving Costs" value={formatCurrency(formData.movingExpenses.otherMovingCosts)} />
              <CopyableField label="Total Moving Cost" value={formatCurrency(formData.movingExpenses.totalMovingCost)} craLine="21900" />
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Date Joined Company" value={formatDate(formData.movingExpenses.dateJoinedCompany)} />
              <CopyableField label="Company Name" value={formData.movingExpenses.companyName} />
              <CopyableField label="Income Earned After Move" value={formatCurrency(formData.movingExpenses.incomeEarnedAfterMove)} />
              <div className="sm:col-span-3">
                <CopyableField label="Employer Address" value={formData.movingExpenses.employerAddress} />
              </div>
            </div>
          </div>
        )}
      </T1CRASection>

      {/* Spouse Moving Expenses */}
      <T1CRASection
        title="Moving Expenses (Spouse)"
        icon={<Truck className="h-5 w-5 text-muted-foreground" />}
        applicable={!!formData.spouseMovingExpenses?.applicable}
        craLines={['Line 21900']}
      >
        <p className="text-sm text-muted-foreground italic">Same structure as individual moving expenses</p>
      </T1CRASection>

      {/* Self-Employment */}
      <T1CRASection
        title="Self-Employment Income"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        applicable={!!formData.selfEmployment}
        craLines={['Line 13500', 'Line 12600']}
        sectionData={formData.selfEmployment as unknown as Record<string, unknown>}
      >
        {formData.selfEmployment && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Badge variant={formData.selfEmployment.hasUberSkipDoorDash ? 'default' : 'outline'}>
                {formData.selfEmployment.hasUberSkipDoorDash ? '✓' : '✗'} Uber / Skip / DoorDash
              </Badge>
              <Badge variant={formData.selfEmployment.hasGeneralBusiness ? 'default' : 'outline'}>
                {formData.selfEmployment.hasGeneralBusiness ? '✓' : '✗'} General Business
              </Badge>
              <Badge variant={formData.selfEmployment.hasRentalIncome ? 'default' : 'outline'}>
                {formData.selfEmployment.hasRentalIncome ? '✓' : '✗'} Rental Income
              </Badge>
            </div>
            
            {formData.selfEmployment.uberIncome && (
              <>
                <h4 className="font-medium text-sm">Uber / Skip / DoorDash Income</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <CopyableField label="Gross Income" value={formatCurrency(formData.selfEmployment.uberIncome.grossIncome)} />
                  <CopyableField label="Vehicle Expenses" value={formatCurrency(formData.selfEmployment.uberIncome.vehicleExpenses)} />
                  <CopyableField label="Phone Expenses" value={formatCurrency(formData.selfEmployment.uberIncome.phoneExpenses)} />
                  <CopyableField label="Supplies Expenses" value={formatCurrency(formData.selfEmployment.uberIncome.suppliesExpenses)} />
                  <CopyableField label="Other Expenses" value={formatCurrency(formData.selfEmployment.uberIncome.otherExpenses)} />
                  <CopyableField label="Total Expenses" value={formatCurrency(formData.selfEmployment.uberIncome.totalExpenses)} />
                  <CopyableField label="KM Driven" value={`${formData.selfEmployment.uberIncome.kmDriven} km`} />
                  <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.uberIncome.netIncome)} craLine="13500" />
                </div>
              </>
            )}
          </div>
        )}
      </T1CRASection>

      {/* Work From Home (T2200) */}
      <T1CRASection
        title="Work From Home Expenses (T2200)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.workFromHome}
        sectionData={formData.workFromHome as unknown as Record<string, unknown>}
      >
        {formData.workFromHome && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CopyableField label="Has T2200" value={formData.workFromHome.hasT2200 ? 'Yes' : 'No'} />
            <CopyableField label="Employer Name" value={formData.workFromHome.employerName} />
            <CopyableField label="Total Home Area (sq ft)" value={`${formData.workFromHome.totalHomeArea} sq ft`} />
            <CopyableField label="Work Area (sq ft)" value={`${formData.workFromHome.workArea} sq ft`} />
            <CopyableField label="Work Area Percentage" value={formatPercentage(formData.workFromHome.workAreaPercentage)} />
            <CopyableField label="Rent Expense" value={formatCurrency(formData.workFromHome.rentExpense)} />
            <CopyableField label="Mortgage Interest" value={formatCurrency(formData.workFromHome.mortgageInterest)} />
            <CopyableField label="Property Tax" value={formatCurrency(formData.workFromHome.propertyTax)} />
            <CopyableField label="Utilities" value={formatCurrency(formData.workFromHome.utilities)} />
            <CopyableField label="Home Insurance" value={formatCurrency(formData.workFromHome.homeInsurance)} />
            <CopyableField label="Maintenance & Repairs" value={formatCurrency(formData.workFromHome.maintenanceRepairs)} />
            <CopyableField label="Internet Expense" value={formatCurrency(formData.workFromHome.internetExpense)} />
            <CopyableField label="Supplies Expense" value={formatCurrency(formData.workFromHome.suppliesExpense)} />
            <CopyableField label="Total Expenses" value={formatCurrency(formData.workFromHome.totalExpenses)} />
            <CopyableField label="Claimable Amount" value={formatCurrency(formData.workFromHome.claimableAmount)} />
          </div>
        )}
      </T1CRASection>

      {/* Tuition / Student Info */}
      <T1CRASection
        title="Tuition / Student Info"
        icon={<GraduationCap className="h-5 w-5 text-primary" />}
        applicable={!!formData.tuition?.length}
        craLines={['Line 32300']}
        sectionData={formData.tuition as unknown as Record<string, unknown>}
      >
        {formData.tuition?.map((tuit, idx) => (
          <div key={tuit.id} className="mb-6 last:mb-0">
            <h4 className="font-medium text-sm mb-3">{tuit.studentName} - {tuit.institutionName}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CopyableField label="Student Name" value={tuit.studentName} />
              <CopyableField label="Relationship" value={tuit.relationship} />
              <CopyableField label="Institution Name" value={tuit.institutionName} />
              <div className="sm:col-span-3">
                <CopyableField label="Institution Address" value={tuit.institutionAddress} />
              </div>
              <CopyableField label="Program Name" value={tuit.programName} />
              <CopyableField label="T2202A Amount" value={formatCurrency(tuit.t2202aAmount)} craLine="32300" />
              <CopyableField label="Tuition Fees" value={formatCurrency(tuit.tuitionFees)} />
              <CopyableField label="Textbooks" value={formatCurrency(tuit.textbooks)} />
              <CopyableField label="Months Full-Time" value={tuit.monthsFullTime.toString()} />
              <CopyableField label="Months Part-Time" value={tuit.monthsPartTime.toString()} />
            </div>
            {idx < (formData.tuition?.length || 0) - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </T1CRASection>

      {/* Union Dues */}
      <T1CRASection
        title="Union Dues"
        icon={<Users className="h-5 w-5 text-primary" />}
        applicable={!!formData.unionDues?.length}
        craLines={['Line 21200']}
        sectionData={formData.unionDues as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'unionName', header: 'Institution Name' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.unionDues || []}
        />
      </T1CRASection>

      {/* Childcare Expenses */}
      <T1CRASection
        title="Childcare Expenses"
        icon={<Baby className="h-5 w-5 text-primary" />}
        applicable={!!formData.childcare?.length}
        craLines={['Line 21400']}
        sectionData={formData.childcare as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'providerName', header: 'Childcare Provider' },
            { key: 'childName', header: 'Child Name' },
            { key: 'periodFrom', header: 'From', format: (v) => formatDate(v as string) },
            { key: 'periodTo', header: 'To', format: (v) => formatDate(v as string) },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.childcare || []}
        />
      </T1CRASection>

      {/* First-Time Filer */}
      <T1CRASection
        title="First-Time Filer"
        icon={<Plane className="h-5 w-5 text-primary" />}
        applicable={!!formData.firstTimeFiler}
        sectionData={formData.firstTimeFiler as unknown as Record<string, unknown>}
      >
        {formData.firstTimeFiler && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CopyableField label="Date of Landing (Individual)" value={formatDate(formData.firstTimeFiler.dateOfLanding)} />
            <CopyableField label="Country of Origin" value={formData.firstTimeFiler.countryOfOrigin} />
            <CopyableField label="Income Outside Canada" value={formatCurrency(formData.firstTimeFiler.incomeOutsideCanada)} />
            <CopyableField label="Tax Paid Outside Canada" value={formatCurrency(formData.firstTimeFiler.taxPaidOutsideCanada)} />
            <CopyableField label="Assets Outside Canada" value={formatCurrency(formData.firstTimeFiler.assetsOutsideCanada)} />
          </div>
        )}
      </T1CRASection>

      {/* Other Income */}
      <T1CRASection
        title="Other Income (No Slips)"
        icon={<Receipt className="h-5 w-5 text-primary" />}
        applicable={!!formData.otherIncome?.length}
        craLines={['Line 13000']}
        sectionData={formData.otherIncome as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'description', header: 'Description' },
            { key: 'source', header: 'Source' },
            { key: 'amount', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.otherIncome || []}
          emptyMessage="No other income reported"
        />
      </T1CRASection>

      {/* Professional Dues */}
      <T1CRASection
        title="Professional Dues / Exams / Licenses"
        icon={<Award className="h-5 w-5 text-primary" />}
        applicable={!!formData.professionalDues?.length}
        craLines={['Line 21200']}
        sectionData={formData.professionalDues as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'memberName', header: 'Name' },
            { key: 'organizationName', header: 'Organization' },
            { key: 'membershipType', header: 'Type' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.professionalDues || []}
          emptyMessage="No professional dues reported"
        />
      </T1CRASection>

      {/* Children's Arts / Sports Credit */}
      <T1CRASection
        title="Children's Arts / Sports Credit"
        icon={<Palette className="h-5 w-5 text-primary" />}
        applicable={!!formData.childrenCredits?.length}
        sectionData={formData.childrenCredits as unknown as Record<string, unknown>}
      >
        <CopyableTable
          columns={[
            { key: 'childName', header: 'Child Name' },
            { key: 'activityType', header: 'Activity Type' },
            { key: 'instituteName', header: 'Institute Name' },
            { key: 'programDescription', header: 'Description' },
            { key: 'amountPaid', header: 'Amount', format: (v) => formatCurrency(v as number) },
          ]}
          data={formData.childrenCredits || []}
          emptyMessage="No children's credits reported"
        />
      </T1CRASection>

      {/* Rent / Property Tax */}
      <T1CRASection
        title="Rent / Property Tax (Ontario / Alberta / Quebec)"
        icon={<Home className="h-5 w-5 text-primary" />}
        applicable={!!formData.rentPropertyTax}
        craLines={['Line 61220', 'Line 61110']}
        sectionData={formData.rentPropertyTax as unknown as Record<string, unknown>}
      >
        {formData.rentPropertyTax && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CopyableField label="Rent or Own" value={formData.rentPropertyTax.rentOrOwn === 'rent' ? 'Renting' : 'Own Property'} />
            <CopyableField label="Province" value={formData.rentPropertyTax.province} />
            <div className="sm:col-span-3">
              <CopyableField label="Property Address" value={formData.rentPropertyTax.propertyAddress} />
            </div>
            {formData.rentPropertyTax.rentAmount && (
              <CopyableField label="Annual Rent Paid" value={formatCurrency(formData.rentPropertyTax.rentAmount)} craLine="61220" />
            )}
            {formData.rentPropertyTax.propertyTaxAmount && (
              <CopyableField label="Property Tax Paid" value={formatCurrency(formData.rentPropertyTax.propertyTaxAmount)} craLine="61110" />
            )}
            {formData.rentPropertyTax.landlordName && (
              <CopyableField label="Landlord Name" value={formData.rentPropertyTax.landlordName} />
            )}
            {formData.rentPropertyTax.landlordAddress && (
              <div className="sm:col-span-2">
                <CopyableField label="Landlord Address" value={formData.rentPropertyTax.landlordAddress} />
              </div>
            )}
            <CopyableField label="Occupancy Cost" value={formatCurrency(formData.rentPropertyTax.occupancyCost)} />
            {formData.rentPropertyTax.province === 'ON' && (
              <>
                <CopyableField label="Ontario Energy Credit" value={formData.rentPropertyTax.ontarioEnergyCredit ? 'Yes' : 'No'} />
                <CopyableField label="Ontario Sales Tax Credit" value={formData.rentPropertyTax.ontarioSalesTaxCredit ? 'Yes' : 'No'} />
              </>
            )}
          </div>
        )}
      </T1CRASection>
    </div>
  );
}
