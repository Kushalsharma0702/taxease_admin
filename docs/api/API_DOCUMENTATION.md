# TaxHub Admin Dashboard - API Documentation

## Overview

This document provides comprehensive API documentation for building the backend database and API server for the TaxHub Admin Dashboard. All endpoints follow RESTful conventions with JSON request/response bodies.

---

## Configuration

### Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:8001/api/v1` |
| Production | `https://api.taxhub.com/api/v1` |

### Environment Variables (Frontend)

```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_PRODUCTION_API_URL=https://api.taxhub.com/api/v1
```

### Request Headers

All requests include:

```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer <jwt_token>"
}
```

### Standard Response Format

```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
```

### Error Response Format

```typescript
interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}
```

---

## Database Schema

### Users Table (admins)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'admin')),
  permissions TEXT[] DEFAULT '{}',
  avatar VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Clients Table

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  filing_year INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'documents_pending',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  assigned_admin_id UUID REFERENCES users(id),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status ENUM values: 'documents_pending', 'under_review', 'cost_estimate_sent', 
-- 'awaiting_payment', 'in_preparation', 'awaiting_approval', 'filed', 'completed'
-- Payment Status ENUM: 'pending', 'partial', 'paid', 'overdue'
```

### Personal Info Table

```sql
CREATE TABLE personal_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  sin VARCHAR(20),
  date_of_birth DATE,
  marital_status VARCHAR(50),
  street VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  bank_institution VARCHAR(255),
  bank_transit_number VARCHAR(50),
  bank_account_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Spouse Info Table

```sql
CREATE TABLE spouse_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  sin VARCHAR(20),
  email VARCHAR(255),
  date_of_birth DATE,
  date_of_marriage DATE,
  income_past_year DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Documents Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  question_id VARCHAR(100),
  section_key VARCHAR(100),
  url VARCHAR(500),
  file_type VARCHAR(50),
  file_size INTEGER,
  is_missing BOOLEAN DEFAULT false,
  requested_at TIMESTAMP WITH TIME ZONE,
  request_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status ENUM: 'pending', 'complete', 'missing', 'approved', 'reupload_requested'
-- Section Keys: 'employment_income', 'investment_income', 'foreign_property', 
-- 'medical_expenses', 'charitable_donations', 'moving_expenses', etc.
```

### T1 Questionnaire Table

```sql
CREATE TABLE t1_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### T1 Questions Table

```sql
CREATE TABLE t1_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES t1_questionnaires(id) ON DELETE CASCADE,
  question_key VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer VARCHAR(10) CHECK (answer IN ('yes', 'no', 'na', NULL)),
  required_documents TEXT[] DEFAULT '{}'
);
```

### T1 Form Data Tables

#### Employment Income

```sql
CREATE TABLE t1_employment_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  employer_name VARCHAR(255),
  employer_address TEXT,
  t4_box_14 DECIMAL(12, 2), -- Employment Income
  t4_box_16 DECIMAL(12, 2), -- CPP Contributions
  t4_box_17 DECIMAL(12, 2), -- QPP Contributions
  t4_box_18 DECIMAL(12, 2), -- EI Premiums
  t4_box_22 DECIMAL(12, 2), -- Income Tax Deducted
  t4_box_24 DECIMAL(12, 2), -- EI Insurable Earnings
  t4_box_26 DECIMAL(12, 2), -- CPP/QPP Pensionable Earnings
  t4_box_44 DECIMAL(12, 2), -- Union Dues
  t4_box_46 DECIMAL(12, 2), -- Charitable Donations
  t4_box_52 DECIMAL(12, 2), -- Pension Adjustment
  slip_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Investment Income

```sql
CREATE TABLE t1_investment_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  institution_name VARCHAR(255),
  slip_type VARCHAR(100),
  interest_income DECIMAL(12, 2),
  dividends_eligible DECIMAL(12, 2),
  dividends_other DECIMAL(12, 2),
  foreign_income DECIMAL(12, 2),
  capital_gains_distributions DECIMAL(12, 2),
  return_of_capital DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Foreign Property

```sql
CREATE TABLE t1_foreign_property (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  country VARCHAR(100),
  property_type VARCHAR(100),
  investment_details TEXT,
  cost_amount DECIMAL(15, 2),
  gross_income DECIMAL(15, 2),
  gain_loss DECIMAL(15, 2),
  max_cost_during_year DECIMAL(15, 2),
  cost_amount_at_year_end DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Medical Expenses

```sql
CREATE TABLE t1_medical_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  payment_date DATE,
  patient_name VARCHAR(255),
  relationship VARCHAR(100),
  payment_made_to VARCHAR(255),
  description_of_expense TEXT,
  expense_type VARCHAR(100),
  provider_name VARCHAR(255),
  amount_paid DECIMAL(12, 2),
  insurance_covered DECIMAL(12, 2),
  amount_reimbursed DECIMAL(12, 2),
  net_amount DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Charitable Donations

```sql
CREATE TABLE t1_charitable_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  organization_name VARCHAR(255),
  registration_number VARCHAR(100),
  donation_date DATE,
  amount_paid DECIMAL(12, 2),
  receipt_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Moving Expenses

```sql
CREATE TABLE t1_moving_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  applicable BOOLEAN DEFAULT false,
  old_address_street VARCHAR(255),
  old_address_city VARCHAR(100),
  old_address_province VARCHAR(100),
  old_address_postal VARCHAR(20),
  new_address_street VARCHAR(255),
  new_address_city VARCHAR(100),
  new_address_province VARCHAR(100),
  new_address_postal VARCHAR(20),
  distance_old_to_new VARCHAR(50),
  distance_new_to_office VARCHAR(50),
  air_ticket_cost DECIMAL(12, 2),
  movers_and_packers DECIMAL(12, 2),
  meals_and_other_cost DECIMAL(12, 2),
  any_other_cost DECIMAL(12, 2),
  total_moving_cost DECIMAL(12, 2),
  date_of_travel DATE,
  date_of_joining DATE,
  company_name VARCHAR(255),
  new_employer_address TEXT,
  gross_income_after_moving DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Self Employment

```sql
CREATE TABLE t1_self_employment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  has_uber_skip_doordash BOOLEAN DEFAULT false,
  has_general_business BOOLEAN DEFAULT false,
  has_rental_income BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uber/Skip Income Details
CREATE TABLE t1_uber_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  self_employment_id UUID REFERENCES t1_self_employment(id) ON DELETE CASCADE,
  uber_skip_statement VARCHAR(255),
  business_hst_number VARCHAR(50),
  income DECIMAL(12, 2),
  total_km_for_uber DECIMAL(10, 2),
  total_km_driven_entire_year DECIMAL(10, 2),
  meals DECIMAL(12, 2),
  telephone DECIMAL(12, 2),
  parking_fees DECIMAL(12, 2),
  cleaning_expenses DECIMAL(12, 2),
  oil_change_maintenance DECIMAL(12, 2),
  insurance_on_vehicle DECIMAL(12, 2),
  gas DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  net_income DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- General Business Income
CREATE TABLE t1_general_business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  self_employment_id UUID REFERENCES t1_self_employment(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  business_number VARCHAR(50),
  sales_commissions_fees DECIMAL(12, 2),
  gross_income DECIMAL(12, 2),
  advertising DECIMAL(12, 2),
  meals_entertainment DECIMAL(12, 2),
  insurance DECIMAL(12, 2),
  office_expenses DECIMAL(12, 2),
  legal_accounting_fees DECIMAL(12, 2),
  office_rent DECIMAL(12, 2),
  salaries_wages_benefits DECIMAL(12, 2),
  travel DECIMAL(12, 2),
  telephone_utilities DECIMAL(12, 2),
  fuel_costs DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  net_income DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rental Income
CREATE TABLE t1_rental_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  self_employment_id UUID REFERENCES t1_self_employment(id) ON DELETE CASCADE,
  property_address TEXT,
  number_of_units INTEGER,
  property_type VARCHAR(100),
  ownership_percentage DECIMAL(5, 2),
  gross_rental_income DECIMAL(12, 2),
  house_insurance DECIMAL(12, 2),
  property_taxes DECIMAL(12, 2),
  mortgage_interest DECIMAL(12, 2),
  repairs_and_maintenance DECIMAL(12, 2),
  utilities DECIMAL(12, 2),
  management_fees DECIMAL(12, 2),
  other_expenses DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  net_rental_income DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Capital Gains

```sql
CREATE TABLE t1_capital_gains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  asset_type VARCHAR(50), -- 'residential_property', 'stocks', 'mutual_funds', 'crypto'
  property_address TEXT,
  description TEXT,
  purchase_date DATE,
  sale_date DATE,
  purchase_price DECIMAL(15, 2),
  sale_price DECIMAL(15, 2),
  purchase_expenses DECIMAL(12, 2),
  sale_expenses DECIMAL(12, 2),
  capital_gain DECIMAL(15, 2),
  taxable_capital_gain DECIMAL(15, 2),
  principal_residence_exemption BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Work From Home

```sql
CREATE TABLE t1_work_from_home (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  has_t2200 BOOLEAN DEFAULT false,
  employer_name VARCHAR(255),
  total_home_area DECIMAL(10, 2),
  work_area DECIMAL(10, 2),
  work_area_percentage DECIMAL(5, 2),
  rent_expense DECIMAL(12, 2),
  mortgage_interest DECIMAL(12, 2),
  property_tax DECIMAL(12, 2),
  utilities DECIMAL(12, 2),
  home_insurance DECIMAL(12, 2),
  maintenance_repairs DECIMAL(12, 2),
  internet_expense DECIMAL(12, 2),
  supplies_expense DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  claimable_amount DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tuition & Education

```sql
CREATE TABLE t1_tuition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  student_name VARCHAR(255),
  relationship VARCHAR(100),
  institution_name VARCHAR(255),
  institution_address TEXT,
  program_name VARCHAR(255),
  t2202a_amount DECIMAL(12, 2),
  tuition_fees DECIMAL(12, 2),
  education_amount DECIMAL(12, 2),
  textbooks DECIMAL(12, 2),
  months_full_time INTEGER,
  months_part_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Childcare / Daycare

```sql
CREATE TABLE t1_childcare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  provider_name VARCHAR(255),
  provider_address TEXT,
  provider_sin VARCHAR(20),
  identification_number_sin VARCHAR(20),
  child_name VARCHAR(255),
  child_dob DATE,
  amount_paid DECIMAL(12, 2),
  weeks INTEGER,
  period_from DATE,
  period_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Union Dues

```sql
CREATE TABLE t1_union_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  institution_name VARCHAR(255),
  union_name VARCHAR(255),
  amount_paid DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Professional Dues

```sql
CREATE TABLE t1_professional_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  member_name VARCHAR(255),
  organization_name VARCHAR(255),
  membership_type VARCHAR(100),
  amount_paid DECIMAL(12, 2),
  exam_fees DECIMAL(12, 2),
  license_fees DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RRSP Contributions

```sql
CREATE TABLE t1_rrsp_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  institution_name VARCHAR(255),
  account_number VARCHAR(100),
  contribution_date DATE,
  contribution_amount DECIMAL(12, 2),
  receipt_number VARCHAR(100),
  is_spouse_rrsp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Disability Tax Credit

```sql
CREATE TABLE t1_disability_tax_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  filing_year INTEGER NOT NULL,
  claimant_name VARCHAR(255),
  relationship VARCHAR(100),
  disability_type VARCHAR(255),
  certificate_number VARCHAR(100),
  amount DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  method VARCHAR(100),
  note TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  is_request BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tax Files Table

```sql
CREATE TABLE tax_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  t1_return_url VARCHAR(500),
  t183_form_url VARCHAR(500),
  refund_or_owing VARCHAR(20) CHECK (refund_or_owing IN ('refund', 'owing')),
  amount DECIMAL(12, 2),
  note TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Notes Table

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_client_facing BOOLEAN DEFAULT false,
  author_id UUID REFERENCES users(id),
  author_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  related_entity_id UUID,
  related_entity_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES users(id),
  performed_by_name VARCHAR(255),
  ip_address VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication

#### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "admin@taxhub.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@taxhub.com",
      "name": "Admin User",
      "role": "admin",
      "permissions": ["add_edit_payment", "request_documents"]
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresAt": "2024-01-15T12:00:00Z"
  }
}
```

#### POST /auth/logout

Logout and invalidate token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "refreshToken": "new_refresh_token",
    "expiresAt": "2024-01-16T12:00:00Z"
  }
}
```

#### GET /auth/me

Get current user info.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@taxhub.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": ["add_edit_payment", "request_documents"],
    "avatar": "https://...",
    "isActive": true
  }
}
```

---

### Clients

#### GET /clients

List all clients with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10, max: 100) |
| status | string | Filter by status |
| paymentStatus | string | Filter by payment status |
| assignedAdminId | string | Filter by assigned admin |
| search | string | Search by name, email, phone |
| sortBy | string | Sort field (default: createdAt) |
| sortOrder | string | asc or desc (default: desc) |
| filingYear | number | Filter by filing year |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ananya Gupta",
      "email": "ananya@email.com",
      "phone": "+91 98765 12345",
      "filingYear": 2024,
      "status": "under_review",
      "paymentStatus": "partial",
      "assignedAdminId": "uuid",
      "assignedAdminName": "Priya Patel",
      "totalAmount": 25000,
      "paidAmount": 12500,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### GET /clients/:id

Get single client details with all related data.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ananya Gupta",
    "email": "ananya@email.com",
    "phone": "+91 98765 12345",
    "filingYear": 2024,
    "status": "under_review",
    "paymentStatus": "partial",
    "assignedAdminId": "uuid",
    "assignedAdminName": "Priya Patel",
    "totalAmount": 25000,
    "paidAmount": 12500,
    "personalInfo": {
      "sin": "***-***-456",
      "dateOfBirth": "1990-07-22",
      "maritalStatus": "single",
      "address": {
        "street": "15, Linking Road",
        "city": "Mumbai",
        "province": "Maharashtra",
        "postalCode": "400050"
      },
      "bankInfo": {
        "institution": "ICICI Bank",
        "transitNumber": "00123",
        "accountNumber": "****7890"
      }
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T15:30:00Z"
  }
}
```

#### POST /clients

Create a new client.

**Request:**
```json
{
  "name": "New Client",
  "email": "client@email.com",
  "phone": "+91 98765 00000",
  "filingYear": 2024,
  "assignedAdminId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_uuid",
    "name": "New Client",
    "status": "documents_pending",
    "paymentStatus": "pending"
  },
  "message": "Client created successfully"
}
```

#### PUT /clients/:id

Update client information.

**Request:**
```json
{
  "name": "Updated Name",
  "status": "under_review",
  "totalAmount": 30000,
  "assignedAdminId": "uuid"
}
```

#### DELETE /clients/:id

Delete a client.

---

### Documents

#### GET /documents/client/:clientId

Get all documents for a client.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| sectionKey | string | Filter by section |
| type | string | Filter by document type |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clientId": "client_uuid",
      "name": "Form 16 - Wipro",
      "type": "income",
      "status": "approved",
      "version": 1,
      "uploadedAt": "2024-01-11T08:00:00Z",
      "questionId": "q1",
      "sectionKey": "employment_income",
      "url": "https://storage.../form16.pdf",
      "fileType": "pdf",
      "fileSize": 524288
    }
  ]
}
```

#### GET /documents/client/:clientId/section/:sectionKey

Get documents for a specific section.

**Section Keys:**
- `employment_income`
- `investment_income`
- `foreign_property`
- `medical_expenses`
- `charitable_donations`
- `moving_expenses`
- `self_employment`
- `rental_income`
- `capital_gains`
- `work_from_home`
- `tuition`
- `childcare`
- `union_dues`
- `professional_dues`
- `disability_tax_credit`
- `rrsp_contributions`

#### POST /documents/upload

Upload a document.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| file | File | The document file |
| clientId | string | Client ID |
| name | string | Document name |
| type | string | Document type |
| questionId | string | Optional question ID |
| sectionKey | string | Optional section key |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_doc_uuid",
    "name": "Form 16 - Wipro",
    "url": "https://storage.../documents/uuid.pdf",
    "status": "pending",
    "uploadedAt": "2024-01-15T10:00:00Z"
  },
  "message": "Document uploaded successfully"
}
```

#### PUT /documents/:id/verify

Approve/verify a document.

**Request:**
```json
{
  "status": "approved",
  "notes": "Document verified successfully"
}
```

#### POST /documents/:id/mark-missing

Mark a document as missing.

**Request:**
```json
{
  "requestMessage": "Please upload your Form 16 from your employer"
}
```

#### POST /documents/request

Request a document from client.

**Request:**
```json
{
  "clientId": "uuid",
  "documentName": "Medical Bills",
  "sectionKey": "medical_expenses",
  "message": "Please upload your medical expense receipts"
}
```

---

### T1 Form Data

#### GET /t1-form/:clientId

Get complete T1 form data for a client.

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "uuid",
    "filingYear": 2024,
    "personalInfo": {
      "firstName": "Ananya",
      "lastName": "Gupta",
      "sin": "BCDPG5678L",
      "dateOfBirth": "1990-07-22",
      "maritalStatus": "Single",
      "currentAddress": {
        "street": "15, Linking Road, Bandra West",
        "city": "Mumbai",
        "province": "Maharashtra",
        "postalCode": "400050"
      },
      "email": "ananya.gupta@email.com",
      "phone": "+91 98765 12345"
    },
    "employmentIncome": [
      {
        "id": "emp1",
        "employerName": "Wipro Limited",
        "t4Box14": 1250000,
        "t4Box16": 150000,
        "t4Box22": 285000
      }
    ],
    "medicalExpenses": [...],
    "charitableDonations": [...],
    "movingExpenses": {...},
    "selfEmployment": {...}
  }
}
```

#### PUT /t1-form/:clientId

Update T1 form data.

**Request:**
```json
{
  "medicalExpenses": [...],
  "charitableDonations": [...]
}
```

---

### Questionnaire

#### GET /questionnaire/:clientId

Get T1 questionnaire for a client.

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "uuid",
    "filingYear": 2024,
    "questions": [
      {
        "id": "q1",
        "category": "Employment Income",
        "question": "Did you have employment income in 2024?",
        "answer": "yes",
        "requiredDocuments": ["Form 16"]
      },
      {
        "id": "q5",
        "category": "Medical Expenses",
        "question": "Do you have medical expenses to claim?",
        "answer": "yes",
        "requiredDocuments": ["Medical Bills", "Pharmacy Receipts"]
      }
    ],
    "completedAt": "2024-01-10T12:00:00Z"
  }
}
```

---

### Payments

#### GET /clients/:clientId/payments

Get payment history for a client.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clientId": "client_uuid",
      "amount": 12500,
      "method": "UPI",
      "note": "First installment",
      "status": "received",
      "isRequest": false,
      "createdBy": "admin_uuid",
      "createdByName": "Priya Patel",
      "createdAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

#### POST /clients/:clientId/payments

Add a payment.

**Request:**
```json
{
  "amount": 12500,
  "method": "UPI",
  "note": "Second installment"
}
```

#### POST /payment-requests

Create a payment request.

**Request:**
```json
{
  "clientId": "uuid",
  "amount": 12500,
  "note": "Please pay remaining balance"
}
```

---

### Tax Files

#### GET /tax-files/client/:clientId

Get tax files for a client.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clientId": "client_uuid",
      "t1ReturnUrl": "https://storage.../t1_return.pdf",
      "t183FormUrl": "https://storage.../t183_form.pdf",
      "refundOrOwing": "refund",
      "amount": 45000,
      "note": "Tax refund for FY 2024",
      "status": "sent",
      "sentAt": "2024-01-25T14:00:00Z",
      "createdBy": "admin_uuid",
      "createdByName": "Priya Patel",
      "createdAt": "2024-01-24T10:00:00Z"
    }
  ]
}
```

#### POST /tax-files/upload

Upload tax files.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| t1Return | File | T1 Return PDF |
| t183Form | File | T183 Form PDF |
| clientId | string | Client ID |
| refundOrOwing | string | 'refund' or 'owing' |
| amount | number | Refund/owing amount |
| note | string | Optional note |

#### POST /tax-files/:id/send-approval

Send tax file for client approval.

#### POST /tax-files/:id/approve

Approve tax file (by client).

#### POST /tax-files/:id/reject

Reject tax file with reason.

**Request:**
```json
{
  "reason": "Incorrect income amount"
}
```

---

### Notes

#### GET /clients/:clientId/notes

Get notes for a client.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clientId": "client_uuid",
      "content": "Client called regarding document status",
      "isClientFacing": false,
      "authorId": "admin_uuid",
      "authorName": "Priya Patel",
      "createdAt": "2024-01-20T11:00:00Z"
    }
  ]
}
```

#### POST /clients/:clientId/notes

Add a note.

**Request:**
```json
{
  "content": "Follow up required for missing documents",
  "isClientFacing": false
}
```

---

### Filing Status

#### GET /filing-status/:clientId

Get filing status for a client.

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "uuid",
    "currentStatus": "under_review",
    "statusHistory": [
      {
        "status": "documents_pending",
        "changedAt": "2024-01-15T10:00:00Z",
        "changedBy": "system"
      },
      {
        "status": "under_review",
        "changedAt": "2024-01-20T14:00:00Z",
        "changedBy": "Priya Patel"
      }
    ]
  }
}
```

#### PUT /filing-status/:clientId

Update filing status.

**Request:**
```json
{
  "status": "in_preparation",
  "note": "All documents received, starting preparation"
}
```

---

### Notifications

#### GET /notifications

Get notifications for current user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| isRead | boolean | Filter by read status |
| type | string | Filter by notification type |
| limit | number | Max items to return |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "document_request",
      "title": "New Document Uploaded",
      "message": "Ananya Gupta uploaded Form 16",
      "link": "/clients/uuid",
      "isRead": false,
      "relatedEntityId": "doc_uuid",
      "relatedEntityType": "document",
      "createdAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

#### PUT /notifications/:id/read

Mark notification as read.

#### PUT /notifications/mark-all-read

Mark all notifications as read.

---

### Analytics

#### GET /analytics/dashboard

Get dashboard analytics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (YYYY-MM-DD) |
| endDate | string | End date (YYYY-MM-DD) |
| filingYear | number | Filter by filing year |

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClients": 150,
    "activeClients": 45,
    "completedFilings": 89,
    "pendingDocuments": 23,
    "totalRevenue": 3750000,
    "pendingPayments": 450000,
    "clientsByStatus": {
      "documents_pending": 15,
      "under_review": 12,
      "in_preparation": 8,
      "filed": 10,
      "completed": 89
    },
    "recentActivity": [...]
  }
}
```

---

### Admin Management

#### GET /admin/users

List all admin users.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "priya@taxhub.com",
      "name": "Priya Patel",
      "role": "admin",
      "permissions": ["add_edit_payment", "request_documents"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /admin/users

Create new admin user.

**Request:**
```json
{
  "email": "newadmin@taxhub.com",
  "name": "New Admin",
  "password": "securepassword",
  "role": "admin",
  "permissions": ["add_edit_payment"]
}
```

#### PUT /admin/users/:id

Update admin user.

#### DELETE /admin/users/:id

Deactivate admin user.

---

### System

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-20T10:00:00Z",
  "database": "connected",
  "storage": "connected"
}
```

---

## Document Section Keys Reference

| Section Key | Category | Keywords |
|-------------|----------|----------|
| `employment_income` | Employment Income | form 16, salary, employment |
| `investment_income` | Investment Income | investment, fd, dividend |
| `foreign_property` | Foreign Property | foreign, us income, dtaa |
| `medical_expenses` | Medical Expenses | medical, hospital, pharmacy |
| `charitable_donations` | Charitable Donations | donation, charity, 80g |
| `moving_expenses` | Moving Expenses | moving, relocation |
| `self_employment` | Self-Employment | freelance, consulting, business |
| `rental_income` | Rental Income | rent, tenant, property |
| `capital_gains` | Capital Gains | stock, trading, mutual fund |
| `work_from_home` | Work From Home | t2200, home office |
| `tuition` | Tuition | t2202, education, school |
| `childcare` | Childcare | daycare, babysitter |
| `union_dues` | Union Dues | union, dues |
| `professional_dues` | Professional Dues | professional, license |
| `rrsp_contributions` | RRSP/PPF/EPF | rrsp, ppf, epf, nps |
| `disability_tax_credit` | Disability | disability, dtc |

---

## Status Enums

### Client Status
- `documents_pending`
- `under_review`
- `cost_estimate_sent`
- `awaiting_payment`
- `in_preparation`
- `awaiting_approval`
- `filed`
- `completed`

### Payment Status
- `pending`
- `partial`
- `paid`
- `overdue`

### Document Status
- `pending`
- `complete`
- `missing`
- `approved`
- `reupload_requested`

### Tax File Status
- `draft`
- `sent`
- `approved`
- `rejected`

---

## Permissions

| Permission Key | Description |
|----------------|-------------|
| `add_edit_payment` | Add or edit payments |
| `add_edit_client` | Add or edit clients |
| `request_documents` | Request documents from clients |
| `assign_clients` | Assign clients to admins |
| `view_analytics` | View analytics dashboard |
| `approve_cost_estimate` | Approve cost estimates |
| `update_workflow` | Update filing workflow status |

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token has expired |
| `AUTH_UNAUTHORIZED` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_ENTRY` | 409 | Duplicate resource exists |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

- **General endpoints:** 100 requests per minute
- **Auth endpoints:** 10 requests per minute
- **Upload endpoints:** 20 requests per minute

---

## Webhook Events (Optional)

If implementing webhooks for real-time updates:

| Event | Payload |
|-------|---------|
| `client.created` | Full client object |
| `client.status_changed` | Client ID, old status, new status |
| `document.uploaded` | Document object |
| `document.approved` | Document ID, approver |
| `payment.received` | Payment object |
| `tax_file.approved` | Tax file ID, client ID |

---

*Last Updated: December 2024*
*Version: 1.0.0*
