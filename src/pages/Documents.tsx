import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDocuments, useClients } from '@/hooks/useApiData';
import { Document as DocType } from '@/types';
import { FileText, Search, Send, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/types';

export default function Documents() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // API hooks
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { data: clients = [] } = useClients();

  const documentsWithClient = documents.map((doc) => {
    const client = clients.find((c) => c.id === doc.clientId);
    return { ...doc, clientName: client?.name || 'Unknown' };
  });

  const filteredDocs = documentsWithClient.filter((doc) => {
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) &&
        !doc.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: documents.length,
    complete: documents.filter((d) => d.status === 'complete' || d.status === 'approved').length,
    pending: documents.filter((d) => d.status === 'pending').length,
    missing: documents.filter((d) => d.status === 'missing').length,
  };

  const handleRequestDocument = (docName: string) => {
    toast({
      title: 'Request Sent',
      description: `Document request for "${docName}" has been sent to the client.`,
    });
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;

    setIsDeleting(true);
    // TODO: Wire to real DELETE endpoint when available
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsDeleteOpen(false);
    setSelectedDoc(null);
    setIsDeleting(false);
    toast({
      title: 'Document Deleted',
      description: 'The document has been removed from the system.',
    });
  };

  return (
    <DashboardLayout
      title="Document Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents' }]}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Loading State */}
        {docsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Documents', value: stats.total, color: '' },
            { label: 'Complete', value: stats.complete, color: 'text-green-600' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Missing', value: stats.missing, color: 'text-red-600' },
          ].map((stat, index) => (
            <Card 
              key={stat.label}
              className="transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents or clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 transition-all duration-200 focus:scale-[1.01]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc, index) => (
            <Card 
              key={doc.id} 
              className="transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-200 hover:scale-110">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.clientName}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} type="document" />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Version {doc.version}</span>
                  <span>{doc.type}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {doc.status === 'missing' && hasPermission(PERMISSIONS.REQUEST_DOCUMENTS) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 transition-all duration-200 hover:scale-105"
                      onClick={() => handleRequestDocument(doc.name)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Request
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsDeleteOpen(true);
                    }}
                    className="text-destructive hover:text-destructive transition-all duration-200 hover:scale-105"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents found.</p>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="animate-scale-in">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedDoc?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteDocument}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
