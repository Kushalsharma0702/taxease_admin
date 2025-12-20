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
  capitalGains?: T1CapitalGain[];
  workFromHome?: T1WorkFromHome;
  tuition?: T1Tuition[];
  unionDues?: T1UnionDues[];
  childcare?: T1Childcare[];
  firstTimeFiler?: T1FirstTimeFiler;
  otherIncome?: T1OtherIncome[];
  professionalDues?: T1ProfessionalDues[];
  childrenCredits?: T1ChildrenCredit[];
  rentPropertyTax?: T1RentPropertyTax;
  rrspContributions?: T1RRSPContribution[];
  employmentIncome?: T1EmploymentIncome[];
  investmentIncome?: T1InvestmentIncome[];
}

export interface T1PersonalInfo {
  firstName: string;
  lastName: string;
  sin: string;
  dateOfBirth: string;
  maritalStatus: string;
  canadianCitizen: boolean;
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
}

export interface T1ForeignProperty {
  id: string;
  country: string;
  propertyType: string;
  investmentDetails: string;
  costAmount: number;
  grossIncome: number;
  gainLoss: number;
}

export interface T1MedicalExpense {
  id: string;
  paymentDate: string;
  patientName: string;
  relationship: string;
  expenseType: string;
  providerName: string;
  amountPaid: number;
  amountReimbursed: number;
  netAmount: number;
}

export interface T1CharitableDonation {
  id: string;
  organizationName: string;
  registrationNumber: string;
  donationDate: string;
  amountPaid: number;
  receiptNumber: string;
}

export interface T1MovingExpenses {
  applicable: boolean;
  oldAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  newAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  distanceOldToOldOffice: number;
  distanceNewToNewOffice: number;
  airTicketsCost: number;
  travelMealsCost: number;
  moversPackersCost: number;
  temporaryLodgingCost: number;
  otherMovingCosts: number;
  totalMovingCost: number;
  dateOfTravel: string;
  dateJoinedCompany: string;
  companyName: string;
  employerAddress: string;
  incomeEarnedAfterMove: number;
}

export interface T1SelfEmployment {
  hasUberSkipDoorDash: boolean;
  hasGeneralBusiness: boolean;
  hasRentalIncome: boolean;
  uberIncome?: T1UberIncome;
  businessIncome?: T1BusinessIncome;
  rentalIncome?: T1RentalIncome[];
}

export interface T1UberIncome {
  grossIncome: number;
  vehicleExpenses: number;
  phoneExpenses: number;
  suppliesExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  netIncome: number;
  kmDriven: number;
}

export interface T1BusinessIncome {
  businessName: string;
  businessType: string;
  businessNumber: string;
  grossRevenue: number;
  costOfGoodsSold: number;
  advertisingExpenses: number;
  officeExpenses: number;
  professionalFees: number;
  travelExpenses: number;
  vehicleExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  netIncome: number;
}

export interface T1RentalIncome {
  id: string;
  propertyAddress: string;
  propertyType: string;
  ownershipPercentage: number;
  grossRentalIncome: number;
  propertyTaxes: number;
  insurance: number;
  mortgageInterest: number;
  repairsAndMaintenance: number;
  utilities: number;
  managementFees: number;
  otherExpenses: number;
  totalExpenses: number;
  netRentalIncome: number;
}

export interface T1CapitalGain {
  id: string;
  assetType: 'residential_property' | 'stocks' | 'mutual_funds' | 'crypto' | 'other';
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
  unionName: string;
  amountPaid: number;
}

export interface T1Childcare {
  id: string;
  providerName: string;
  providerAddress: string;
  providerSIN?: string;
  childName: string;
  childDOB: string;
  amountPaid: number;
  periodFrom: string;
  periodTo: string;
}

export interface T1FirstTimeFiler {
  dateOfLanding: string;
  countryOfOrigin: string;
  incomeOutsideCanada: number;
  taxPaidOutsideCanada: number;
  assetsOutsideCanada: number;
}

export interface T1OtherIncome {
  id: string;
  description: string;
  source: string;
  amount: number;
}

export interface T1ProfessionalDues {
  id: string;
  memberName: string;
  organizationName: string;
  membershipType: string;
  amountPaid: number;
  examFees?: number;
  licenseFees?: number;
}

export interface T1ChildrenCredit {
  id: string;
  childName: string;
  childDOB: string;
  activityType: 'arts' | 'sports' | 'both';
  instituteName: string;
  programDescription: string;
  amountPaid: number;
}

export interface T1RentPropertyTax {
  rentOrOwn: 'rent' | 'own';
  propertyAddress: string;
  province: 'ON' | 'AB' | 'QC' | 'other';
  rentAmount?: number;
  propertyTaxAmount?: number;
  landlordName?: string;
  landlordAddress?: string;
  occupancyCost: number;
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
  slipType: 'T4' | 'T4A' | 'T4E';
}

export interface T1InvestmentIncome {
  id: string;
  institutionName: string;
  slipType: 'T5' | 'T3' | 'T5008';
  interestIncome?: number;
  dividendsEligible?: number;
  dividendsOther?: number;
  foreignIncome?: number;
  capitalGainsDistributions?: number;
  returnOfCapital?: number;
  acbAdjustment?: number;
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
