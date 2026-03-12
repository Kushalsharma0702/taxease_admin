import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Users, FileText, CreditCard, CheckCircle, DollarSign, UserCog, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTour } from '@/components/tour';
import { dashboardTourSteps } from '@/config/tourSteps';

const COLORS = ['hsl(200, 98%, 39%)', 'hsl(213, 93%, 67%)', 'hsl(215, 20%, 65%)', 'hsl(215, 16%, 46%)', 'hsl(120, 40%, 50%)'];

export default function Dashboard() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { setSteps, startTour, hasCompletedTour, steps } = useTour();
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [analyticsData, clientsData] = await Promise.all([
        apiService.getAnalytics(),
        apiService.getClients({ page_size: 5 }),
      ]);
      setAnalytics(analyticsData);
      setRecentClients((clientsData?.clients || []).map((c: any) => ({
        id: c.id,
        name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        status: c.status || 'active',
      })));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Initialize tour steps when component mounts
  useEffect(() => {
    setSteps(dashboardTourSteps);
  }, [setSteps]);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!hasCompletedTour && steps.length > 0) {
      // Small delay to ensure DOM elements are ready
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, steps.length, startTour]);

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]}>
        <div className="flex justify-center items-center py-24"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0]}`}
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={analytics?.total_clients ?? 0}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Pending Documents"
            value={analytics?.pending_documents ?? 0}
            icon={FileText}
          />
          <StatCard
            title="Pending Payments"
            value={analytics?.pending_payments ?? 0}
            icon={CreditCard}
          />
          <StatCard
            title="Completed Filings"
            value={analytics?.completed_filings ?? 0}
            icon={CheckCircle}
          />
        </div>

        {isSuperAdmin() && (
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Total Revenue"
              value={`$${(analytics?.total_revenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 8, isPositive: true }}
            />
            <StatCard
              title="Total Admins"
              value={analytics?.total_admins ?? 0}
              icon={UserCog}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.monthly_revenue || []}>
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
                    <Bar dataKey="revenue" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clients by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.clients_by_status || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${status}: ${count}`}
                      labelLine={false}
                    >
                      {(analytics?.clients_by_status || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Workload & Recent Clients */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Admin Workload */}
          {isSuperAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(analytics?.admin_workload || []).map((admin: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{admin.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, (admin.clients / 10) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-16">{admin.clients} clients</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Clients */}
          <Card className={isSuperAdmin() ? '' : 'lg:col-span-2'}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Clients</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/clients')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                    <StatusBadge status={client.status} type="client" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
