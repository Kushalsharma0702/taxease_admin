import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, Filter, Clock, User, ArrowRight, Loader2 } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export default function AuditLogs() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      const data = await apiService.getAuditLogs(params);
      const logsList = data?.logs || [];
      setLogs(logsList.map((l: any) => ({
        ...l,
        performedByName: l.performed_by_name || 'Unknown',
        performedBy: l.performed_by_id,
        entityType: l.entity_type,
        oldValue: l.old_value,
        newValue: l.new_value,
        timestamp: new Date(l.timestamp),
      })));
      setTotalLogs(data?.total || logsList.length);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast({ title: 'Error', description: 'Failed to load audit logs.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    if (search && !log.action.toLowerCase().includes(search.toLowerCase()) &&
        !log.performedByName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getActionColor = (action: string) => {
    if (action.includes('Created') || action.includes('Added')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('Updated') || action.includes('Changed')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (action.includes('Deleted') || action.includes('Removed')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('Requested')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  return (
    <DashboardLayout
      title="Audit Logs"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Logs' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold">{totalLogs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">
                {logs.filter((l) => 
                  l.timestamp.toDateString() === new Date().toDateString()
                ).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{logs.filter((l) => {
                const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                return l.timestamp >= weekAgo;
              }).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Unique Users</p>
              <p className="text-2xl font-bold">
                {new Set(logs.map((l) => l.performedBy)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No logs found.</p>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        <span className="text-sm text-muted-foreground">
                          on {log.entityType}
                        </span>
                      </div>
                      
                      {(log.oldValue || log.newValue) && (
                        <div className="flex items-center gap-2 text-sm">
                          {log.oldValue && (
                            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              {log.oldValue}
                            </span>
                          )}
                          {log.oldValue && log.newValue && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {log.newValue && (
                            <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              {log.newValue}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{log.performedByName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{log.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
