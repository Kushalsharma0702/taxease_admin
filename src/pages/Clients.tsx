import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Client, STATUS_LABELS, ClientStatus } from '@/types';
import { Plus, Download, Trash2, Edit, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

export default function Clients() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [editClient, setEditClient] = useState({ name: '', email: '', phone: '' });

  // Fetch filings from backend (/filings endpoint, mapped as "clients")
  const fetchClients = useCallback(async () => {
    setIsFetching(true);
    try {
      const params: { status?: string; year?: number } = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (yearFilter && yearFilter !== 'all') params.year = parseInt(yearFilter);

      const response = await api.getClients(params);

      // Backend returns FilingResponse objects — map them to Client shape
      // FilingResponse: { id, user_id, filing_year, status, total_fee, paid_amount, payment_status, assigned_admin, created_at, updated_at }
      const filings = response.filings || response.clients || response.users || [];
      const mappedClients: Client[] = filings.map((f: any) => ({
        id: f.id,
        name: f.name || `${f.first_name || ''} ${f.last_name || ''}`.trim() || `Filing ${f.filing_year}`,
        email: f.email || f.user_id || '—',
        phone: f.phone || '',
        filingYear: f.filing_year || new Date().getFullYear(),
        status: (f.status || 'documents_pending') as ClientStatus,
        paymentStatus: f.payment_status || 'pending',
        totalAmount: f.total_fee || f.total_amount || 0,
        paidAmount: f.paid_amount || 0,
        assignedAdminId: f.assigned_admin?.id || f.assigned_admin_id || null,
        assignedAdminName: f.assigned_admin?.name || f.assigned_admin_name || null,
        createdAt: new Date(f.created_at),
        updatedAt: new Date(f.updated_at || f.created_at),
        filingCount: 1,
        t1FormCount: 0,
        latestFiling: new Date(f.created_at),
      }));

      setClients(mappedClients);
    } catch (error: any) {
      console.error('Failed to fetch filings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch records from server',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  }, [statusFilter, yearFilter, toast]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = clients;

  const columns = [
    {
      key: 'name',
      header: 'Client Name',
      sortable: true,
      render: (client: Client) => (
        <div>
          <p className="font-medium">{client.name}</p>
          <p className="text-xs text-muted-foreground">{client.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', sortable: false },
    {
      key: 'filingCount',
      header: 'Filings',
      sortable: true,
      render: (client: Client) => (
        <div className="text-center">
          <span className="font-semibold">{client.filingCount || 0}</span>
        </div>
      ),
    },
    {
      key: 't1FormCount',
      header: 'T1 Forms',
      sortable: true,
      render: (client: Client) => (
        <div className="text-center">
          <span className="font-semibold">{client.t1FormCount || 0}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (client: Client) => <StatusBadge status={client.status} type="client" />,
    },
    {
      key: 'latestFiling',
      header: 'Latest Filing',
      sortable: true,
      render: (client: Client) => (
        <div className="text-sm">
          {client.latestFiling 
            ? new Date(client.latestFiling).toLocaleDateString() 
            : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (client: Client) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clients/${client.id}`);
            }}
            className="transition-all duration-200 hover:scale-105"
          >
            View
          </Button>
          {hasPermission('add_edit_client') && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClient(client);
                  setEditClient({ name: client.name, email: client.email, phone: client.phone });
                  setIsEditOpen(true);
                }}
                className="transition-all duration-200 hover:scale-105"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClient(client);
                  setIsDeleteOpen(true);
                }}
                className="text-destructive hover:text-destructive transition-all duration-200 hover:scale-105"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleAddClient = async () => {
    setIsLoading(true);
    try {
      // Backend creates a filing record — name/email/phone are not stored server-side yet
      await api.createFiling({ filing_year: new Date().getFullYear() });
      setNewClient({ name: '', email: '', phone: '' });
      setIsAddOpen(false);
      toast({
        title: 'Filing Created',
        description: 'A new filing record has been created for the current tax year.',
      });
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create filing record',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;
    setIsLoading(true);
    try {
      // Status/payment_status updates are supported via the filing
      await api.updateClient(selectedClient.id, {
        status: selectedClient.status,
        payment_status: selectedClient.paymentStatus,
      });
      setIsEditOpen(false);
      setSelectedClient(null);
      toast({
        title: 'Record Updated',
        description: 'Filing record has been updated.',
      });
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update record',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    setIsLoading(true);
    try {
      await api.deleteClient(selectedClient.id);
      setIsDeleteOpen(false);
      toast({
        title: 'Not Supported',
        description: 'Delete filing is not available in the current backend.',
        variant: 'destructive',
      });
      setSelectedClient(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Client Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {hasPermission('add_edit_client') && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="transition-all duration-200 hover:scale-105">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="animate-scale-in">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Enter the client's details to create a new record.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="(416) 555-0000"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddClient} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Client
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients', value: filteredClients.length, color: '' },
            { label: 'Documents Pending', value: filteredClients.filter(c => c.status === 'documents_pending').length, color: 'text-amber-600' },
            { label: 'Awaiting Payment', value: filteredClients.filter(c => c.status === 'awaiting_payment').length, color: 'text-orange-600' },
            { label: 'Completed', value: filteredClients.filter(c => c.status === 'completed' || c.status === 'filed').length, color: 'text-green-600' },
          ].map((stat, index) => (
            <div 
              key={stat.label}
              className="p-4 rounded-lg bg-card border border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <DataTable
          data={filteredClients}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Search clients..."
          onRowClick={(client) => navigate(`/clients/${client.id}`)}
        />

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Update the client's information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editClient.name}
                  onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editClient.email}
                  onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editClient.phone}
                  onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })}
                  placeholder="(416) 555-0000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditClient} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="animate-scale-in">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedClient?.name}</strong>? This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteClient}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
