import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { T1SectionCard } from '@/components/client/T1SectionCard';
import { DocumentPreviewModal } from '@/components/client/DocumentPreviewModal';
import { mockClients, mockDocuments, mockPayments, mockNotes, mockQuestionnaires } from '@/data/mockData';
import { STATUS_LABELS, ClientStatus, PERMISSIONS, Note, Document as DocType, T1Question, DocumentStatus } from '@/types';
import {
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Edit,
  ArrowLeft,
  Send,
  Loader2,
  Plus,
  MapPin,
  Building2,
  AlertCircle,
  FileCheck,
  FileMinus,
  FileQuestion,
  UserCircle,
  Banknote,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState(() => mockClients.find((c) => c.id === id));
  const [documents, setDocuments] = useState(() => mockDocuments.filter((d) => d.clientId === id));
  const [payments, setPayments] = useState(() => mockPayments.filter((p) => p.clientId === id));
  const [notes, setNotes] = useState<Note[]>(() => mockNotes.filter((n) => n.clientId === id));
  const questionnaire = useMemo(() => mockQuestionnaires.find((q) => q.clientId === id), [id]);

  const [newNote, setNewNote] = useState('');
  const [isClientFacing, setIsClientFacing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Group questions by category
  const questionsByCategory = useMemo(() => {
    if (!questionnaire) return {};
    return questionnaire.questions.reduce((acc, q) => {
      if (!acc[q.category]) acc[q.category] = [];
      acc[q.category].push(q);
      return acc;
    }, {} as Record<string, T1Question[]>);
  }, [questionnaire]);

  // Calculate overall document stats
  const overallStats = useMemo(() => {
    const approved = documents.filter((d) => d.status === 'approved').length;
    const pending = documents.filter((d) => d.status === 'pending' || d.status === 'complete').length;
    const missing = documents.filter((d) => d.status === 'missing').length;
    const reuploadRequested = documents.filter((d) => d.status === 'reupload_requested').length;
    return { approved, pending, missing, reuploadRequested, total: documents.length };
  }, [documents]);

  if (!client) {
    return (
      <DashboardLayout title="Client Not Found" breadcrumbs={[{ label: 'Clients', href: '/clients' }]}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4 animate-fade-in">
          <p className="text-muted-foreground">The client you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast({ title: 'Error', description: 'Please enter a note.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const note: Note = {
      id: String(Date.now()),
      clientId: client.id,
      authorId: user?.id || '1',
      authorName: user?.name || 'Admin',
      content: newNote,
      isClientFacing,
      createdAt: new Date(),
    };
    setNotes([note, ...notes]);
    setNewNote('');
    setIsLoading(false);
    toast({ title: 'Note Added', description: isClientFacing ? 'Client-facing note added.' : 'Internal note added.' });
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setClient({ ...client, status: newStatus as ClientStatus });
    setIsLoading(false);
    toast({ title: 'Status Updated', description: `Status changed to ${STATUS_LABELS[newStatus as ClientStatus]}.` });
  };

  const handleEditClient = async () => {
    if (!editForm.name || !editForm.email) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setClient({ ...client, name: editForm.name, email: editForm.email, phone: editForm.phone });
    setIsEditOpen(false);
    setIsLoading(false);
    toast({ title: 'Client Updated', description: 'Client information updated successfully.' });
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid payment amount.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const payment = {
      id: String(Date.now()),
      clientId: client.id,
      amount,
      method: 'Credit Card',
      reference: `PAY-${Date.now()}`,
      note: '',
      createdAt: new Date(),
      createdBy: user?.name || 'Admin',
    };
    setPayments([payment, ...payments]);
    setClient({
      ...client,
      paidAmount: client.paidAmount + amount,
      paymentStatus: client.paidAmount + amount >= client.totalAmount ? 'paid' : 'partial',
    });
    setPaymentAmount('');
    setIsAddPaymentOpen(false);
    setIsLoading(false);
    toast({ title: 'Payment Recorded', description: `$${amount.toFixed(2)} payment recorded.` });
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDocuments((prev) => prev.filter((d) => d.id !== selectedDoc.id));
    setIsDeleteDocOpen(false);
    setSelectedDoc(null);
    setIsLoading(false);
    toast({ title: 'Document Deleted', description: 'The document has been removed.' });
  };

  const handleRequestDocument = (docName?: string, reason?: string) => {
    toast({
      title: 'Request Sent',
      description: docName ? `Request for "${docName}" sent to client.` : 'Document request sent to client.',
    });
  };

  const handleApproveDocument = async (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'approved' as DocumentStatus } : d))
    );
    toast({ title: 'Document Approved', description: 'The document has been approved.' });
  };

  const handleRequestReupload = async (docId: string, reason: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: 'reupload_requested' as DocumentStatus, notes: reason } : d
      )
    );
  };

  const handleBulkRequestMissing = (category: string) => {
    toast({
      title: 'Bulk Request Sent',
      description: `Request for all missing documents in "${category}" sent to client.`,
    });
  };

  const handleViewDocument = (doc: DocType) => {
    setSelectedDoc(doc);
    setIsPreviewOpen(true);
  };

  return (
    <DashboardLayout
      title=""
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clients', href: '/clients' },
        { label: client.name },
      ]}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Client Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="transition-all duration-200 hover:translate-x-[-4px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Filing Year: {client.filingYear}</span>
                  <span>•</span>
                  <StatusBadge status={client.status} type="client" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            {hasPermission(PERMISSIONS.UPDATE_WORKFLOW) && (
              <Select defaultValue={client.status} onValueChange={handleStatusUpdate}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasPermission(PERMISSIONS.ADD_EDIT_CLIENT) && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditForm({ name: client.name, email: client.email, phone: client.phone });
                  setIsEditOpen(true);
                }}
                className="transition-all duration-200 hover:scale-105"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="transition-all duration-200">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="questionnaire" className="transition-all duration-200">
              <FileText className="h-4 w-4 mr-2" />
              T1 Form
            </TabsTrigger>
            <TabsTrigger value="payments" className="transition-all duration-200">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="notes" className="transition-all duration-200">
              <MessageSquare className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 animate-fade-in space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Personal Information */}
              <Card className="lg:col-span-2 transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{client.phone}</p>
                      </div>
                    </div>
                    {client.personalInfo && (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                            <p className="font-medium">{client.personalInfo.dateOfBirth.toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                          <User className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">SIN</p>
                            <p className="font-medium">{client.personalInfo.sin}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 sm:col-span-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Address</p>
                            <p className="font-medium">
                              {client.personalInfo.address.street}, {client.personalInfo.address.city},{' '}
                              {client.personalInfo.address.province} {client.personalInfo.address.postalCode}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                          <UserCircle className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Marital Status</p>
                            <p className="font-medium capitalize">{client.personalInfo.maritalStatus.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {client.personalInfo.bankInfo && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <Building2 className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Bank</p>
                              <p className="font-medium">{client.personalInfo.bankInfo.institution}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {client.assignedAdminName && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Assigned Admin:</span>
                        <Badge variant="secondary">{client.assignedAdminName}</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card className="transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="h-5 w-5 text-primary" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="text-xl font-bold">${client.totalAmount}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-semibold text-green-600">${client.paidAmount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold text-orange-500">${client.totalAmount - client.paidAmount}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={client.paymentStatus} type="payment" />
                    </div>
                  </div>
                  {hasPermission(PERMISSIONS.ADD_EDIT_PAYMENT) && (
                    <Button className="w-full mt-4 transition-all duration-200 hover:scale-[1.02]" onClick={() => setIsAddPaymentOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Document Overview Stats */}
            <Card className="transition-all duration-300 hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Document Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <FileCheck className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{documents.filter((d) => d.status === 'complete').length}</p>
                      <p className="text-sm text-muted-foreground">Complete</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <FileQuestion className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{documents.filter((d) => d.status === 'pending').length}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <FileMinus className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold">{documents.filter((d) => d.status === 'missing').length}</p>
                      <p className="text-sm text-muted-foreground">Missing</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* T1 Questionnaire Tab - Redesigned with Inline Documents */}
          <TabsContent value="questionnaire" className="mt-6 animate-fade-in">
            {questionnaire ? (
              <div className="space-y-6">
                {/* Header with Overall Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">T1 Tax Return Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      Completed on {questionnaire.completedAt?.toLocaleDateString()} • {questionnaire.questions.length} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Quick Stats */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">{overallStats.approved}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">{overallStats.pending}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                        <FileMinus className="h-3.5 w-3.5" />
                        <span className="font-medium">{overallStats.missing}</span>
                      </div>
                      {overallStats.reuploadRequested > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600">
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="font-medium">{overallStats.reuploadRequested}</span>
                        </div>
                      )}
                    </div>
                    {hasPermission(PERMISSIONS.REQUEST_DOCUMENTS) && (
                      <Button variant="outline" onClick={() => handleRequestDocument()} className="transition-all duration-200 hover:scale-105">
                        <Send className="h-4 w-4 mr-2" />
                        Request All Missing
                      </Button>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/30 border text-xs">
                  <span className="font-medium text-muted-foreground">Status Legend:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-600">✅</span>
                    <span>Approved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-600">🟡</span>
                    <span>Pending Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-destructive">🔴</span>
                    <span>Missing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-600">🔁</span>
                    <span>Re-upload Requested</span>
                  </div>
                </div>

                {/* Section Cards - All Expanded by Default */}
                <div className="space-y-4">
                  {Object.entries(questionsByCategory).map(([category, questions]) => (
                    <T1SectionCard
                      key={category}
                      category={category}
                      questions={questions}
                      documents={documents}
                      onApproveDoc={handleApproveDocument}
                      onRequestReupload={handleRequestReupload}
                      onRequestMissing={handleRequestDocument}
                      onViewDoc={handleViewDocument}
                      onBulkRequestMissing={handleBulkRequestMissing}
                      canEdit={hasPermission(PERMISSIONS.REQUEST_DOCUMENTS)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No Questionnaire Found</p>
                  <p className="text-sm text-muted-foreground mt-1">The client has not completed the T1 questionnaire yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-6 animate-fade-in">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                {hasPermission(PERMISSIONS.ADD_EDIT_PAYMENT) && (
                  <Button size="sm" onClick={() => setIsAddPaymentOpen(true)} className="transition-all duration-200 hover:scale-105">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                    <p>No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment, index) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card transition-all duration-200 hover:shadow-sm"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">${payment.amount}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.method} • {payment.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{payment.createdBy}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Notes & Communication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] transition-all duration-200 focus:scale-[1.01]"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isClientFacing}
                        onChange={(e) => setIsClientFacing(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span>Visible to client</span>
                    </label>
                    <Button onClick={handleAddNote} disabled={isLoading} className="transition-all duration-200 hover:scale-105">
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Add Note
                    </Button>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                      <p>No notes yet.</p>
                    </div>
                  ) : (
                    notes.map((note, index) => (
                      <div
                        key={note.id}
                        className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                          note.isClientFacing ? 'bg-primary/5 border-primary/20' : 'bg-card'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{note.authorName}</span>
                              <span>•</span>
                              <span>{note.createdAt.toLocaleString()}</span>
                              {note.isClientFacing && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">Client Visible</Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditClient} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>Record a new payment for this client</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={isDeleteDocOpen} onOpenChange={setIsDeleteDocOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDoc?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedDoc}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedDoc(null);
        }}
      />
    </DashboardLayout>
  );
}
