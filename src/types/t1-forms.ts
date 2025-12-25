// Comprehensive T1 Tax Form Types for CRA Data Entry

export interface T1FormData {
  clientId: string;
  filingYear: number;
  personalInfo: T1PersonalInfo;
  foreignProperty?: T1ForeignProperty[];
  medicalExpenses?: T1MedicalExpense[];
  charitableDonations?: T1CharitableDonation[];
  movingExpenses?: T1MovingExpenses;
  spouseMovingExpenses?: T1MovingExpenses;
  selfEmployment?: T1SelfEmployment;
  firstHomeBuyer?: T1FirstHomeBuyer;
  capitalGains?: T1CapitalGain[];
  capitalGainsLongTerm?: T1CapitalGainLongTerm[];
  capitalGainsShortTerm?: T1CapitalGainShortTerm[];
  workFromHome?: T1WorkFromHome;
  tuition?: T1Tuition[];
  unionDues?: T1UnionDues[];
  childcare?: T1Childcare[];
  firstTimeFiler?: T1FirstTimeFiler;
  otherIncome?: T1OtherIncome[];
  professionalDues?: T1ProfessionalDues[];
  childrenCredits?: T1ChildrenCredit[];
  rentPropertyTax?: T1RentPropertyTax;
  disabilityTaxCredit?: T1DisabilityTaxCredit[];
  deceasedReturn?: T1DeceasedReturn;
  rrspContributions?: T1RRSPContribution[];
  employmentIncome?: T1EmploymentIncome[];
  investmentIncome?: T1InvestmentIncome[];
}

export interface T1PersonalInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  sin: string;
  dateOfBirth: string;
  maritalStatus: string;
  isCanadianCitizen?: boolean;
  canadianCitizen?: boolean; // Keep for backward compat
  currentAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  mailingAddressSame: boolean;
  mailingAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  email: string;
  phone: string;
  directDeposit: boolean;
  bankInfo?: {
    institution: string;
    transitNumber: string;
    accountNumber: string;
  };
  spouseInfo?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    sin: string;
    dateOfBirth: string;
    email?: string;
    dateOfMarriage?: string;
    incomePastYear?: number;
  };
  children?: Array<{
    firstName: string;
    middleName?: string;
    lastName: string;
    sin?: string;
    dateOfBirth: string;
  }>;
}

export interface T1ForeignProperty {
  id: string;
  investmentDetails: string;
  grossIncome: number;
  gainLoss?: number;
  maxCostDuringYear?: number;
  costAmountAtYearEnd?: number;
  country: string;
  // Legacy fields for backward compat
  propertyType?: string;
  costAmount?: number;
}

export interface T1MedicalExpense {
  id: string;
  paymentDate: string;
  patientName: string;
  paymentMadeTo?: string;
  descriptionOfExpense?: string;
  insuranceCovered?: number;
  amountPaid: number;
  // Legacy fields for backward compat
  relationship?: string;
  expenseType?: string;
  providerName?: string;
  amountReimbursed?: number;
  netAmount?: number;
}

export interface T1CharitableDonation {
  id: string;
  organizationName: string;
  amountPaid: number;
  // Legacy fields for backward compat
  registrationNumber?: string;
  donationDate?: string;
  receiptNumber?: string;
}

export interface T1MovingExpenses {
  applicable: boolean;
  oldAddress: string | { street: string; city: string; province: string; postalCode: string };
  newAddress: string | { street: string; city: string; province: string; postalCode: string };
  distanceFromOldToNew?: string;
  distanceFromNewToOffice?: string;
  airTicketCost?: number;
  moversAndPackers?: number;
  mealsAndOtherCost?: number;
  anyOtherCost?: number;
  dateOfTravel?: string;
  dateOfJoining?: string;
  companyName?: string;
  newEmployerAddress?: string;
  grossIncomeAfterMoving?: number;
  // Legacy fields for backward compat
  distanceOldToOldOffice?: number;
  distanceNewToNewOffice?: number;
  airTicketsCost?: number;
  travelMealsCost?: number;
  moversPackersCost?: number;
  temporaryLodgingCost?: number;
  otherMovingCosts?: number;
  totalMovingCost?: number;
  dateJoinedCompany?: string;
  employerAddress?: string;
  incomeEarnedAfterMove?: number;
}

export interface T1SelfEmployment {
  hasUberSkipDoorDash: boolean;
  hasGeneralBusiness: boolean;
  hasRentalIncome: boolean;
  uberIncome?: T1UberIncome;
  businessIncome?: T1BusinessIncome;
  generalBusiness?: T1GeneralBusiness;
  rentalIncome?: T1RentalIncome[];
}

export interface T1GeneralBusiness {
  clientName?: string;
  businessName: string;
  businessType?: string;
  businessNumber?: string;
  // Income & COGS
  salesCommissionsFees: number;
  minusHstCollected: number;
  grossIncome: number;
  openingInventory: number;
  purchasesDuringYear: number;
  subcontracts: number;
  directWageCosts: number;
  otherCosts: number;
  purchaseReturns: number;
  // Operating Expenses
  advertising: number;
  mealsEntertainment: number;
  badDebts: number;
  insurance: number;
  interest: number;
  feesLicensesDues: number;
  officeExpenses: number;
  supplies: number;
  legalAccountingFees: number;
  managementAdministration: number;
  officeRent: number;
  maintenanceRepairs: number;
  salariesWagesBenefits: number;
  propertyTax: number;
  travel: number;
  telephoneUtilities: number;
  fuelCosts: number;
  deliveryFreightExpress: number;
  otherExpense1: number;
  otherExpense2: number;
  otherExpense3: number;
  // Home Office
  areaOfHomeForBusiness: string;
  totalAreaOfHome: string;
  heat: number;
  electricity: number;
  houseInsurance: number;
  homeMaintenance: number;
  mortgageInterest: number;
  propertyTaxes: number;
  houseRent: number;
  homeOtherExpense1: number;
  homeOtherExpense2: number;
  // Vehicle
  kmDrivenForBusiness: number;
  totalKmDrivenInYear: number;
  vehicleFuel: number;
  vehicleInsurance: number;
  licenseRegistration: number;
  vehicleMaintenance: number;
  businessParking: number;
  vehicleOtherExpense: number;
  leasingFinancePayments: number;
  // Calculated
  totalExpenses: number;
  netIncome: number;
}

export interface T1BusinessIncome {
  businessName: string;
  businessType?: string;
  businessNumber?: string;
  grossRevenue?: number;
  grossIncome?: number;
  costOfGoodsSold?: number;
  advertisingExpenses?: number;
  officeExpenses?: number;
  officeSupplies?: number;
  professionalFees?: number;
  softwareSubscriptions?: number;
  travelExpenses?: number;
  vehicleExpenses?: number;
  otherExpenses?: number;
  totalExpenses?: number;
  netIncome?: number;
}

export interface T1UberIncome {
  uberSkipStatement?: string;
  businessHstNumber?: string;
  hstAccessCode?: string;
  hstFillingPeriod?: string;
  income?: number;
  totalKmForUberSkip?: number;
  totalOfficialKmDriven?: number;
  totalKmDrivenEntireYear?: number;
  businessNumberVehicleRegistration?: string;
  meals?: number;
  telephone?: number;
  parkingFees?: number;
  cleaningExpenses?: number;
  safetyInspection?: number;
  winterTireChange?: number;
  oilChangeAndMaintenance?: number;
  depreciation?: number;
  insuranceOnVehicle?: number;
  gas?: number;
  financingCostInterest?: number;
  leaseCost?: number;
  otherExpense?: number;
  totalExpenses?: number;
  netIncome?: number;
  // Legacy fields for backward compat
  grossIncome?: number;
  vehicleExpenses?: number;
  phoneExpenses?: number;
  suppliesExpenses?: number;
  otherExpenses?: number;
  kmDriven?: number;
}

export interface T1RentalIncome {
  id: string;
  propertyAddress: string;
  coOwnerPartner1?: string;
  coOwnerPartner2?: string;
  coOwnerPartner3?: string;
  numberOfUnits: number;
  propertyType: string;
  ownershipPercentage: number;
  grossRentalIncome: number;
  anyGovtIncomeRelatingToRental?: number;
  personalUsePortion?: string;
  houseInsurance: number;
  propertyTaxes: number;
  insurance: number;
  mortgageInterest: number;
  repairsAndMaintenance: number;
  utilities: number;
  managementFees: number;
  managementAdminFees?: number;
  cleaningExpense?: number;
  motorVehicleExpenses?: number;
  legalProfessionalFees?: number;
  advertisingPromotion?: number;
  otherExpenses: number;
  otherExpense?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  additionDeletionAmount?: number;
  totalExpenses: number;
  netRentalIncome: number;
}

export interface T1CapitalGain {
  id: string;
  assetType: 'residential_property' | 'real_estate' | 'stocks' | 'mutual_funds' | 'crypto' | 'other';
  propertyAddress?: string;
  description: string;
  purchaseDate: string;
  saleDate: string;
  purchasePrice: number;
  salePrice: number;
  purchaseExpenses: number;
  saleExpenses: number;
  capitalGain: number;
  taxableCapitalGain: number;
  principalResidenceExemption?: boolean;
}

export interface T1WorkFromHome {
  hasT2200: boolean;
  employerName: string;
  totalHomeArea: number;
  workArea: number;
  workAreaPercentage: number;
  rentExpense: number;
  mortgageInterest: number;
  propertyTax: number;
  utilities: number;
  homeInsurance: number;
  maintenanceRepairs: number;
  internetExpense: number;
  suppliesExpense: number;
  totalExpenses: number;
  claimableAmount: number;
}

export interface T1Tuition {
  id: string;
  studentName: string;
  relationship: string;
  institutionName: string;
  institutionAddress: string;
  programName: string;
  t2202aAmount: number;
  tuitionFees: number;
  educationAmount: number;
  textbooks: number;
  monthsFullTime: number;
  monthsPartTime: number;
}

export interface T1UnionDues {
  id: string;
  institutionName?: string;
  amountPaid: number;
  // Legacy field for backward compat
  unionName?: string;
}

export interface T1Childcare {
  id: string;
  providerName: string;
  amountPaid: number;
  identificationNumberSIN?: string;
  weeks?: number;
  // Legacy fields for backward compat
  providerAddress?: string;
  providerSIN?: string;
  childName?: string;
  childDOB?: string;
  periodFrom?: string;
  periodTo?: string;
}

export interface T1FirstTimeFiler {
  dateOfLanding: string;
  incomeOutsideCanada: number;
  backHomeIncome2024?: number;
  backHomeIncome2023?: number;
  // Legacy fields for backward compat
  countryOfOrigin?: string;
  taxPaidOutsideCanada?: number;
  assetsOutsideCanada?: number;
}

export interface T1OtherIncome {
  id: string;
  description: string;
  amount: number;
  // Legacy field for backward compat
  source?: string;
}

export interface T1ProfessionalDues {
  id: string;
  memberName: string;
  organizationName: string;
  amountPaid: number;
  // Legacy fields for backward compat
  membershipType?: string;
  examFees?: number;
  licenseFees?: number;
}

export interface T1ChildrenCredit {
  id: string;
  instituteName: string;
  description?: string;
  amountPaid: number;
  // Legacy fields for backward compat
  childName?: string;
  childDOB?: string;
  activityType?: 'arts' | 'sports' | 'both';
  programDescription?: string;
}

export interface T1RentPropertyTax {
  id?: string;
  rentOrPropertyTax?: string;
  propertyAddress: string;
  postalCode?: string;
  numberOfMonthsResides?: number;
  amountPaid?: number;
  // Legacy fields for backward compat
  rentOrOwn?: 'rent' | 'own';
  province?: string;
  rentAmount?: number;
  propertyTaxAmount?: number;
  landlordName?: string;
  landlordAddress?: string;
  occupancyCost?: number;
  ontarioEnergyCredit?: boolean;
  ontarioSalesTaxCredit?: boolean;
}

export interface T1RRSPContribution {
  id: string;
  institutionName: string;
  accountNumber: string;
  contributionDate: string;
  contributionAmount: number;
  receiptNumber: string;
  isSpouseRRSP: boolean;
}

export interface T1EmploymentIncome {
  id: string;
  employerName: string;
  employerAddress: string;
  t4Box14: number; // Employment Income
  t4Box16: number; // CPP Contributions
  t4Box17: number; // QPP Contributions
  t4Box18: number; // EI Premiums
  t4Box22: number; // Income Tax Deducted
  t4Box24: number; // EI Insurable Earnings
  t4Box26: number; // CPP/QPP Pensionable Earnings
  t4Box44?: number; // Union Dues
  t4Box46?: number; // Charitable Donations
  t4Box52?: number; // Pension Adjustment
  slipType: string;
}

export interface T1InvestmentIncome {
  id: string;
  institutionName: string;
  slipType: string;
  interestIncome?: number;
  dividendsEligible?: number;
  dividendsOther?: number;
  foreignIncome?: number;
  capitalGainsDistributions?: number;
  returnOfCapital?: number;
  acbAdjustment?: number;
}

export interface T1FirstHomeBuyer {
  propertyAddress: string;
  purchaseDate: string;
  purchasePrice: number;
}

export interface T1CapitalGainLongTerm {
  id: string;
  propertyAddress: string;
  purchaseDate: string;
  sellDate: string;
  purchaseAndSellExpenses: number;
  capitalGainEarned: number;
}

export interface T1CapitalGainShortTerm {
  id: string;
  propertyAddress: string;
  purchaseDate: string;
  sellDate: string;
  purchaseAndSellExpenses: number;
}

export interface T1DisabilityTaxCredit {
  firstName: string;
  lastName: string;
  relation: string;
  approvedYear: number;
}

export interface T1DeceasedReturn {
  deceasedFullName: string;
  dateOfDeath: string;
  deceasedSin: string;
  deceasedMailingAddress: string;
  legalRepresentativeName: string;
  legalRepresentativeContactNumber: string;
  legalRepresentativeAddress: string;
}

// CRA Line Number Mapping for T1 Summary
export const CRA_LINE_NUMBERS = {
  // Income Lines
  employmentIncome: '10100',
  otherEmploymentIncome: '10400',
  selfEmploymentIncome: '13500',
  rentalIncome: '12600',
  interestIncome: '12100',
  dividendIncome: '12000',
  capitalGains: '12700',
  rrspIncome: '12900',
  otherIncome: '13000',
  
  // Deduction Lines
  rrspDeduction: '20800',
  unionDues: '21200',
  childcareExpenses: '21400',
  movingExpenses: '21900',
  supportPayments: '22000',
  professionalDues: '21200',
  
  // Credits Lines
  medicalExpenses: '33099',
  charitableDonations: '34900',
  tuitionCredits: '32300',
  rentCredit: '61220',
  propertyTaxCredit: '61110',
} as const;
