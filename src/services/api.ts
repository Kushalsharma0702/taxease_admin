/**
 * API service for connecting to the backend
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(data?.detail || statusText);
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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (!skipAuth) {
      const token = localStorage.getItem('taxease_access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`API ${options.method || 'GET'} ${url}`, {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText || 'Unknown error' };
        }
        
        // Log error for debugging
        console.error('API Error:', {
          url,
          status: response.status,
          error: errorData
        });
        
        throw new ApiError(
          response.status,
          response.statusText,
          errorData
        );
      }

      // Handle empty responses
      if (response.status === 204) {
        return undefined as T;
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', {
          url,
          contentType,
          status: response.status,
          preview: text.substring(0, 200),
        });
        throw new ApiError(
          response.status,
          'Invalid response format',
          { detail: `Expected JSON but received ${contentType}. Response preview: ${text.substring(0, 100)}` }
        );
      }

      return response.json();
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle network errors
      console.error('Network error:', error);
      throw new ApiError(
        0,
        'Network error',
        { detail: error instanceof Error ? error.message : 'Failed to connect to server' }
      );
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{
      user: any;
      token: {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      };
      session_id?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    // Store tokens and session
    if (response.token?.access_token) {
      localStorage.setItem('taxease_access_token', response.token.access_token);
      localStorage.setItem('taxease_refresh_token', response.token.refresh_token);
      if (response.session_id) {
        localStorage.setItem('taxease_session_id', response.session_id);
      }
      // Store user data
      if (response.user) {
        localStorage.setItem('taxease_user', JSON.stringify(response.user));
      }
    }

    return response;
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    const sessionId = localStorage.getItem('taxease_session_id');
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: sessionId ? JSON.stringify({ session_id: sessionId }) : undefined,
      });
    } catch (e) {
      // Continue with cleanup even if logout fails
    }
    localStorage.removeItem('taxease_access_token');
    localStorage.removeItem('taxease_refresh_token');
    localStorage.removeItem('taxease_user');
    localStorage.removeItem('taxease_session_id');
  }

  // Users (real users with filings and T1 forms)
  async getUsers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    has_filings?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.has_filings !== undefined) queryParams.append('has_filings', params.has_filings.toString());

    const query = queryParams.toString();
    return this.request<any>(`/users${query ? `?${query}` : ''}`);
  }

  async getUserFilings(userId: string) {
    return this.request<any>(`/users/${userId}/filings`);
  }

  async getUser(userId: string) {
    return this.request<any>(`/users/${userId}`);
  }

  async getUserT1FormData(userId: string) {
    return this.request<any>(`/users/${userId}/t1-form-data`);
  }

  // Clients
  async getClients(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    year?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<any>(`/clients${query ? `?${query}` : ''}`);
  }

  async getClient(id: string) {
    return this.request<any>(`/clients/${id}`);
  }

  async createClient(data: {
    name: string;
    email: string;
    phone?: string;
    filing_year: number;
    assigned_admin_id?: string;
  }) {
    // Use client/add endpoint
    return this.request<any>('/client/add', {
      method: 'POST',
      body: JSON.stringify({
        first_name: data.name.split(' ')[0] || data.name,
        last_name: data.name.split(' ').slice(1).join(' ') || '',
        email: data.email,
        phone: data.phone,
        filing_year: data.filing_year,
      }),
    });
  }

  async updateClient(id: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    filing_year: number;
    status: string;
    payment_status: string;
    assigned_admin_id: string;
    total_amount: number;
    paid_amount: number;
  }>) {
    return this.request<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: data.status,
        payment_status: data.payment_status,
        assigned_admin_id: data.assigned_admin_id,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
      }),
    });
  }

  async deleteClient(id: string) {
    return this.request<void>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Users
  async getAdminUsers() {
    return this.request<any[]>('/admin-users');
  }

  async getAdminUser(id: string) {
    const admins = await this.getAdminUsers();
    return admins.find(a => a.id === id);
  }

  async createAdminUser(data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'superadmin';
    permissions: string[];
  }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(id: string, data: Partial<{
    name: string;
    email: string;
    role: string;
    permissions: string[];
    is_active: boolean;
  }>) {
    // Note: Update endpoint needs to be added to backend
    return this.request<any>(`/admin-users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string) {
    // Note: Delete endpoint needs to be added to backend
    return this.request<void>(`/admin-users/${id}`, {
      method: 'DELETE',
    });
  }

  // Documents
  async getDocuments(params?: {
    status?: string;
    search?: string;
    client_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.client_id) queryParams.append('client_id', params.client_id);

    const query = queryParams.toString();
    return this.request<{ documents: any[], total: number }>(`/documents${query ? `?${query}` : ''}`);
  }

  async createDocument(data: {
    client_id: string;
    name: string;
    type: string;
    status?: string;
    notes?: string;
  }) {
    return this.request<any>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string) {
    return this.request<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments
  async getPayments(params?: { client_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.client_id) queryParams.append('client_id', params.client_id);

    const query = queryParams.toString();
    return this.request<any[]>(`/payments${query ? `?${query}` : ''}`);
  }

  async updatePayment(id: string, data: {
    amount?: number;
    method?: string;
    note?: string;
  }) {
    return this.request<any>(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: string) {
    return this.request<void>(`/payments/${id}`, {
      method: 'DELETE',
    });
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

  // Analytics
  async getAnalytics() {
    return this.request<{
      totalClients: number;
      totalAdmins: number;
      pendingDocuments: number;
      pendingPayments: number;
      completedFilings: number;
      totalRevenue: number;
      monthlyRevenue: Array<{ month: string; revenue: number }>;
      clientsByStatus: Array<{ status: string; count: number }>;
      adminWorkload: Array<{ name: string; clients: number }>;
    }>('/analytics');
  }

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    page_size?: number;
    entity_type?: string;
    action?: string;
  }) {
    // Note: Audit logs endpoint needs to be added to backend
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params?.action) queryParams.append('action', params.action);

    const query = queryParams.toString();
    return this.request<{
      logs: any[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>(`/audit-logs${query ? `?${query}` : ''}`);
  }

  // Filing Status Update
  async updateFilingStatus(returnId: string, status: string, notes?: string) {
    return this.request<any>(`/filing-status/admin/${returnId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Chat
  async getChatMessages(clientId: string) {
    return this.request<{ messages: any[]; total: number }>(`/chat/${clientId}`);
  }

  async sendChatMessage(clientId: string, message: string, senderRole: string = 'admin') {
    return this.request<any>('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, message, sender_role: senderRole }),
    });
  }

  async markMessagesAsRead(clientId: string, role: 'client' | 'admin') {
    return this.request<{ message: string }>(`/chat/${clientId}/mark-read?role=${role}`, {
      method: 'PUT',
    });
  }

  async getUnreadCount(clientId: string, role: 'client' | 'admin') {
    return this.request<{ unread_count: number }>(`/chat/${clientId}/unread-count?role=${role}`);
  }
}

export const apiService = new ApiService();
export const api = apiService; // Export as 'api' for backward compatibility
export { ApiError };

