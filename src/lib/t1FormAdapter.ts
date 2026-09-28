/**
 * Adapter: the flat `t1_answers` rows the API returns (field_key + value)
 * → the nested shape both the CRA-ready form view and the PDF export expect.
 *
 * Lifted out of T1CRAReadyForm.tsx so the PDF exporter can use it too. Before
 * that, exportClientPDF() had no way to read live answers: it set its working
 * copy to `null` whenever live data existed and fell back to the mock dataset
 * otherwise, so every real export printed "Not Applicable" for all 15 sections
 * and N/A for personal info, with only a raw dump of field_key strings
 * ("MedicalExpenses.0.PatientName") standing in for the questions.
 */

// Treat "true", 1, "1", and boolean true all as truthy — guards against DB
// returning strings instead of booleans in edge cases.
const parseBool = (v: any): boolean =>
  v === true || v === 'true' || v === 1 || v === '1';

// Convert API T1 form data to the format expected by the component
export function convertApiDataToFormData(t1Data: any) {
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
