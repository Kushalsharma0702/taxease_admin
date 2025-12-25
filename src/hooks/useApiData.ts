/**
 * API Data Hooks
 * 
 * React Query hooks for fetching real data from backend API.
 * Uses dummy auth token for testing without real login.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { Client, Document, Payment } from '@/types';

// Backend response types
interface BackendClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  filingYear?: number;
  filing_year?: number;
  status: string;
  paymentStatus?: string;
  payment_status?: string;
  assignedAdminId?: string;
  assigned_admin_id?: string;
  assignedAdminName?: string;
  assigned_admin_name?: string;
  totalAmount?: number;
  total_amount?: number;
  paidAmount?: number;
  paid_amount?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface BackendDocument {
  id: string;
  name: string;
  original_filename?: string;
  file_type?: string;
  file_size?: number;
  section_name?: string;
  status: string;
  encrypted?: boolean;
  created_at?: string;
  client_id?: string;
  clientId?: string;
}

interface BackendPayment {
  id: string;
  clientId?: string;
  client_id?: string;
  amount: number;
  method: string;
  note?: string;
  status?: string;
  isRequest?: boolean;
  is_request?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface BackendAnalytics {
  totalClients: number;
  totalAdmins: number;
  pendingDocuments: number;
  pendingPayments: number;
  completedFilings: number;
  totalRevenue: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  clientsByStatus: Array<{ status: string; count: number }>;
  adminWorkload: Array<{ name: string; clients: number }>;
}

// Transform backend client to frontend format
function transformClient(bc: BackendClient): Client {
  return {
    id: bc.id,
    name: bc.name,
    email: bc.email,
    phone: bc.phone || '',
    filingYear: bc.filingYear || bc.filing_year || new Date().getFullYear(),
    status: (bc.status as Client['status']) || 'documents_pending',
    paymentStatus: (bc.paymentStatus || bc.payment_status || 'pending') as Client['paymentStatus'],
    assignedAdminId: bc.assignedAdminId || bc.assigned_admin_id,
    assignedAdminName: bc.assignedAdminName || bc.assigned_admin_name,
    totalAmount: bc.totalAmount || bc.total_amount || 0,
    paidAmount: bc.paidAmount || bc.paid_amount || 0,
    createdAt: new Date(bc.createdAt || bc.created_at || Date.now()),
    updatedAt: new Date(bc.updatedAt || bc.updated_at || Date.now()),
  };
}

// Transform backend document to frontend format
function transformDocument(bd: BackendDocument): Document {
  return {
    id: bd.id,
    clientId: bd.client_id || bd.clientId || '',
    name: bd.name || bd.original_filename || 'Unknown',
    type: bd.file_type || 'other',
    status: (bd.status as Document['status']) || 'pending',
    version: 1,
    uploadedAt: bd.created_at ? new Date(bd.created_at) : undefined,
    sectionKey: bd.section_name,
    fileType: bd.file_type === 'pdf' ? 'pdf' : bd.file_type?.startsWith('image') ? 'image' : 'other',
    fileSize: bd.file_size,
  };
}

// Transform backend payment to frontend format
function transformPayment(bp: BackendPayment): Payment {
  return {
    id: bp.id,
    clientId: bp.clientId || bp.client_id || '',
    amount: bp.amount,
    method: bp.method,
    note: bp.note,
    status: bp.status as Payment['status'],
    isRequest: bp.isRequest || bp.is_request,
    createdAt: new Date(bp.createdAt || bp.created_at || Date.now()),
    createdBy: 'System',
  };
}

// ============ CLIENTS ============

export function useClients(params?: { status?: string; year?: number; search?: string }) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams();
        if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
        if (params?.year) queryParams.append('year', params.year.toString());
        if (params?.search) queryParams.append('search', params.search);
        
        const endpoint = queryParams.toString() 
          ? `${API_ENDPOINTS.ADMIN.CLIENTS}?${queryParams.toString()}`
          : API_ENDPOINTS.ADMIN.CLIENTS;
        
        const response = await apiClient.get<BackendClient[]>(endpoint);
        return (response.data || []).map(transformClient);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<BackendClient>(API_ENDPOINTS.ADMIN.CLIENT(id));
        return transformClient(response.data);
      } catch (error) {
        console.error('Failed to fetch client:', error);
        return null;
      }
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { email: string; first_name: string; last_name: string; phone?: string; password?: string }) => {
      const response = await apiClient.post<BackendClient>(API_ENDPOINTS.CLIENT.CREATE, data);
      return transformClient(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const response = await apiClient.patch<BackendClient>(API_ENDPOINTS.CLIENT.UPDATE(id), data);
      return transformClient(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.CLIENT.DELETE(id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// ============ DOCUMENTS ============

export function useDocuments(clientId?: string) {
  return useQuery({
    queryKey: ['documents', clientId],
    queryFn: async () => {
      try {
        const endpoint = clientId 
          ? API_ENDPOINTS.DOCUMENTS.BY_CLIENT(clientId)
          : API_ENDPOINTS.ADMIN.DOCUMENTS;
        
        const response = await apiClient.get<{ documents?: BackendDocument[] } | BackendDocument[]>(endpoint);
        const docs = Array.isArray(response.data) ? response.data : response.data?.documents || [];
        return docs.map(transformDocument);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        return [];
      }
    },
    staleTime: 30000,
  });
}

export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch<BackendDocument>(API_ENDPOINTS.DOCUMENTS.UPDATE_STATUS(id), { status });
      return transformDocument(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// ============ PAYMENTS ============

export function usePayments(clientId?: string) {
  return useQuery({
    queryKey: ['payments', clientId],
    queryFn: async () => {
      try {
        const endpoint = clientId 
          ? API_ENDPOINTS.PAYMENTS.BY_CLIENT(clientId)
          : API_ENDPOINTS.PAYMENTS.LIST;
        
        const response = await apiClient.get<BackendPayment[]>(endpoint);
        return (response.data || []).map(transformPayment);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        return [];
      }
    },
    staleTime: 30000,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { client_id: string; amount: number; method: string; note?: string; is_request?: boolean }) => {
      const response = await apiClient.post<BackendPayment>(API_ENDPOINTS.PAYMENTS.CREATE, data);
      return transformPayment(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

// ============ ANALYTICS ============

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<BackendAnalytics>(API_ENDPOINTS.ANALYTICS.DASHBOARD);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        // Return default values on error
        return {
          totalClients: 0,
          totalAdmins: 0,
          pendingDocuments: 0,
          pendingPayments: 0,
          completedFilings: 0,
          totalRevenue: 0,
          monthlyRevenue: [],
          clientsByStatus: [],
          adminWorkload: [],
        };
      }
    },
    staleTime: 60000, // 1 minute
  });
}
