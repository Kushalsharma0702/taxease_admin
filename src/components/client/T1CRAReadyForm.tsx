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

// Treat "true", 1, "1", and boolean true all as truthy — guards against DB
// returning strings instead of booleans in edge cases.
const parseBool = (v: any): boolean =>
  v === true || v === 'true' || v === 1 || v === '1';

// Convert API T1 form data to the format expected by the component
function convertApiDataToFormData(t1Data: any) {
  if (!t1Data || !t1Data.answers) return null;

  // Convert flat answers array to nested object using dot notation
  const answersMap: Record<string, any> = {};
  
  t1Data.answers.forEach((answer: any) => {
    if (!answer.field_key) return;
    const keys = answer.field_key.split('.');
    let current: any = answersMap;
    let valid = true;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      // Handle array notation like children[0]
      const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        if (!Array.isArray(current[arrayName])) current[arrayName] = [];
        if (!current[arrayName][index] || typeof current[arrayName][index] !== 'object') {
          current[arrayName][index] = {};
        }
        current = current[arrayName][index];
      } else {
        // If the key already holds a primitive, convert it to an object so
        // deeper paths don't throw "Cannot create property on boolean/string"
        if (current[key] === null || current[key] === undefined) {
          current[key] = {};
        } else if (typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }

      if (current === null || current === undefined || typeof current !== 'object') {
        valid = false;
        break;
      }
    }

    if (!valid) return;

    const lastKey = keys[keys.length - 1];
    const arrayMatch = lastKey.match(/^(.+)\[(\d+)\]$/);

    try {
      if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        if (!Array.isArray(current[arrayName])) current[arrayName] = [];
        current[arrayName][index] = answer.value;
      } else {
        current[lastKey] = answer.value;
      }
    } catch {
      // Skip fields that can't be set (primitive collision)
    }
  });
  
  // Extract personalInfo with safe defaults
  const personalInfo = answersMap.personalInfo || {};

  // Parse address — prefer structured fields, fall back to currentAddress object, then address string
  let addressObj = { street: '', aptSuite: '', city: '', province: '', postalCode: '', country: '' };
  if (personalInfo.street) {
    // New structured format sent by the Flutter app
    addressObj = {
      street: personalInfo.street || '',
      aptSuite: personalInfo.aptSuite || '',
      city: personalInfo.city || '',
      province: personalInfo.province || '',
      postalCode: personalInfo.postalCode || '',
      country: personalInfo.country || '',
    };
  } else {
    const addressSource = personalInfo.currentAddress || personalInfo.address;
    if (addressSource && typeof addressSource === 'object') {
      addressObj = {
        street: addressSource.street || '',
        aptSuite: addressSource.aptSuite || '',
        city: addressSource.city || '',
        province: addressSource.province || '',
        postalCode: addressSource.postalCode || '',
        country: addressSource.country || '',
      };
    } else if (typeof addressSource === 'string' && addressSource) {
      // Legacy single string — put in street for display
      addressObj.street = addressSource;
    }
  }
  
  // Helper function to safely get value with fallback
  const safeValue = (val: any, defaultVal: any = '') => {
    return val !== undefined && val !== null && val !== 'N/A' ? val : defaultVal;
  };
  
  // Helper to convert array data with proper field mapping
  const convertArray = (arr: any[], fieldMap: Record<string, string> = {}) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => item && typeof item === 'object').map(item => {
      const converted: any = {};
      for (const [key, value] of Object.entries(item)) {
        const mappedKey = fieldMap[key] || key;
        converted[mappedKey] = safeValue(value);
      }
      return converted;
    });
  };
  
  // ── Field-name normalization ──────────────────────────────────────────────
  // The mobile app uses different field names than what the component expects.
  // Map actual DB field_key names → expected component names here.

  // 1. childArtSportEntries → childArtSportActivities
  if (answersMap.childArtSportEntries && !answersMap.childArtSportActivities) {
    answersMap.childArtSportActivities = answersMap.childArtSportEntries;
  }

  // 2. movingExpenseIndividual → movingExpenses (remap field names, add hotel fields)
  const meiSrc = answersMap.movingExpenseIndividual || {};
  if ((answersMap.movingExpenseForIndividual || answersMap.hasMovingExpenses) &&
      Object.keys(meiSrc).length && !answersMap.movingExpenses) {
    const airTickets   = parseFloat(meiSrc.airTicketCost)         || 0;
    const movers       = parseFloat(meiSrc.moversAndPackers)       || 0;
    const meals        = parseFloat(meiSrc.mealsAndOtherCost)      || 0;
    const travelHotel  = parseFloat(meiSrc.travelHotelCost)        || 0;
    const tempLiving   = parseFloat(meiSrc.tempLivingCost)         || 0;
    const other        = parseFloat(meiSrc.anyOtherCost)           || 0;
    answersMap.movingExpenses = {
      applicable:               true,
      distanceFromOldToNew:     meiSrc.distanceFromOldToNew    || '',
      distanceFromNewToOffice:  meiSrc.distanceFromNewToOffice || '',
      dateOfTravel:             meiSrc.dateOfTravel            || '',
      airTicketsCost:           airTickets,
      travelHotelName:          meiSrc.travelHotelName         || '',
      travelHotelNights:        meiSrc.travelHotelNights       || 0,
      travelHotelCost:          travelHotel,
      moversPackersCost:        movers,
      travelMealsCost:          meals,
      tempLivingHotelName:      meiSrc.tempLivingHotelName     || '',
      tempLivingNights:         meiSrc.tempLivingNights        || 0,
      tempLivingCost:           tempLiving,
      otherMovingCosts:         other,
      totalMovingCost:          airTickets + travelHotel + movers + meals + tempLiving + other,
      dateJoinedCompany:        meiSrc.dateOfJoining           || '',
      companyName:              meiSrc.companyName             || '',
      employerAddress:          meiSrc.newEmployerAddress      || '',
      incomeEarnedAfterMove:    parseFloat(meiSrc.grossIncomeAfterMoving) || 0,
      oldAddress:               meiSrc.oldAddress              || '',
      newAddress:               meiSrc.newAddress              || '',
    };
  }

  // 2b. movingExpenseSpouse → movingExpensesSpouse
  const mesSrc = answersMap.movingExpenseSpouse || {};
  if (answersMap.movingExpenseForSpouse && Object.keys(mesSrc).length) {
    const airTickets   = parseFloat(mesSrc.airTicketCost)         || 0;
    const movers       = parseFloat(mesSrc.moversAndPackers)       || 0;
    const meals        = parseFloat(mesSrc.mealsAndOtherCost)      || 0;
    const travelHotel  = parseFloat(mesSrc.travelHotelCost)        || 0;
    const tempLiving   = parseFloat(mesSrc.tempLivingCost)         || 0;
    const other        = parseFloat(mesSrc.anyOtherCost)           || 0;
    answersMap.movingExpensesSpouse = {
      applicable:               true,
      distanceFromOldToNew:     mesSrc.distanceFromOldToNew    || '',
      distanceFromNewToOffice:  mesSrc.distanceFromNewToOffice || '',
      dateOfTravel:             mesSrc.dateOfTravel            || '',
      airTicketsCost:           airTickets,
      travelHotelName:          mesSrc.travelHotelName         || '',
      travelHotelNights:        mesSrc.travelHotelNights       || 0,
      travelHotelCost:          travelHotel,
      moversPackersCost:        movers,
      travelMealsCost:          meals,
      tempLivingHotelName:      mesSrc.tempLivingHotelName     || '',
      tempLivingNights:         mesSrc.tempLivingNights        || 0,
      tempLivingCost:           tempLiving,
      otherMovingCosts:         other,
      totalMovingCost:          airTickets + travelHotel + movers + meals + tempLiving + other,
      dateJoinedCompany:        mesSrc.dateOfJoining           || '',
      companyName:              mesSrc.companyName             || '',
      employerAddress:          mesSrc.newEmployerAddress      || '',
      incomeEarnedAfterMove:    parseFloat(mesSrc.grossIncomeAfterMoving) || 0,
      oldAddress:               mesSrc.oldAddress              || '',
      newAddress:               mesSrc.newAddress              || '',
    };
  }

  // 3. daycareExpenses: remap childcareProvider → providerName
  if (Array.isArray(answersMap.daycareExpenses)) {
    answersMap.daycareExpenses = answersMap.daycareExpenses.map((d: any) => ({
      ...d,
      providerName: d.providerName || d.childcareProvider || '',
      childName:    d.childName    || d.name              || '',
    }));
  }

  // 4a. workFromHomeExpense (legacy single) → workFromHome
  if (answersMap.workFromHomeExpense && !answersMap.workFromHome) {
    answersMap.workFromHome = answersMap.workFromHomeExpense;
  }
  // 4b. workFromHomeIndividual / workFromHomeSpouse → normalized objects
  const normalizeWfh = (src: any) => src ? {
    totalHomeArea:   parseFloat(src.totalHouseArea   || src.totalHomeArea)  || 0,
    workArea:        parseFloat(src.totalWorkArea    || src.workArea)        || 0,
    rentExpense:     parseFloat(src.rentExpense)     || 0,
    mortgageInterest:parseFloat(src.mortgageExpense  || src.mortgageInterest)|| 0,
    internetExpense: parseFloat(src.wifiExpense      || src.internetExpense) || 0,
    utilities:       parseFloat(src.electricityExpense||src.utilities)       || 0,
    waterExpense:    parseFloat(src.waterExpense)    || 0,
    heatExpense:     parseFloat(src.heatExpense)     || 0,
    homeInsurance:   parseFloat(src.totalInsuranceExpense||src.homeInsurance)|| 0,
  } : null;
  if (answersMap.workFromHomeIndividual) {
    answersMap.wfhIndividual = normalizeWfh(answersMap.workFromHomeIndividual);
  }
  if (answersMap.workFromHomeSpouse) {
    answersMap.wfhSpouse = normalizeWfh(answersMap.workFromHomeSpouse);
  }
  if (!answersMap.workFromHome && answersMap.wfhIndividual) {
    answersMap.workFromHome = answersMap.wfhIndividual;
  }

  // 5. disabilityClaimMembers: map approved_year → approvedYear
  if (Array.isArray(answersMap.disabilityClaimMembers)) {
    answersMap.disabilityClaimMembers = answersMap.disabilityClaimMembers.map((d: any) => ({
      ...d,
      approvedYear: d.approvedYear || d.approved_year || '',
    }));
  }
  
  // Convert medical expenses array
  const medicalExpenses = answersMap.medicalExpenses ? convertArray(answersMap.medicalExpenses, {
    description: 'description',
    amount: 'amountPaid',
    amountPaidFromPocket: 'amountPaid',
  }).map(item => ({
    ...item,
    amountPaid: parseFloat(item.amountPaid) || 0,
    paymentDate: item.paymentDate || new Date().toISOString().split('T')[0],
    patientName: item.patientName || `${personalInfo.firstName} ${personalInfo.lastName}`,
    paymentMadeTo: item.paymentMadeTo || item.description,
    insuranceCovered: parseFloat(item.insuranceCovered) || 0
  })) : [];
  
  // Convert charitable donations array
  const charitableDonations = answersMap.charitableDonations ? convertArray(answersMap.charitableDonations, {
    organizationName: 'organizationName',
    amount: 'amountPaid'
  }).map(item => ({
    ...item,
    amountPaid: parseFloat(item.amountPaid) || 0,
    receiptNumber: item.receiptNumber || ''
  })) : [];
  
  // Convert daycare expenses array
  const daycareExpenses = answersMap.daycareExpenses ? convertArray(answersMap.daycareExpenses, {
    childName: 'childName',
    providerName: 'providerName',
    amount: 'amountPaid'
  }).map(item => ({
    ...item,
    amountPaid: parseFloat(item.amountPaid) || 0,
    receiptNumber: item.receiptNumber || ''
  })) : [];
  
  // Convert professional dues array
  const professionalDues = answersMap.professionalDues ? convertArray(answersMap.professionalDues, {
    amount: 'amountPaid'
  }).map(item => ({
    ...item,
    amountPaid: parseFloat(item.amountPaid) || 0,
    memberName: item.memberName || item.name || '',
    organizationName: item.organizationName || item.organization || '',
    receiptNumber: item.receiptNumber || ''
  })) : [];
  
  // Convert RRSP contributions array
  const rrspContributions = answersMap.rrspContributions ? convertArray(answersMap.rrspContributions, {
    institutionName: 'institutionName',
    amount: 'contributionAmount'
  }).map(item => ({
    ...item,
    contributionAmount: parseFloat(item.contributionAmount) || 0,
    receiptNumber: item.receiptNumber || ''
  })) : [];
  
  // Convert children's activities array
  const childrenCredits = answersMap.childArtSportActivities ? convertArray(answersMap.childArtSportActivities, {
    amount: 'amountPaid'
  }).map(item => ({
    ...item,
    instituteName: item.instituteName || item.childName || 'N/A',
    description: item.description || item.activityType || 'N/A',
    programDescription: item.description || item.activityType || 'N/A',
    amountPaid: parseFloat(item.amountPaid) || 0
  })) : [];
  
  // Convert foreign properties array
  const foreignProperties = answersMap.foreignProperties ? convertArray(answersMap.foreignProperties).map(item => ({
    ...item,
    grossIncome: parseFloat(item.grossIncome) || 0,
    gainLoss: parseFloat(item.gainLossOnSale ?? item.gainLoss) || 0,
    maxCostDuringYear: parseFloat(item.maxCostDuringYear) || 0,
    costAmountAtYearEnd: parseFloat(item.costAmountYearEnd ?? item.costAmountAtYearEnd) || 0,
  })) : [];
  
  // Convert work from home data
  const workFromHomeData = answersMap.workFromHome ? {
    totalHomeArea: parseFloat(answersMap.workFromHome.totalHouseArea || answersMap.workFromHome.totalHomeArea) || 0,
    workArea: parseFloat(answersMap.workFromHome.totalWorkArea || answersMap.workFromHome.workArea) || 0,
    rentExpense: parseFloat(answersMap.workFromHome.rentExpense) || 0,
    mortgageInterest: parseFloat(answersMap.workFromHome.mortgageExpense || answersMap.workFromHome.mortgageInterest) || 0,
    internetExpense: parseFloat(answersMap.workFromHome.wifiExpense || answersMap.workFromHome.internetExpense) || 0,
    utilities: parseFloat(answersMap.workFromHome.electricityExpense || answersMap.workFromHome.utilities) || 0,
    waterExpense: parseFloat(answersMap.workFromHome.waterExpense) || 0,
    heatExpense: parseFloat(answersMap.workFromHome.heatExpense) || 0,
    homeInsurance: parseFloat(answersMap.workFromHome.insuranceExpense || answersMap.workFromHome.homeInsurance) || 0,
    claimableAmount: parseFloat(answersMap.workFromHome.claimableAmount) || 0
  } : null;
  
  // Convert spouse info — prefer spouseInfo nested object, fall back to spouse
  const spouseSrc = personalInfo.spouseInfo || personalInfo.spouse;
  const spouseInfo = spouseSrc ? {
    firstName: safeValue(spouseSrc.firstName),
    middleName: safeValue(spouseSrc.middleName),
    lastName: safeValue(spouseSrc.lastName),
    sin: safeValue(spouseSrc.sin),
    dateOfBirth: safeValue(spouseSrc.dateOfBirth),
    email: safeValue(spouseSrc.email),
    phoneNumber: safeValue(spouseSrc.phoneNumber),
    dateOfMarriageOrSeparation: safeValue(spouseSrc.dateOfMarriageOrSeparation),
    netIncome: parseFloat(spouseSrc.netIncome) || 0
  } : null;
  
  // Convert children array
  const children = personalInfo.children ? convertArray(personalInfo.children).map(item => ({
    firstName: safeValue(item.firstName),
    lastName: safeValue(item.lastName),
    dateOfBirth: safeValue(item.dateOfBirth),
    sin: safeValue(item.sin),
    relationship: safeValue(item.relationship)
  })) : [];
  
  // Return a structure that matches what the component expects
  return {
    personalInfo: {
      firstName: safeValue(personalInfo.firstName),
      middleName: safeValue(personalInfo.middleName),
      lastName: safeValue(personalInfo.lastName),
      sin: safeValue(personalInfo.sin),
      maritalStatus: safeValue(personalInfo.maritalStatus, 'single'),
      dateOfBirth: safeValue(personalInfo.dateOfBirth),
      isCanadianCitizen: personalInfo.isCanadianCitizen === true,
      currentAddress: addressObj,
      mailingAddressSame: true,
      mailingAddress: addressObj,
      phone: safeValue(personalInfo.phoneNumber || personalInfo.phone),
      email: safeValue(personalInfo.email),
      directDeposit: personalInfo.directDeposit === true,
      bankInfo: personalInfo.bankInfo || null,
      spouseInfo: spouseInfo,
      spouse: spouseInfo,
      children: children
    },
    employmentIncome: Array.isArray(answersMap.employmentIncome) ? answersMap.employmentIncome : [],
    investmentIncome: Array.isArray(answersMap.investmentIncome) ? answersMap.investmentIncome : [],
    selfEmployment: (parseBool(answersMap.isSelfEmployed) || !!answersMap.selfEmployment) ? (() => {
      const se = answersMap.selfEmployment || {};
      // Normalize businessTypes array → individual boolean flags
      if (Array.isArray(se.businessTypes)) {
        se.hasUberSkipDoorDash = se.hasUberSkipDoorDash ?? se.businessTypes.includes('uber');
        se.hasGeneralBusiness  = se.hasGeneralBusiness  ?? se.businessTypes.includes('general');
        se.hasRentalIncome     = se.hasRentalIncome     ?? se.businessTypes.includes('rental');
      }
      // uberBusiness → uberIncome
      if (se.uberBusiness && !se.uberIncome) se.uberIncome = se.uberBusiness;
      // rentalIncome single object → array
      if (se.rentalIncome && !Array.isArray(se.rentalIncome)) se.rentalIncome = [se.rentalIncome];
      return se;
    })() : null,
    rentalIncome: Array.isArray(answersMap.rentalIncome) ? answersMap.rentalIncome : [],
    rrspContributions: rrspContributions,
    medicalExpenses: medicalExpenses,
    charitableDonations: charitableDonations,
    // Show moving expenses if the boolean flag is set OR if any individual/spouse data object exists
    hasMovingExpenses: parseBool(answersMap.hasMovingExpenses) || !!answersMap.movingExpenseIndividual || !!answersMap.movingExpenseSpouse,
    movingExpenseForIndividual: parseBool(answersMap.movingExpenseForIndividual) || !!answersMap.movingExpenseIndividual,
    movingExpenseForSpouse: parseBool(answersMap.movingExpenseForSpouse) || !!answersMap.movingExpenseSpouse,
    movingExpenses: (parseBool(answersMap.hasMovingExpenses) || !!answersMap.movingExpenseIndividual) ? (answersMap.movingExpenses || null) : null,
    movingExpensesSpouse: (parseBool(answersMap.movingExpenseForSpouse) || !!answersMap.movingExpenseSpouse) ? (answersMap.movingExpensesSpouse || null) : null,
    childcare: daycareExpenses,
    // Show union dues if flag is set OR if the array has entries
    unionDues: (parseBool(answersMap.isUnionMember) || (Array.isArray(answersMap.unionDues) && answersMap.unionDues.length > 0))
      ? (Array.isArray(answersMap.unionDues)
          ? answersMap.unionDues.map((u: any) => ({ ...u, amountPaid: parseFloat(u.amountPaid ?? u.amount) || 0 }))
          : [])
      : [],
    professionalDues: professionalDues,
    tuition: parseBool(answersMap.wasStudentLastYear) ? (Array.isArray(answersMap.tuition) ? answersMap.tuition : []) : [],
    childrenCredits: childrenCredits,
    foreignProperty: foreignProperties,
    isFirstHomeBuyer: parseBool(answersMap.isFirstHomeBuyer),
    // Show property sale data if the flag is set OR if the data object exists
    propertySaleLongTerm: (parseBool(answersMap.soldPropertyLongTerm) || !!answersMap.propertySaleLongTerm) ? (answersMap.propertySaleLongTerm || null) : null,
    propertySaleShortTerm: (parseBool(answersMap.soldPropertyShortTerm) || !!answersMap.propertySaleShortTerm) ? (answersMap.propertySaleShortTerm || null) : null,
    // Show WFH if flag is set OR if any individual/spouse data object exists
    hasWorkFromHomeExpense: parseBool(answersMap.hasWorkFromHomeExpense) || !!answersMap.workFromHomeIndividual || !!answersMap.workFromHomeSpouse || !!answersMap.workFromHome,
    workFromHomeForIndividual: parseBool(answersMap.workFromHomeForIndividual) || !!answersMap.workFromHomeIndividual,
    workFromHomeForSpouse: parseBool(answersMap.workFromHomeForSpouse) || !!answersMap.workFromHomeSpouse,
    workFromHome: workFromHomeData,
    wfhIndividual: answersMap.wfhIndividual || null,
    wfhSpouse: answersMap.wfhSpouse || null,
    isStudent: parseBool(answersMap.wasStudentLastYear),
    hasRrspFhsaInvestment: parseBool(answersMap.hasRrspFhsaInvestment),
    isProvinceFiler: parseBool(answersMap.isProvinceFiler) || (Array.isArray(answersMap.provinceFilerEntries) && answersMap.provinceFilerEntries.length > 0),
    provinceFilerEntries: Array.isArray(answersMap.provinceFilerEntries)
      ? answersMap.provinceFilerEntries.map((e: any) => ({
          ...e,
          amountPaid: e.amountPaid ?? e.rentOrPropertyTaxAmount,
        }))
      : [],
    // Show first-time filer if flag is set OR if any individual/spouse data object exists
    isFirstTimeFiler: parseBool(answersMap.isFirstTimeFiler) || !!answersMap.firstTimeFilerIndividual || !!answersMap.firstTimeFilerSpouse,
    firstTimeFilerForIndividual: parseBool(answersMap.firstTimeFilerForIndividual) || !!answersMap.firstTimeFilerIndividual,
    firstTimeFilerForSpouse: parseBool(answersMap.firstTimeFilerForSpouse) || !!answersMap.firstTimeFilerSpouse,
    firstTimeFilerIndividual: answersMap.firstTimeFilerIndividual || null,
    firstTimeFilerSpouse: answersMap.firstTimeFilerSpouse || null,
    disabilities: answersMap.hasDisabilityTaxCredit ? (answersMap.disabilities || {}) : null,
    disabilityTaxCredit: (() => {
      if (!answersMap.hasDisabilityTaxCredit && !Array.isArray(answersMap.disabilityClaimMembers)) return [];
      // Prefer explicit disabilityClaimMembers array if present
      if (Array.isArray(answersMap.disabilityClaimMembers) && answersMap.disabilityClaimMembers.length > 0) {
        return answersMap.disabilityClaimMembers;
      }
      // Flutter remaps members to hasDisabilityTaxCredit.* (snake_case), rebuild one member object
      const dtc = typeof answersMap.hasDisabilityTaxCredit === 'object' ? answersMap.hasDisabilityTaxCredit : {};
      if (dtc.first_name || dtc.last_name || dtc.relation) {
        return [{
          firstName: dtc.first_name || '',
          lastName: dtc.last_name || '',
          relation: dtc.relation || '',
          approvedYear: dtc.approved_year || '',
          fromYear: dtc.from_year || dtc.fromYear || '',
          toYear: dtc.to_year || dtc.toYear || '',
        }];
      }
      return [];
    })(),
    homeAccessibility: answersMap.homeAccessibility || null,
    politicalContributions: Array.isArray(answersMap.politicalContributions) ? answersMap.politicalContributions : [],
    rentPropertyTax: Array.isArray(answersMap.provinceFilerEntries) && answersMap.provinceFilerEntries.length > 0
      ? {
          ...answersMap.provinceFilerEntries[0],
          amountPaid: answersMap.provinceFilerEntries[0].amountPaid
            ?? answersMap.provinceFilerEntries[0].rentOrPropertyTaxAmount,
        }
      : (answersMap.provinceRent ? {
          rentOrPropertyTax: answersMap.provinceRent.type === 'rent' ? 'Rent' : 'Property Tax',
          propertyAddress: personalInfo.currentAddress
            ? `${personalInfo.currentAddress.street}, ${personalInfo.currentAddress.city}` : '',
          postalCode: personalInfo.currentAddress?.postalCode || '',
          monthsResides: 12,
          amountPaid: parseFloat(answersMap.provinceRent.amount) || 0,
        } : null),
    deceasedReturn: (parseBool(answersMap.isFilingForDeceased) || !!answersMap.deceasedReturnInfo) ? (answersMap.deceasedReturnInfo || null) : null,
    // Other income: use array if present, otherwise build from description string
    otherIncome: Array.isArray(answersMap.otherIncome) && answersMap.otherIncome.length > 0
      ? answersMap.otherIncome.map((o: any) => ({ description: o.description || o.source || '', amount: parseFloat(o.amount) || 0 }))
      : (parseBool(answersMap.hasOtherIncome) && answersMap.otherIncomeDescription
          ? [{ description: answersMap.otherIncomeDescription, amount: 0 }]
          : []),
  };
}

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
            {formData.personalInfo.spouseInfo.email && (
              <CopyableField label="Email" value={formData.personalInfo.spouseInfo.email} />
            )}
            {formData.personalInfo.spouseInfo.phoneNumber && (
              <CopyableField label="Phone Number" value={formData.personalInfo.spouseInfo.phoneNumber} />
            )}
            {formData.personalInfo.spouseInfo.dateOfMarriageOrSeparation && (
              <CopyableField label="Date of Marriage / Separation" value={formatDate(formData.personalInfo.spouseInfo.dateOfMarriageOrSeparation)} />
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
                <CopyableField label="New Address" value={typeof entry.data.newAddress === 'string' ? entry.data.newAddress : ''} />
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
                    <CopyableField label="Net Income" value={formatCurrency(formData.selfEmployment.generalBusiness.grossIncome)} className="font-medium" />
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
        applicable={!!formData.isFirstHomeBuyer}
        sectionData={{ isFirstHomeBuyer: formData.isFirstHomeBuyer } as Record<string, unknown>}
      >
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium">
            Client purchased their first home in the tax year.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Document required: Statement of Adjustment issued by lawyer
          </p>
        </div>
        <QuestionDocuments
          sectionKey="FIRST_HOME_BUYER"
          sectionTitle="First Home Buyer Documents"
          documents={documents}
          requiredDocuments={['Statement of Adjustment issued by lawyer']}
          onApprove={onApproveDoc}
          onRequestReupload={onRequestReupload}
          onRequestMissing={onRequestMissing}
          onView={onViewDoc}
          canEdit={canEdit}
        />
      </T1CRASection>

      {/* Q7: Sold Property (Long Term > 365 days) */}
      <T1CRASection
        title="Q7: Property Sale (Held > 365 days)"
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
                </div>
                <CopyableField label="Purchase Date" value={formatDate(ps.purchaseDate)} />
                <CopyableField label="Sell Date" value={formatDate(ps.sellDate)} />
                <CopyableField label="Capital Gain Earned" value={formatCurrency(ps.capitalGainEarned)} className="font-semibold" />
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
              <h5 className="font-medium text-sm text-muted-foreground">Sale Costs</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Q8: Sold Property (Short Term < 365 days / FLIP) */}
      <T1CRASection
        title="Q8: Property Sale (Held < 365 days / FLIP)"
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
                </div>
                <CopyableField label="Purchase Date" value={formatDate(ps.purchaseDate)} />
                <CopyableField label="Sell Date" value={formatDate(ps.sellDate)} />
                <CopyableField label="Capital Gain Earned" value={formatCurrency(ps.capitalGainEarned)} className="font-semibold" />
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
              <h5 className="font-medium text-sm text-muted-foreground">Sale Costs</h5>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Q9: Work From Home (T2200) */}
      <T1CRASection
        title="Q9: Work From Home Expense (T2200)"
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

      {/* Q10: Student (T2202A) */}
      <T1CRASection
        title="Q10: Student (T2202A Form)"
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

      {/* Q13: First-Time Filer */}
      <T1CRASection
        title="Q13: First-Time Filer"
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

      {/* Q18: Rent or Property Tax (Ontario/Quebec) */}
      <T1CRASection
        title="Q18: Rent or Property Tax (Ontario/Quebec)"
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
