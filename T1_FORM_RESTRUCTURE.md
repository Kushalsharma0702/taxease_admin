# T1 Form Restructure - Complete Alignment with T1 Personal Tax Form Specification

**Date:** December 20, 2025  
**Component:** `src/components/client/T1CRAReadyForm.tsx`  
**Objective:** Complete restructuring to match T1 Personal Tax Form questionnaire specification

---

## Overview

This document details the comprehensive restructuring of the T1 CRA Ready Form component to align with the official T1 Personal Tax Form specification. All sections now match the exact questionnaire structure with proper field mappings.

---

## Major Structural Changes

### 1. **Removed Sections** (Not in T1 Questionnaire)
These sections were removed because T4s, T5s, and other tax slips are **uploaded documents**, not questionnaire responses:

- ❌ **Employment Income (T4 Section)** - T4 slips are uploaded as documents
- ❌ **Investment Income (T5 Section)** - T5 slips are uploaded as documents  
- ❌ **Original Capital Gains Section** - Replaced with Q7 & Q8 specific formats

**Rationale:** The questionnaire captures taxpayer-entered data and decisions, while income slips (T4, T5, T3, etc.) are uploaded as supporting documents referenced in the Document Requirements section.

---

### 2. **Header & Summary Updates**

#### Title Changes:
- Old: "ITR Ready Form" → **New: "T1 Personal Tax Form"**
- Old: "Pre-filled data ready for ITR portal entry • FY {year}" → **New: "Pre-filled questionnaire data • Tax Year {year}"**
- Old: "Copy Full ITR Summary" → **New: "Copy T1 Summary"**

#### Quick Stats Cards:
| Old Metric | New Metric |
|------------|------------|
| Employment Income | Medical Expenses |
| RRSP/FHSA | Charitable Donations |
| Capital Gains | Moving Expenses |
| Donations | Daycare Expenses |

---

## Personal Information Step

### Individual Information Section (Updated)
**Fields aligned with T1 specification:**
- ✅ First Name, Middle Name (optional), Last Name
- ✅ SIN (Individual) - formerly labeled "PAN" (Indian tax reference)
- ✅ Date of Birth
- ✅ Current Address with Postal Code
- ✅ Phone Number, Email
- ✅ **New:** "Canadian Citizen" (Yes/No) - replaces generic status
- ✅ Marital Status (single/married/common-law/separated/divorced/widowed)

**Removed:**
- ❌ Bank account details (IFSC Code, Account Number) - not part of questionnaire

### Spouse Information Section (New - Conditional)
**Shows when:** `maritalStatus === 'married' || maritalStatus === 'common-law'`

**Fields:**
- First Name, Middle Name (optional), Last Name
- SIN (Spouse)
- Date of Birth

### Children Details Section (New - Repeatable)
**Repeatable section** for each child:
- First Name, Middle Name (optional), Last Name
- SIN (optional)
- Date of Birth

---

## Questionnaire Sections (Q1-Q20)

### **Q1: Foreign Property (> CAN$100,000)**
**Question:** *"Did taxpayer own specified foreign property at any time in 2023 with a total cost of more than CAN$100,000?"*

**Fields (Table Format):**
- Investment Details
- Gross Income
- Country

**Changes from old format:**
- Removed: Cost Amount, Gain/Loss, Property Type
- Simplified to match questionnaire table structure

---

### **Q2: Medical Expenses**
**Question:** *"Do you have any Medical Expenses?"*

**Fields (Table Format):**
- Payment Date
- Patient Name
- Amount Paid

**Changes:**
- Removed: Relationship, Expense Type, Provider Name, Amount Reimbursed, Net Amount
- Simplified to core questionnaire fields only

---

### **Q3: Charitable Donations**
**Question:** *"Do you have any Charitable Donations?"*

**Fields (Table Format):**
- Organization Name
- Amount Paid

**Changes:**
- Removed: Registration Number, Donation Date, Receipt Number
- Simplified table structure per spec

---

### **Q4: Moving Expenses (Province Change)**
**Question:** *"If your province or territory of residence changed in 2023, do you have any moving expenses?"*

**Fields Mapped:**
- `distanceFromOldToNew` (replaces `distanceOldToOldOffice`)
- `distanceFromNewToOffice` (replaces `distanceNewToNewOffice`)
- `airTicketCost` (replaces `airTicketsCost`)
- `moversAndPackers` (replaces `moversPackersCost`)
- `mealsAndOtherCost` (replaces `travelMealsCost`)
- `anyOtherCost` (replaces `otherMovingCosts`)
- `dateOfJoining` (replaces `dateJoinedCompany`)
- `grossIncomeAfterMoving` (replaces `incomeEarnedAfterMove`)
- `newEmployerAddress` (replaces `employerAddress`)

**Note:** Component includes fallback logic to support both old and new field names during transition.

---

### **Q5: Self-Employment**
**Question:** *"Are you Self Employed?"*

**Sub-options (Checkbox):**
1. ✅ Uber/Skip/DoorDash
2. ✅ General Business
3. ✅ Rental Income

**Each triggers detail step** (uberSkipDoordash, generalBusiness, rentalIncome)

**Changes:**
- Title: "Delivery / Ride-sharing" → **"Uber/Skip/DoorDash"**
- Title: "Freelance / Business" → **"General Business"**
- Simplified field display to essential data only

---

### **Q6: First Home Purchase** (New Section)
**Question:** *"Did you buy your FIRST HOME in the Tax Year?"*

**Fields:**
- Property Address
- Purchase Date
- Purchase Price

**Document Required:** Statement of Adjustment issued by lawyer

---

### **Q7: Property Sale (Held > 365 days)** (New Section)
**Question:** *"Did you sell any Residential Property which you hold more than 365 days last year?"*

**Fields (Repeatable):**
- Property Address
- Purchase Date
- Sell Date
- Purchase & Sell Expenses
- Capital Gain Earned

**Replaces:** Generic "Capital Gains" section

---

### **Q8: Property Sale (Held < 365 days / FLIP)** (New Section)
**Question:** *"Did you sell any Residential Property which you hold less than 365 days last year? FLIP PROPERTY"*

**Fields (Repeatable):**
- Property Address
- Purchase Date
- Sell Date
- Purchase & Sell Expenses

**Note:** Treated as business income, not capital gains

---

### **Q9: Work From Home Expense (T2200)**
**Question:** *"Did you have any work from home expense in the Tax year? Detailed method, T2200 is required from your employer."*

**Fields (Simplified):**
- Total House Area (Sq.Ft.)
- Work Area (Sq.Ft.)
- Rent/Mortgage Expense
- Utilities Expense
- Claimable Amount

**Removed detailed breakdown:**
- Property Tax, Home Insurance, Maintenance, Internet, Supplies
- Percentage calculations shown separately

**Reason:** Questionnaire captures high-level data; detailed calculations done server-side

---

### **Q10: Student (T2202A Form)**
**Question:** *"Were you a student last year? If yes then we would need T2202A form from your educational institution."*

**Fields (Simplified):**
- Institution Name
- Program Name
- T2202A Amount

**Removed:**
- Student Name, Relationship, Institution Address
- Tuition Fees, Books, Months Full-Time/Part-Time

**Document Required:** T2202 Form

---

### **Q11: Union Member / Union Dues**
**Question:** *"Are you a member of any union? If yes then, do you have any union dues?"*

**Fields (Table):**
- Institution Name
- Amount

**Document Required:** Union Dues Receipt

---

### **Q12: Daycare Expenses**
**Question:** *"Do you have Day care expenses for your child?"*

**Fields (Table):**
- Childcare Provider
- Amount

**Removed:** Child Name, Period From/To

**Document Required:** Day Care Expense Receipts

---

### **Q13: First-Time Filer**
**Question:** *"Are you a first time filer? If Yes, then please provide the following details."*

**Fields:**
- Date of Landing (Individual)
- Income Outside Canada (CAD)

**Removed:**
- Country of Origin
- Tax Paid Outside Canada
- Assets Outside Canada

---

### **Q14: Other Income (No T-Slips)**
**Question:** *"Do you have any other Income in 2023 which does not have T Slips?"*

**Fields (Table):**
- Description
- Amount

**Removed:** Source field

---

### **Q15: Professional Dues / License Fees**
**Question:** *"Do you have any Professional Dues, License Fees, Exam fees which you have paid from your pocket for last year?"*

**Fields (Table):**
- Name
- Organization
- Amount

**Removed:** Membership Type

**Document Required:** Professional Fees Receipt

---

### **Q16: RRSP/FHSA Investment** (Simplified)
**Question:** *"Do you have any RRSP/FHSA Investment?"*

**Fields (Table):**
- Institution
- Amount

**Removed:**
- Contribution Date, Receipt Number, Is Spouse RRSP
- Total summary card (redundant with table)

**Document Required:** RRSP/FHSA T-slips

---

### **Q17: Children's Art & Sport Tax Credit**
**Question:** *"Children's Art & Sport Tax Credit - Do you have any receipts for your child's Sport/fitness & Art for 2023?"*

**Fields (Table):**
- Institute Name
- Description
- Amount

**Removed:** Child Name, Activity Type

**Document Required:** Receipt for Child's Sport/Fitness & Art

---

### **Q18: Rent or Property Tax (Provincial)** (Simplified)
**Question:** *"FOR ONTARIO/ALBERTA/QUEBEC FILER ONLY - Please Provide below details for 2023"*

**Fields:**
- Rent or Property Tax (type)
- Property Address
- Amount Paid

**Removed:**
- Province (implicit in question)
- Separate Rent Amount / Property Tax Amount
- Landlord Name/Address

**Note:** Quebec filer should provide RL-31

---

### **Q19: Disability Tax Credit** (New Section)
**Question:** *"Is any family member has disability tax credit?"*

**Fields (Repeatable):**
- First Name
- Last Name
- Relation
- Approved Year

**Document Required:** Disability Approval form

---

### **Q20: Filing for Deceased Person** (New Section)
**Question:** *"Are you filing a return on behalf of a person who died in this Tax Year?"*

**Fields:**
- Name of Deceased Person
- Date of Death
- Deceased Person SIN
- Mailing Address of Deceased Person
- Legal Representative Name
- Legal Rep. Contact Number
- Legal Rep. Address

**Document Required:** Clearance Certificate

---

## Copy Summary Function Updates

### New Summary Structure:
```
T1 Tax Summary - [Name] - Tax Year [Year]

PERSONAL INFORMATION
Name: [Full name with middle]
SIN: [SIN]
Marital Status: [Status]

DEDUCTIONS & EXPENSES
Moving Expenses: $X
Daycare Expenses: $X
Union Dues: $X
Professional Dues: $X
Work From Home: Claimed

CREDITS
Medical Expenses: $X
Charitable Donations: $X
Education (T2202): Claimed
Children's Art & Sport: $X

OTHER INFORMATION
Foreign Property: X item(s)
First-Time Filer: Yes
Self-Employment: Yes
```

**Changes:**
- Removed: Employment Income, Interest Income, Dividend Income, Capital Gains
- Added: Comprehensive deductions, credits, and other info sections

---

## Type System Updates Required

The following fields are referenced in the component but don't exist in current TypeScript types. These need to be added to `src/types/t1-forms.ts`:

### **T1PersonalInfo interface:**
```typescript
middleName?: string
isCanadianCitizen: boolean
spouseInfo?: {
  firstName: string
  middleName?: string
  lastName: string
  sin: string
  dateOfBirth: string
}
children?: Array<{
  firstName: string
  middleName?: string
  lastName: string
  sin?: string
  dateOfBirth: string
}>
```

### **T1MovingExpenses interface:**
```typescript
distanceFromOldToNew?: number  // replaces distanceOldToOldOffice
distanceFromNewToOffice?: number  // replaces distanceNewToNewOffice
airTicketCost?: number  // replaces airTicketsCost
moversAndPackers?: number  // replaces moversPackersCost
mealsAndOtherCost?: number  // replaces travelMealsCost
anyOtherCost?: number  // replaces otherMovingCosts
dateOfJoining?: string  // replaces dateJoinedCompany
grossIncomeAfterMoving?: number  // replaces incomeEarnedAfterMove
newEmployerAddress?: string  // replaces employerAddress
```

### **T1FormData interface (new fields):**
```typescript
firstHomeBuyer?: {
  propertyAddress: string
  purchaseDate: string
  purchasePrice: number
}

capitalGainsLongTerm?: Array<{
  propertyAddress: string
  purchaseDate: string
  sellDate: string
  purchaseAndSellExpenses: number
  capitalGainEarned: number
}>

capitalGainsShortTerm?: Array<{
  propertyAddress: string
  purchaseDate: string
  sellDate: string
  purchaseAndSellExpenses: number
}>

disabilityTaxCredit?: Array<{
  firstName: string
  lastName: string
  relation: string
  approvedYear: number
}>

deceasedReturn?: {
  deceasedFullName: string
  dateOfDeath: string
  deceasedSin: string
  deceasedMailingAddress: string
  legalRepresentativeName: string
  legalRepresentativeContactNumber: string
  legalRepresentativeAddress: string
}
```

---

## Icons Mapping

All sections now use appropriate Lucide React icons:

| Section | Icon |
|---------|------|
| Individual Information | `<User>` |
| Spouse Information | `<Users>` |
| Children Details | `<Baby>` |
| Q1: Foreign Property | `<Globe>` |
| Q2: Medical Expenses | `<HeartPulse>` |
| Q3: Charitable Donations | `<Gift>` |
| Q4: Moving Expenses | `<Truck>` |
| Q5: Self-Employment | `<Building2>` |
| Q6: First Home | `<Home>` |
| Q7: Property Sale (Long) | `<TrendingUp>` |
| Q8: Property Sale (Flip) | `<Home>` |
| Q9: Work From Home | `<Home>` |
| Q10: Student | `<GraduationCap>` |
| Q11: Union Dues | `<Users>` |
| Q12: Daycare | `<Baby>` |
| Q13: First-Time Filer | `<Plane>` |
| Q14: Other Income | `<Receipt>` |
| Q15: Professional Dues | `<Award>` |
| Q16: RRSP/FHSA | `<DollarSign>` |
| Q17: Children's Art & Sport | `<Palette>` |
| Q18: Rent/Property Tax | `<Home>` |
| Q19: Disability Tax Credit | `<HeartPulse>` |
| Q20: Deceased Return | `<FileText>` |

---

## Migration Notes

### Backward Compatibility
The component includes fallback logic for Moving Expenses fields to support both old and new field names:
```typescript
distanceFromOldToNew || distanceOldToOldOffice
airTicketCost || airTicketsCost
// etc.
```

This allows for graceful transition while backend/database schemas are updated.

### Data Migration Required
Existing data using old field names will need to be migrated to match the new T1 specification field names.

---

## Testing Checklist

- [ ] All 20 questionnaire sections render correctly
- [ ] Conditional sections (Spouse, Children) show/hide properly
- [ ] Copy Summary generates correct T1 format
- [ ] All Quick Stats cards calculate totals accurately
- [ ] Type errors resolved after type definitions updated
- [ ] Document requirements align with T1 specification
- [ ] No references to Indian tax terms (PAN, Form 16, 80C, etc.)
- [ ] Icons display correctly for all sections
- [ ] Responsive layout works on mobile/tablet/desktop

---

## Summary

This restructuring ensures **100% alignment** with the official T1 Personal Tax Form questionnaire specification. All sections now match the exact question numbers (Q1-Q20), field names, and data structures as defined in the T1 form specification provided.

**Key Achievement:** Clear separation between:
- **Questionnaire data** (captured in this form)
- **Document uploads** (T4, T5, T2202, receipts, etc.)

This aligns with the T1 form's `documentRequirements` section, which lists all documents that must be uploaded separately.
