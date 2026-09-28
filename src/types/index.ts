export type UserRole = 'superadmin' | 'admin';

export interface Permission {
  id: string;
  name: string;
  key: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
}

// The filing pipeline, in order. These are the values admin-api writes to
// BOTH filings.status (the timeline the client sees in the app) and
// clients.status (this dashboard's list column) — one vocabulary, one source
// of truth, so an automatic transition can never leave the two disagreeing.
export type FilingPipelineStatus =
  | 'draft'
  | 'documents_pending'
  | 'submitted'
  | 'payment_request_sent'
  | 'payment_completed'
  | 'in_preparation'
  | 'awaiting_approval'
  | 'approved_by_client'
  | 'filed'
  | 'completed'
  | 'cancelled';

// Values older clients.status rows still hold, kept so historical records
// render with a label instead of a raw slug.
export type LegacyClientStatus =
  | 'under_review'
  | 'cost_estimate_sent'
  | 'awaiting_payment';

export type ClientStatus = FilingPipelineStatus | LegacyClientStatus;

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export type DocumentStatus = 'pending' | 'complete' | 'missing' | 'approved' | 'reupload_requested' | 'rejected';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  filingYear: number;
  status: ClientStatus;
  paymentStatus: PaymentStatus;
  assignedAdminId?: string;
  assignedAdminName?: string;
  totalAmount: number;
  paidAmount: number;
  createdAt: Date;
  updatedAt: Date;
  personalInfo?: PersonalInfo;
  // Additional fields from users table
  filingCount?: number;
  t1FormCount?: number;
  latestFiling?: Date | null;
}
export interface T1Question {
  id: string;
  category: string;
  question: string;
  answer: 'yes' | 'no' | 'na' | null;
  requiredDocuments: string[];
}

export interface T1Questionnaire {
  clientId: string;
  filingYear: number;
  questions: T1Question[];
  completedAt?: Date;
}

export interface Document {
  id: string;
  clientId: string;
  name: string;
  type: string;
  status: DocumentStatus;
  version: number;
  uploadedAt?: Date;
  notes?: string;
  questionId?: string; // Links document to specific questionnaire question
  url?: string; // URL to the document file
  sectionKey?: string; // Links document to a specific T1 section (e.g., 'employment_income', 'medical_expenses')
  fileType?: 'pdf' | 'image' | 'other';
  fileSize?: number;
  isMissing?: boolean;
  requestedAt?: Date;
  requestMessage?: string;
}

export interface PersonalInfo {
  sin: string;
  dateOfBirth: Date;
  maritalStatus: 'single' | 'married' | 'common_law' | 'separated' | 'divorced' | 'widowed';
  address: {
    street: string;
    aptSuite?: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  bankInfo?: {
    institution: string;
    transitNumber: string;
    accountNumber: string;
  };
  spouseInfo?: {
    fullName?: string;
    email?: string;
    dateOfMarriage?: Date | string;
    incomePastYear?: number;
    sin?: string;
    dateOfBirth?: Date | string;
  };
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: Date;
  createdBy: string;
  status?: 'requested' | 'received' | 'pending';
  isRequest?: boolean;
}

export interface PaymentRequest {
  id: string;
  clientId: string;
  amount: number;
  note?: string;
  createdAt: Date;
  createdBy: string;
  status: 'pending' | 'received' | 'cancelled';
}

export interface TaxFile {
  id: string;
  clientId: string;
  t1ReturnUrl?: string;
  t183FormUrl?: string;
  refundOrOwing: 'refund' | 'owing';
  amount: number;
  note?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
  sentAt?: Date;
  createdBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'document_request' | 'payment_request' | 'tax_file_approval' | 'payment_received' | 'status_update';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  relatedEntityId?: string;
  relatedEntityType?: 'client' | 'document' | 'payment' | 'tax_file';
}

export interface CostEstimate {
  id: string;
  clientId: string;
  serviceCost: number;
  discount: number;
  gstHst: number;
  total: number;
  status: 'draft' | 'sent' | 'awaiting_payment' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  clientId: string;
  content: string;
  isClientFacing: boolean;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedByName: string;
  timestamp: Date;
}

export const PERMISSIONS = {
  ADD_EDIT_PAYMENT: 'add_edit_payment',
  ADD_EDIT_CLIENT: 'add_edit_client',
  REQUEST_DOCUMENTS: 'request_documents',
  ASSIGN_CLIENTS: 'assign_clients',
  VIEW_ANALYTICS: 'view_analytics',
  APPROVE_COST_ESTIMATE: 'approve_cost_estimate',
  UPDATE_WORKFLOW: 'update_workflow',
} as const;

// Wording comes from the agreed status mapping:
//   form filled → Under Review → payment request sent → Awaiting Payment →
//   payment recorded → Ready to Prepare → Work-in-Progress →
//   Sent for Approval → Approval Received → Filed
export const PIPELINE_STATUS_LABELS: Record<FilingPipelineStatus, string> = {
  draft: 'Form in Draft',
  documents_pending: 'Additional Information Required',
  submitted: 'Under Review',
  payment_request_sent: 'Awaiting Payment',
  payment_completed: 'Ready to Prepare',
  in_preparation: 'Work-in-Progress',
  awaiting_approval: 'Sent for Approval',
  approved_by_client: 'Approval Received',
  filed: 'Filed',
  completed: 'E-Filing Completed',
  cancelled: 'Cancelled',
};

// Statuses an admin may set by hand. Excludes the two the system owns:
// 'draft' (the client hasn't submitted yet) and 'approved_by_client' (only
// the client's own approval in the app can produce it).
export const ADMIN_SETTABLE_STATUSES: FilingPipelineStatus[] = [
  'documents_pending',
  'submitted',
  'payment_request_sent',
  'payment_completed',
  'in_preparation',
  'awaiting_approval',
  'filed',
  'completed',
  'cancelled',
];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  ...PIPELINE_STATUS_LABELS,
  // Legacy clients.status values, mapped onto the same wording.
  under_review: 'Under Review',
  cost_estimate_sent: 'Cost Estimate Sent',
  awaiting_payment: 'Awaiting Payment',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};
