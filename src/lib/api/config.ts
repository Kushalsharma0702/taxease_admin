/**
 * Centralized API Configuration
 * 
 * All API calls must be routed through this configuration layer.
 * This ensures:
 * - No hardcoded URLs anywhere in components or services
 * - Easy environment switching (dev/staging/production)
 * - Decoupled admin/client APIs
 * - CORS-safe architecture
 * - Backend evolution without frontend rewrite
 */

// Base URL configuration - uses environment variables with fallbacks
const getBaseUrl = (): string => {
  // Check for environment-specific URLs
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Default based on environment
  if (import.meta.env.MODE === 'production') {
    return import.meta.env.VITE_PRODUCTION_API_URL || 'https://api.taxhub.com/api/v1';
  }
  
  // Development - use ngrok URL
  return 'https://5e44859cea61.ngrok-free.app/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  
  // API Version
  VERSION: 'v1',
  
  // Request timeout in milliseconds
  TIMEOUT: 30000,
  
  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },
} as const;

/**
 * API Endpoint Groups
 * Organized by domain for maintainability
 * Matches backend API structure
 */
export const API_ENDPOINTS = {
  // Client Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REQUEST_OTP: '/auth/request-otp',
    VERIFY_OTP: '/auth/verify-otp',
    ME: '/client/me',
  },

  // Admin Authentication endpoints
  ADMIN_AUTH: {
    LOGIN: '/admin/auth/login',
    LOGOUT: '/admin/auth/logout',
    REGISTER: '/admin/auth/register',
    ME: '/admin/auth/me',
    REFRESH_SESSION: '/admin/auth/refresh-session',
  },

  // Admin endpoints
  ADMIN: {
    LIST: '/admin/admin-users',
    CLIENTS: '/admin/clients',
    CLIENT: (id: string) => `/admin/clients/${id}`,
    DOCUMENTS: '/admin/documents',
    DOCUMENT: (id: string) => `/admin/documents/${id}`,
    PAYMENTS: '/admin/payments',
    ANALYTICS: '/admin/analytics',
  },

  // Client endpoints (for admin use)
  CLIENT: {
    LIST: '/admin/clients',
    CREATE: '/client/add',
    GET: (id: string) => `/admin/clients/${id}`,
    UPDATE: (id: string) => `/admin/clients/${id}`,
    DELETE: (id: string) => `/client/${id}`,
    ME: '/client/me',
  },

  // Document endpoints
  DOCUMENTS: {
    LIST: '/admin/documents',
    UPLOAD: '/documents/upload',
    GET: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
    DOWNLOAD: (id: string) => `/documents/${id}/download`,
    BY_CLIENT: (clientId: string) => `/documents/client/${clientId}`,
    UPDATE_STATUS: (id: string) => `/admin/documents/${id}`,
  },

  // Filing Status endpoints
  FILING: {
    GET_CLIENT: (clientId: string) => `/filing-status/client/${clientId}`,
    UPDATE_ADMIN: (returnId: string) => `/filing-status/admin/${returnId}/status`,
    GET_ALL_RETURNS: '/filing-status/admin/returns',
  },

  // T1 Tax Form endpoints
  T1: {
    SUBMIT: '/t1/tax-return',
    GET: '/t1/tax-return',
  },

  // Chat endpoints
  CHAT: {
    SEND: '/chat/send',
    GET_MESSAGES: (clientId: string) => `/chat/${clientId}`,
    MARK_READ: (clientId: string) => `/chat/${clientId}/mark-read`,
    UNREAD_COUNT: (clientId: string) => `/chat/${clientId}/unread-count`,
  },

  // Payment endpoints
  PAYMENTS: {
    LIST: '/admin/payments',
    CREATE: '/admin/payments',
    GET: (id: string) => `/admin/payments/${id}`,
    BY_CLIENT: (clientId: string) => `/admin/payments?client_id=${clientId}`,
  },

  // Analytics & Reports
  ANALYTICS: {
    DASHBOARD: '/admin/analytics',
  },

  // Health & System
  SYSTEM: {
    HEALTH: '/',
  },
} as const;

/**
 * Build full URL from endpoint
 */
export function buildUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Build URL with query parameters
 */
export function buildUrlWithParams(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const url = buildUrl(endpoint);
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Common request headers
 */
export function getDefaultHeaders(authToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}

/**
 * Document section key mapping
 * Maps T1 form sections to document categories
 */
export const DOCUMENT_SECTION_KEYS = {
  EMPLOYMENT: 'employment_income',
  INVESTMENT: 'investment_income',
  FOREIGN_PROPERTY: 'foreign_property',
  MEDICAL_EXPENSES: 'medical_expenses',
  CHARITABLE_DONATIONS: 'charitable_donations',
  MOVING_EXPENSES: 'moving_expenses',
  SELF_EMPLOYMENT: 'self_employment',
  UBER_INCOME: 'uber_income',
  RENTAL_INCOME: 'rental_income',
  CAPITAL_GAINS: 'capital_gains',
  WORK_FROM_HOME: 'work_from_home',
  TUITION: 'tuition',
  CHILDCARE: 'childcare',
  UNION_DUES: 'union_dues',
  PROFESSIONAL_DUES: 'professional_dues',
  DISABILITY: 'disability_tax_credit',
  FIRST_TIME_FILER: 'first_time_filer',
  RRSP: 'rrsp_contributions',
  RENT_PROPERTY_TAX: 'rent_property_tax',
  TAX_RETURNS: 'tax_returns',
  T183_FORM: 't183_form',
} as const;

export type DocumentSectionKey = typeof DOCUMENT_SECTION_KEYS[keyof typeof DOCUMENT_SECTION_KEYS];

/**
 * Maps questionnaire categories to section keys
 * This ensures Documents tab and Detailed Data tab show the same documents
 */
export const CATEGORY_TO_SECTION_KEY: Record<string, DocumentSectionKey> = {
  'Employment Income': DOCUMENT_SECTION_KEYS.EMPLOYMENT,
  'Investment Income': DOCUMENT_SECTION_KEYS.INVESTMENT,
  'Foreign Property': DOCUMENT_SECTION_KEYS.FOREIGN_PROPERTY,
  'Foreign Income': DOCUMENT_SECTION_KEYS.FOREIGN_PROPERTY,
  'Medical Expenses': DOCUMENT_SECTION_KEYS.MEDICAL_EXPENSES,
  'Charitable Donations': DOCUMENT_SECTION_KEYS.CHARITABLE_DONATIONS,
  'Donations': DOCUMENT_SECTION_KEYS.CHARITABLE_DONATIONS,
  'Moving Expenses': DOCUMENT_SECTION_KEYS.MOVING_EXPENSES,
  'Self-Employment': DOCUMENT_SECTION_KEYS.SELF_EMPLOYMENT,
  'Rental Income': DOCUMENT_SECTION_KEYS.RENTAL_INCOME,
  'Capital Gains': DOCUMENT_SECTION_KEYS.CAPITAL_GAINS,
  'Home Office': DOCUMENT_SECTION_KEYS.WORK_FROM_HOME,
  'Work From Home': DOCUMENT_SECTION_KEYS.WORK_FROM_HOME,
  'Tuition & Education': DOCUMENT_SECTION_KEYS.TUITION,
  'Tuition': DOCUMENT_SECTION_KEYS.TUITION,
  'Education': DOCUMENT_SECTION_KEYS.TUITION,
  'Daycare Expenses': DOCUMENT_SECTION_KEYS.CHILDCARE,
  'Childcare': DOCUMENT_SECTION_KEYS.CHILDCARE,
  'Union Dues': DOCUMENT_SECTION_KEYS.UNION_DUES,
  'Professional Dues': DOCUMENT_SECTION_KEYS.PROFESSIONAL_DUES,
  'Disability': DOCUMENT_SECTION_KEYS.DISABILITY,
  'First-Time Filer': DOCUMENT_SECTION_KEYS.FIRST_TIME_FILER,
  'PPF/EPF Contributions': DOCUMENT_SECTION_KEYS.RRSP,
  'RRSP Contributions': DOCUMENT_SECTION_KEYS.RRSP,
  'Rent/Property Tax': DOCUMENT_SECTION_KEYS.RENT_PROPERTY_TAX,
  'Home Loan': DOCUMENT_SECTION_KEYS.RENT_PROPERTY_TAX,
};

/**
 * Get section key from document category or type
 */
export function getSectionKeyFromCategory(category: string): DocumentSectionKey | undefined {
  return CATEGORY_TO_SECTION_KEY[category];
}

/**
 * Get section key from document type
 */
export function getSectionKeyFromType(type: string): DocumentSectionKey | undefined {
  const typeMapping: Record<string, DocumentSectionKey> = {
    'income': DOCUMENT_SECTION_KEYS.EMPLOYMENT,
    'investment': DOCUMENT_SECTION_KEYS.INVESTMENT,
    'deduction': DOCUMENT_SECTION_KEYS.RRSP,
    'medical': DOCUMENT_SECTION_KEYS.MEDICAL_EXPENSES,
    'rental': DOCUMENT_SECTION_KEYS.RENTAL_INCOME,
    'self_employment': DOCUMENT_SECTION_KEYS.SELF_EMPLOYMENT,
    'tuition': DOCUMENT_SECTION_KEYS.TUITION,
  };
  return typeMapping[type];
}
