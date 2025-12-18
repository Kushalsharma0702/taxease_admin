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

export type ClientStatus = 
  | 'documents_pending'
  | 'under_review'
  | 'cost_estimate_sent'
  | 'awaiting_payment'
  | 'in_preparation'
  | 'awaiting_approval'
  | 'filed'
  | 'completed';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export type DocumentStatus = 'pending' | 'complete' | 'missing' | 'approved' | 'reupload_requested';

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
}

export interface PersonalInfo {
  sin: string;
  dateOfBirth: Date;
  maritalStatus: 'single' | 'married' | 'common_law' | 'separated' | 'divorced' | 'widowed';
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  bankInfo?: {
    institution: string;
    transitNumber: string;
    accountNumber: string;
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

export const STATUS_LABELS: Record<ClientStatus, string> = {
  documents_pending: 'Documents Pending',
  under_review: 'Under Review',
  cost_estimate_sent: 'Cost Estimate Sent',
  awaiting_payment: 'Awaiting Payment',
  in_preparation: 'In Preparation',
  awaiting_approval: 'Awaiting Client Approval',
  filed: 'Filed',
  completed: 'Completed',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};
