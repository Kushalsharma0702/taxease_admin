# API Response Reference Documentation

This document describes the expected JSON structures for API responses. This is for developer reference only and is not used directly by the UI.

## Table of Contents

1. [General Response Format](#general-response-format)
2. [Client Object](#client-object)
3. [Filing Status Object](#filing-status-object)
4. [Document Object](#document-object)
5. [Section Summary Object](#section-summary-object)
6. [Document-Section Mapping](#document-section-mapping)

---

## General Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "Additional error context"
    }
  }
}
```

---

## Client Object

Represents a tax client in the system.

```json
{
  "id": "uuid-string",
  "name": "Client Full Name",
  "email": "client@email.com",
  "phone": "+1-555-123-4567",
  "filingYear": 2024,
  "status": "in_progress",
  "paymentStatus": "partial",
  "totalAmount": 500.00,
  "paidAmount": 250.00,
  "assignedAdminId": "admin-uuid",
  "assignedAdminName": "Admin Name",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-12-20T14:22:00Z",
  "personalInfo": {
    "sin": "123-456-789",
    "dateOfBirth": "1985-03-15",
    "maritalStatus": "married",
    "address": {
      "street": "123 Main St",
      "city": "Toronto",
      "province": "ON",
      "postalCode": "M5V 1A1"
    },
    "spouseInfo": {
      "fullName": "Spouse Name",
      "email": "spouse@email.com",
      "dateOfMarriage": "2010-06-20",
      "incomePastYear": 75000.00
    },
    "bankInfo": {
      "institution": "Bank Name",
      "transitNumber": "12345",
      "accountNumber": "1234567890"
    }
  }
}
```

### Client Status Values

| Status | Description |
|--------|-------------|
| `new` | New client, just registered |
| `documents_pending` | Waiting for client to upload documents |
| `documents_received` | All documents received |
| `documents_verified` | All documents verified by admin |
| `cost_estimate_sent` | Payment estimate sent to client |
| `payment_pending` | Waiting for payment |
| `payment_received` | Payment confirmed |
| `in_preparation` | Tax return being prepared |
| `review_pending` | Sent to client for review |
| `approved` | Client approved the return |
| `filed` | Return filed with CRA |
| `completed` | Case completed |

---

## Filing Status Object

Tracks the filing progress and status transitions.

```json
{
  "id": "uuid-string",
  "clientId": "client-uuid",
  "currentStatus": "documents_verified",
  "previousStatus": "documents_received",
  "autoUpdated": true,
  "updatedBy": "admin-uuid",
  "updatedByName": "Admin Name",
  "updatedAt": "2024-12-20T10:00:00Z",
  "reason": "All required documents verified",
  "history": [
    {
      "status": "new",
      "timestamp": "2024-11-01T08:00:00Z",
      "updatedBy": "system",
      "autoUpdated": true
    },
    {
      "status": "documents_received",
      "timestamp": "2024-11-15T14:30:00Z",
      "updatedBy": "client-uuid",
      "autoUpdated": false
    }
  ]
}
```

### Auto-Update Rules

The following status transitions are automatically triggered:

| Trigger | New Status |
|---------|------------|
| All required documents verified | `documents_verified` |
| Initial payment estimate sent | `cost_estimate_sent` |
| Payment confirmed | `in_preparation` |
| Tax files sent for approval | `review_pending` |
| Client approves return | `approved` |

---

## Document Object

Represents an uploaded or requested document.

```json
{
  "id": "uuid-string",
  "clientId": "client-uuid",
  "name": "T4 Slip - Employer A",
  "type": "T4",
  "category": "employment_income",
  "sectionKey": "employment_income",
  "status": "verified",
  "fileType": "pdf",
  "fileSize": 125000,
  "url": "https://storage.example.com/documents/uuid.pdf",
  "uploadedAt": "2024-11-10T09:15:00Z",
  "uploadedBy": "client-uuid",
  "verifiedAt": "2024-11-12T11:30:00Z",
  "verifiedBy": "admin-uuid",
  "notes": "Clear copy, all boxes visible",
  "isMissing": false,
  "requestedAt": null,
  "requestMessage": null
}
```

### Document Status Values

| Status | Description |
|--------|-------------|
| `pending` | Uploaded, awaiting review |
| `verified` | Admin verified the document |
| `rejected` | Document rejected, needs re-upload |
| `missing` | Document marked as missing |
| `requested` | Document request sent to client |

### Document Categories (sectionKey)

| Section Key | Description |
|-------------|-------------|
| `employment_income` | T4, T4A, Form 16 slips |
| `investment_income` | T5, T3, dividend statements |
| `foreign_property` | Foreign investment documents |
| `medical_expenses` | Medical receipts and claims |
| `charitable_donations` | Donation receipts |
| `moving_expenses` | Moving expense documentation |
| `self_employment` | Business income records |
| `uber_income` | Ride-share income statements |
| `rental_income` | Rental property documents |
| `capital_gains` | Property/stock sale documents |
| `work_from_home` | T2200, home office expenses |
| `tuition` | T2202 forms, tuition receipts |
| `childcare` | Daycare expense receipts |
| `union_dues` | Union membership receipts |
| `professional_dues` | Professional membership fees |
| `disability_tax_credit` | DTC approval form |
| `first_time_filer` | Landing papers, foreign income |
| `rrsp_contributions` | RRSP/FHSA contribution slips |
| `tax_returns` | Prepared T1 returns |
| `t183_form` | Electronic filing authorization |

---

## Section Summary Object

Provides a summary of documents per tax section.

```json
{
  "sectionKey": "employment_income",
  "sectionName": "Employment Income",
  "totalDocuments": 3,
  "verifiedDocuments": 2,
  "pendingDocuments": 1,
  "missingDocuments": 0,
  "isComplete": false,
  "documents": [
    {
      "id": "doc-uuid-1",
      "name": "T4 - Employer A",
      "status": "verified"
    },
    {
      "id": "doc-uuid-2",
      "name": "T4 - Employer B",
      "status": "verified"
    },
    {
      "id": "doc-uuid-3",
      "name": "T4A - Contract Income",
      "status": "pending"
    }
  ]
}
```

---

## Document-Section Mapping

Documents are linked to T1 form sections using the `sectionKey` field. This enables:

1. **Non-duplicated visibility**: Same document appears in both the central Documents section AND the relevant detailed section
2. **Section-wise aggregation**: Query documents by section for completeness checks
3. **Automated status updates**: When all documents for a section are verified, trigger status updates

### Mapping Rules

```javascript
// Example: Document uploaded for employment
{
  name: "T4 Slip - ABC Corp",
  sectionKey: "employment_income",  // Links to Employment Income section
  type: "T4"
}

// The document will appear:
// 1. In the central Documents tab
// 2. Inside the Employment Income section in Detailed Data tab
// Both reference the SAME document (no duplication)
```

### API Endpoints for Section Documents

```
GET /documents/client/{clientId}
  - Returns ALL documents for a client

GET /documents/client/{clientId}/section/{sectionKey}
  - Returns documents filtered by section
  - Example: GET /documents/client/123/section/employment_income
```

---

## Payment Request Object

```json
{
  "id": "uuid-string",
  "clientId": "client-uuid",
  "amount": 350.00,
  "status": "pending",
  "note": "Initial payment for tax preparation",
  "createdAt": "2024-12-01T10:00:00Z",
  "createdBy": "admin-uuid",
  "sentAt": "2024-12-01T10:05:00Z",
  "receivedAt": null,
  "receivedBy": null
}
```

### Payment Status Values

| Status | Description |
|--------|-------------|
| `draft` | Created but not sent |
| `pending` | Sent, awaiting payment |
| `received` | Payment confirmed |
| `cancelled` | Request cancelled |

---

## Tax File Object

Represents prepared tax returns and related documents.

```json
{
  "id": "uuid-string",
  "clientId": "client-uuid",
  "filingYear": 2024,
  "t1ReturnUrl": "https://storage.example.com/tax-files/t1-return.pdf",
  "t183FormUrl": "https://storage.example.com/tax-files/t183-form.pdf",
  "refundOrOwing": "refund",
  "amount": 2500.00,
  "status": "pending_approval",
  "note": "Please review and approve for filing",
  "createdAt": "2024-12-15T14:00:00Z",
  "createdBy": "admin-uuid",
  "sentAt": "2024-12-15T14:30:00Z",
  "approvedAt": null,
  "approvedBy": null
}
```

### Tax File Status Values

| Status | Description |
|--------|-------------|
| `draft` | Being prepared |
| `pending_approval` | Sent to client for review |
| `approved` | Client approved |
| `rejected` | Client rejected, needs revision |
| `filed` | Filed with CRA |

---

## Notification Object

```json
{
  "id": "uuid-string",
  "userId": "user-uuid",
  "type": "document_uploaded",
  "title": "New Document Uploaded",
  "message": "Client John Doe uploaded T4 slip",
  "isRead": false,
  "createdAt": "2024-12-20T09:30:00Z",
  "actionUrl": "/clients/client-uuid/documents",
  "relatedClientId": "client-uuid",
  "relatedDocumentId": "doc-uuid"
}
```

### Notification Types

| Type | Description |
|------|-------------|
| `document_uploaded` | Client uploaded a document |
| `document_verified` | Document was verified |
| `document_missing` | Document marked as missing |
| `payment_received` | Payment was received |
| `payment_requested` | Payment request sent |
| `tax_file_uploaded` | Tax return uploaded |
| `tax_file_approved` | Client approved return |
| `status_changed` | Filing status changed |

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. All monetary values are in CAD unless otherwise specified
3. UUIDs are used for all ID fields
4. Nullable fields may be `null` or omitted
5. Pagination uses cursor-based or offset pagination as specified
