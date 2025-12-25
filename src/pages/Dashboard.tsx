import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics, useClients } from '@/hooks/useApiData';
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
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const navigate = useNavigate();
  const { setSteps, startTour, hasCompletedTour, steps } = useTour();

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

  const recentClients = clients.slice(0, 5);
  const isLoading = analyticsLoading || clientsLoading;

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0]}`}
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      <div className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={analytics?.totalClients ?? 0}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Pending Documents"
            value={analytics?.pendingDocuments ?? 0}
            icon={FileText}
          />
          <StatCard
            title="Pending Payments"
            value={analytics?.pendingPayments ?? 0}
            icon={CreditCard}
          />
          <StatCard
            title="Completed Filings"
            value={analytics?.completedFilings ?? 0}
            icon={CheckCircle}
          />
        </div>

        {isSuperAdmin() && (
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Total Revenue"
              value={`$${(analytics?.totalRevenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 8, isPositive: true }}
            />
            <StatCard
              title="Total Admins"
              value={analytics?.totalAdmins ?? 0}
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
                  <BarChart data={analytics?.monthlyRevenue || []}>
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
                      data={analytics?.clientsByStatus || []}
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
                      {(analytics?.clientsByStatus || []).map((_, index) => (
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
                  {(analytics?.adminWorkload || []).map((admin, i) => (
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
