import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Users, FileText, DollarSign, CheckCircle, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['hsl(200, 98%, 39%)', 'hsl(213, 93%, 67%)', 'hsl(120, 40%, 50%)', 'hsl(40, 90%, 50%)', 'hsl(0, 70%, 50%)'];

export default function Analytics() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await apiService.getAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        toast({ title: 'Error', description: 'Failed to load analytics.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [toast]);

  if (isLoading) {
    return (
      <DashboardLayout title="Analytics & Reports" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const clientsByStatus = analytics?.clients_by_status || analytics?.clientsByStatus || [];
  const monthlyRevenue = analytics?.monthly_revenue || analytics?.monthlyRevenue || [];
  const adminWorkload = analytics?.admin_workload || analytics?.adminWorkload || [];

  return (
    <DashboardLayout
      title="Analytics & Reports"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]}
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={analytics?.total_clients || analytics?.totalClients || 0}
            icon={Users}
            trend={{ value: 15, isPositive: true }}
          />
          <StatCard
            title="Total Revenue"
            value={`$${(analytics?.total_revenue || analytics?.totalRevenue || 0).toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Completed Filings"
            value={analytics?.completed_filings || analytics?.completedFilings || 0}
            icon={CheckCircle}
          />
          <StatCard
            title="Pending Documents"
            value={analytics?.pending_documents || analytics?.pendingDocuments || 0}
            icon={FileText}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [{ month: 'No data', revenue: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(200, 98%, 39%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(200, 98%, 39%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Clients by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clients by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                    >
                      {clientsByStatus.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Year-wise Filings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientsByStatus.length > 0 ? clientsByStatus : [{ status: 'No data', count: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="status" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Document Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adminWorkload.length > 0 ? adminWorkload : [{ name: 'No data', clients: 0 }]} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="clients" fill="hsl(213, 93%, 67%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Admin Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminWorkload}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="clients" fill="hsl(200, 98%, 39%)" name="Clients" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
