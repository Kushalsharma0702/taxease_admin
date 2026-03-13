/**
 * API service — connects to the local admin dashboard backend (port 8003).
 *
 * Backend endpoint mapping (local dashboard backend):
 *  /auth/login           → admin login
 *  /auth/me              → current admin info
 *  /clients              → client / filing records
 *  /clients/{id}         → single client record
 *  /documents            → uploaded documents
 *  /documents/{id}       → single document
 *  /payments             → payment records
 *  /payments/{id}        → single payment
 *  /analytics            → dashboard analytics
 *  /audit-logs           → admin audit log
 *  /admin-users          → admin user management
 *  /admin-users/{id}     → single admin user
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(data?.detail || data?.message || statusText);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const isFormData = fetchOptions.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    if (!skipAuth) {
      const token = localStorage.getItem('taxease_access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for remote RDS
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText || 'Unknown error' };
        }
        console.error('API Error:', { url, status: response.status, error: errorData });

        // Auto-clear session and redirect to login on 401
        if (response.status === 401 && !options.skipAuth) {
          localStorage.removeItem('taxease_access_token');
          localStorage.removeItem('taxease_refresh_token');
          localStorage.removeItem('taxease_user');
          localStorage.removeItem('taxease_session_id');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        throw new ApiError(response.status, response.statusText, errorData);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/octet-stream')) {
        return response.blob() as unknown as T;
      }
      if (contentType && !contentType.includes('application/json')) {
        const text = await response.text();
        console.warn('Non-JSON response:', { url, contentType, preview: text.substring(0, 200) });
        return text as unknown as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Network error:', error);
      throw new ApiError(
        0,
        'Network error',
        { detail: error instanceof Error ? error.message : 'Failed to connect to server' }
      );
    }
  }

  // ─── Authentication ───────────────────────────────────────────────────────

  /**
   * Login — backend returns flat { success, access_token, refresh_token, user }
   * We normalise it into a consistent shape for AuthContext.
   */
  async login(email: string, password: string) {
    const response = await this.request<{
      success: boolean;
      message: string;
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      user?: any;
      // legacy nested shape (previous local backend)
      token?: { access_token: string; refresh_token: string; token_type: string; expires_in: number };
      session_id?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    // Normalise token — handle both flat and nested shapes
    const accessToken = response.access_token || response.token?.access_token;
    const refreshToken = response.refresh_token || response.token?.refresh_token;

    if (accessToken) {
      localStorage.setItem('taxease_access_token', accessToken);
      if (refreshToken) localStorage.setItem('taxease_refresh_token', refreshToken);
      if (response.session_id) localStorage.setItem('taxease_session_id', response.session_id);
      if (response.user) localStorage.setItem('taxease_user', JSON.stringify(response.user));
    }

    // Return a normalised shape so AuthContext doesn't need to know the difference
    return {
      success: response.success ?? !!accessToken,
      user: response.user,
      token: {
        access_token: accessToken || '',
        refresh_token: refreshToken || '',
        token_type: response.token_type || response.token?.token_type || 'Bearer',
        expires_in: response.expires_in || response.token?.expires_in || 3600,
      },
      session_id: response.session_id,
    };
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    // Local backend does not expose a /logout endpoint — clean up locally only
    localStorage.removeItem('taxease_access_token');
    localStorage.removeItem('taxease_refresh_token');
    localStorage.removeItem('taxease_user');
    localStorage.removeItem('taxease_session_id');
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('taxease_refresh_token');
    if (!refreshToken) throw new ApiError(401, 'No refresh token');
    const response = await this.request<any>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      skipAuth: true,
    });
    if (response.access_token) {
      localStorage.setItem('taxease_access_token', response.access_token);
    }
    return response;
  }

  // ─── Clients / Filings ────────────────────────────────────────────────────
  //
  // Local backend exposes /clients — each record = one client / tax return.
  // Response is normalised so callers using .filings still work.

  async getFilings(params?: {
    page?: number;
    page_size?: number;
    year?: number;
    status?: string;
    search?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.page_size) q.append('page_size', String(params.page_size));
    if (params?.year) q.append('year', String(params.year));
    if (params?.status && params.status !== 'all') q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    const result = await this.request<{
      clients?: any[]; filings?: any[];
      total: number; page: number; page_size: number; total_pages: number;
    }>(`/clients${qs ? `?${qs}` : ''}`);
    return {
      filings: result.clients || result.filings || [],
      total: result.total,
      page: result.page || 1,
      page_size: result.page_size || 20,
      total_pages: result.total_pages || 1,
    };
  }

  async getFiling(id: string) {
    return this.request<any>(`/clients/${id}`);
  }

  async getFilingTimeline(id: string) {
    // Not available in local backend — return empty timeline
    return { timeline: [] };
  }

  async createFiling(data: { filing_year: number }) {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Clients alias (maps to /filings) ────────────────────────────────────

  async getClients(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    year?: number;
    search?: string;
  }) {
    return this.getFilings(params);
  }

  async getClient(id: string) {
    return this.getFiling(id);
  }

  /** Creating a "client" creates a new filing record */
  async createClient(data: {
    name?: string;
    email?: string;
    phone?: string;
    filing_year: number;
    assigned_admin_id?: string;
  }) {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name || 'New Client',
        email: data.email || 'unknown@example.com',
        phone: data.phone || null,
        filing_year: data.filing_year,
        assigned_admin_id: data.assigned_admin_id,
      }),
    });
  }

  async updateClient(id: string, data: Partial<{
    status: string;
    payment_status: string;
    assigned_admin_id: string;
    total_fee: number;
    paid_amount: number;
  }>) {
    return this.request<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request<void>(`/clients/${id}`, { method: 'DELETE' });
  }

  // Legacy alias methods used in ClientDetail
  async getUser(userId: string) {
    return this.getFiling(userId);
  }

  async getUserFilings(userId: string) {
    return this.getFiling(userId);
  }

  async getUserT1FormData(userId: string) {
    // Primary admin API endpoint for full T1 payload (includes answers)
    try {
      return await this.request<any>(`/users/${userId}/t1-form-data`);
    } catch {
      // Backward-compatible fallback for older environments
      try {
        const forms = await this.getT1PersonalForms();
        return Array.isArray(forms)
          ? forms.find((f: any) => f.filing_id === userId || f.user_id === userId) || null
          : null;
      } catch {
        return null;
      }
    }
  }

  async getUsers(params?: { page?: number; page_size?: number; search?: string }) {
    return this.getFilings(params);
  }

  // ─── Admin Users (/admin-users) ───────────────────────────────────────────

  async getAdminUsers(): Promise<any[]> {
    const result = await this.request<any[] | { admins: any[] }>('/admin-users');
    return Array.isArray(result) ? result : (result as any).admins || [];
  }

  async getAdminUser(id: string) {
    return this.request<any>(`/admin-users/${id}`);
  }

  async createAdminUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    permissions?: string[];
  }) {
    return this.request<any>('/admin-users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(id: string, data: any) {
    return this.request<any>(`/admin-users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string) {
    return this.request<void>(`/admin-users/${id}`, { method: 'DELETE' });
  }

  // ─── T1 Personal Tax Forms (/tax/t1-personal) ─────────────────────────────

  async getT1PersonalForms() {
    return this.request<any[]>('/tax/t1-personal');
  }

  async getT1PersonalForm(formId: string) {
    return this.request<any>(`/tax/t1-personal/${formId}`);
  }

  async createT1PersonalForm(data: {
    tax_year: number;
    filing_id?: string;
    sin?: string;
    marital_status?: string;
    employment_income?: number;
    self_employment_income?: number;
    investment_income?: number;
    other_income?: number;
    rrsp_contributions?: number;
    charitable_donations?: number;
    medical_expenses?: number;
    [key: string]: any;
  }) {
    return this.request<any>('/tax/t1-personal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateT1PersonalForm(formId: string, data: Partial<{
    sin: string;
    marital_status: string;
    employment_income: number;
    self_employment_income: number;
    investment_income: number;
    other_income: number;
    rrsp_contributions: number;
    charitable_donations: number;
    medical_expenses: number;
    [key: string]: any;
  }>) {
    return this.request<any>(`/tax/t1-personal/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteT1PersonalForm(formId: string) {
    return this.request<void>(`/tax/t1-personal/${formId}`, { method: 'DELETE' });
  }

  async submitT1PersonalForm(formId: string) {
    return this.request<any>(`/tax/t1-personal/${formId}/submit`, { method: 'POST' });
  }

  // ─── T1 Forms (/t1-forms) ─────────────────────────────────────────────────

  async getT1Forms() {
    return this.request<any[]>('/t1-forms/');
  }

  async getT1Form(formId: string) {
    return this.request<any>(`/t1-forms/${formId}`);
  }

  async createT1Form(data: any) {
    return this.request<any>('/t1-forms/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateT1Form(formId: string, data: any) {
    return this.request<any>(`/t1-forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteT1Form(formId: string) {
    return this.request<void>(`/t1-forms/${formId}`, { method: 'DELETE' });
  }

  // ─── T1 Business Forms (/t1-forms-business) ───────────────────────────────

  async getT1BusinessForms() {
    return this.request<any[]>('/t1-forms-business/');
  }

  async getT1BusinessForm(formId: string) {
    return this.request<any>(`/t1-forms-business/${formId}`);
  }

  async createT1BusinessForm(data: any) {
    return this.request<any>('/t1-forms-business/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteT1BusinessForm(formId: string) {
    return this.request<void>(`/t1-forms-business/${formId}`, { method: 'DELETE' });
  }

  // ─── Documents (/documents) ───────────────────────────────────────────────

  async getFiles(params?: { skip?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.append('skip', String(params.skip));
    if (params?.limit !== undefined) q.append('limit', String(params.limit));
    const qs = q.toString();
    const result = await this.request<{ documents?: any[]; files?: any[]; total: number }>(
      `/documents${qs ? `?${qs}` : ''}`
    );
    return { files: result.documents || result.files || [], total: result.total || 0 };
  }

  async getFile(fileId: string) {
    return this.request<any>(`/documents/${fileId}`);
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>('/documents', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteFile(fileId: string) {
    return this.request<void>(`/documents/${fileId}`, { method: 'DELETE' });
  }

  async downloadFile(fileId: string) {
    return this.request<Blob>(`/documents/${fileId}/download`);
  }

  async getDocuments(params?: { status?: string; search?: string; client_id?: string }) {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.client_id) q.append('client_id', params.client_id);
    const qs = q.toString();
    const result = await this.request<{ documents?: any[]; files?: any[]; total: number }>(
      `/documents${qs ? `?${qs}` : ''}`
    );
    return { documents: result.documents || result.files || [], total: result.total || 0 };
  }

  async createDocument(data: { client_id?: string; name?: string; type?: string; status?: string }) {
    return this.request<any>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string) {
    return this.deleteFile(id);
  }

  // ─── Encrypted Files (/files/encrypted) ───────────────────────────────────

  async getEncryptedFiles() {
    return this.request<{ files: any[]; total: number }>('/files/encrypted');
  }

  async uploadEncryptedFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>('/files/encrypted/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async decryptFile(fileId: string, password: string) {
    return this.request<any>(`/files/encrypted/${fileId}/decrypt`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async downloadEncryptedFile(fileId: string) {
    return this.request<Blob>(`/files/encrypted/${fileId}/download`);
  }

  async deleteEncryptedFile(fileId: string) {
    return this.request<void>(`/files/encrypted/${fileId}`, { method: 'DELETE' });
  }

  // ─── Encryption (/encryption) ─────────────────────────────────────────────

  async setupEncryption(password: string) {
    return this.request<any>('/encryption/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async rotateEncryptionKeys() {
    return this.request<any>('/encryption/rotate-keys', { method: 'POST' });
  }

  async getEncryptionStats() {
    return this.request<any>('/encryption/stats');
  }

  // ─── Reports (/reports) ───────────────────────────────────────────────────

  async getReports() {
    return this.request<any[]>('/reports');
  }

  async getReport(reportId: string) {
    return this.request<any>(`/reports/${reportId}`);
  }

  async generateReport(data: { report_type: string; title?: string; parameters?: any }) {
    return this.request<any>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteReport(reportId: string) {
    return this.request<void>(`/reports/${reportId}`, { method: 'DELETE' });
  }

  async downloadReport(reportId: string) {
    return this.request<Blob>(`/reports/${reportId}/download`);
  }

  // ─── Payments (/payments) ─────────────────────────────────────────────────

  async getPayments(params?: { client_id?: string }) {
    const q = new URLSearchParams();
    if (params?.client_id) q.append('client_id', params.client_id);
    const qs = q.toString();
    const result = await this.request<{ payments: any[]; total: number; total_revenue: number; avg_payment: number }>(
      `/payments${qs ? `?${qs}` : ''}`
    );
    return result.payments || [];
  }

  async createPayment(data: {
    client_id: string;
    amount: number;
    method: string;
    note?: string;
  }) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: string, data: any) {
    return this.request<any>(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: string) {
    return this.request<void>(`/payments/${id}`, { method: 'DELETE' });
  }

  // ─── Analytics (/analytics) ───────────────────────────────────────────────

  async getAnalytics() {
    try {
      const d = await this.request<{
        total_clients: number; total_admins: number;
        pending_documents: number; pending_payments: number;
        completed_filings: number; total_revenue: number;
        monthly_revenue: any[]; clients_by_status: any[]; admin_workload: any[];
      }>('/analytics');
      return {
        totalClients: d.total_clients,       total_clients: d.total_clients,
        totalAdmins: d.total_admins,
        pendingDocuments: d.pending_documents, pending_documents: d.pending_documents,
        pendingPayments: d.pending_payments,   pending_payments: d.pending_payments,
        completedFilings: d.completed_filings, completed_filings: d.completed_filings,
        totalRevenue: d.total_revenue,         total_revenue: d.total_revenue,
        monthlyRevenue: d.monthly_revenue,     monthly_revenue: d.monthly_revenue,
        clientsByStatus: d.clients_by_status,  clients_by_status: d.clients_by_status,
        adminWorkload: d.admin_workload,        admin_workload: d.admin_workload,
      };
    } catch {
      return {
        totalClients: 0, total_clients: 0,
        totalAdmins: 0,
        pendingDocuments: 0, pending_documents: 0,
        pendingPayments: 0, pending_payments: 0,
        completedFilings: 0, completed_filings: 0,
        totalRevenue: 0, total_revenue: 0,
        monthlyRevenue: [], monthly_revenue: [],
        clientsByStatus: [], clients_by_status: [],
        adminWorkload: [], admin_workload: [],
      };
    }
  }

  // ─── Audit Logs (/audit-logs) ─────────────────────────────────────────────

  async getAuditLogs(params?: {
    page?: number;
    page_size?: number;
    entity_type?: string;
    action?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.page_size) q.append('page_size', String(params.page_size));
    if (params?.entity_type) q.append('entity_type', params.entity_type);
    if (params?.action) q.append('action', params.action);
    const qs = q.toString();
    try {
      return this.request<{ logs: any[]; total: number; page: number; page_size: number; total_pages: number }>(
        `/audit-logs${qs ? `?${qs}` : ''}`
      );
    } catch {
      return { logs: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
    }
  }

  // ─── Filing Status ────────────────────────────────────────────────────────

  async updateFilingStatus(clientId: string, status: string, notes?: string) {
    return this.updateClient(clientId, { status });
  }

  // ─── Notifications (/notifications) ─────────────────────────────────────

  async sendClientNotification(data: {
    client_id: string;
    type?: string;
    title: string;
    message: string;
  }) {
    return this.request<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClientNotifications(clientId: string, unreadOnly = false) {
    const q = new URLSearchParams();
    q.append('client_id', clientId);
    if (unreadOnly) q.append('unread_only', 'true');
    return this.request<any>(`/notifications?${q.toString()}`);
  }

  // ─── Chat — not implemented in local backend ──────────────────────────────

  async getChatMessages(clientId: string) {
    return { messages: [], total: 0 };
  }

  async sendChatMessage(clientId: string, message: string, senderRole: string = 'admin') {
    return null;
  }

  async markMessagesAsRead(clientId: string, role: 'client' | 'admin') {
    return { message: 'ok' };
  }

  async getUnreadCount(clientId: string, role: 'client' | 'admin') {
    return { unread_count: 0 };
  }
}

export const apiService = new ApiService();
export const api = apiService;
