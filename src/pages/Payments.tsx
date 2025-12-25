import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePayments, useClients, useCreatePayment } from '@/hooks/useApiData';
import { Payment, PERMISSIONS } from '@/types';
import { CreditCard, Plus, DollarSign, TrendingUp, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Payments() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    clientId: '',
    amount: '',
    method: 'etransfer',
    note: '',
  });

  // API hooks
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: clients = [] } = useClients();
  const createPaymentMutation = useCreatePayment();

  const paymentsWithClient = payments.map((payment) => {
    const client = clients.find((c) => c.id === payment.clientId);
    return { ...payment, clientName: client?.name || 'Unknown' };
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const avgPayment = payments.length > 0 ? totalRevenue / payments.length : 0;

  // Group payments by month for chart
  const monthlyData = payments.reduce((acc: Record<string, number>, p) => {
    const month = p.createdAt.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + p.amount;
    return acc;
  }, {});
  
  const chartData = Object.entries(monthlyData).map(([month, amount]) => ({ month, amount }));

  const columns = [
    {
      key: 'clientName',
      header: 'Client',
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (payment: Payment & { clientName: string }) => (
        <span className="font-medium">${payment.amount}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (payment: Payment & { clientName: string }) => payment.createdAt.toLocaleDateString(),
    },
    {
      key: 'createdBy',
      header: 'Recorded By',
    },
  ];

  const handleAddPayment = async () => {
    if (!newPayment.clientId || !newPayment.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please select a client and enter an amount.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        client_id: newPayment.clientId,
        amount: parseFloat(newPayment.amount),
        method: newPayment.method === 'etransfer' ? 'E-Transfer' : newPayment.method === 'credit' ? 'Credit Card' : 'Debit',
        note: newPayment.note,
        is_request: false,
      });
      
      setNewPayment({ clientId: '', amount: '', method: 'etransfer', note: '' });
      setIsAddOpen(false);
      toast({
        title: 'Payment Added',
        description: `Payment of $${newPayment.amount} has been recorded.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout
      title="Payment Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payments' }]}
    >
      <div className="space-y-6">
        {paymentsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-3xl font-bold">{payments.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Payment</p>
                  <p className="text-3xl font-bold">${avgPayment.toFixed(0)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="amount" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No payment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions & Table */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Payment History</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {hasPermission(PERMISSIONS.ADD_EDIT_PAYMENT) && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Add a new payment record for a client.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      <Select
                        value={newPayment.clientId}
                        onValueChange={(v) => setNewPayment({ ...newPayment, clientId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={newPayment.method}
                        onValueChange={(v) => setNewPayment({ ...newPayment, method: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="etransfer">E-Transfer</SelectItem>
                          <SelectItem value="credit">Credit Card</SelectItem>
                          <SelectItem value="debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Note (Optional)</Label>
                      <Input
                        placeholder="Payment note..."
                        value={newPayment.note}
                        onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPayment} disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Record Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <DataTable
          data={paymentsWithClient}
          columns={columns}
          searchKey="clientName"
          searchPlaceholder="Search by client name..."
        />
      </div>
    </DashboardLayout>
  );
}
