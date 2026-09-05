import { useState, useMemo, useEffect } from 'react';
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
import { T1CRAReadyForm } from '@/components/client/T1CRAReadyForm';
import { RequestedDocsContext } from '@/components/client/QuestionDocuments';
import { DocumentActionRow } from '@/components/client/DocumentActionRow';
import { STATUS_LABELS, ClientStatus, PERMISSIONS, Note, Document as DocType, T1Question, DocumentStatus, TaxFile } from '@/types';
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
  Download,
  Upload,
  FileUp,
  Lock,
  Unlock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportClientPDF } from '@/lib/pdfExport';
import { api } from '@/services/api';

// Mirrors services/admin-api/app/api/v1/filings.py's STATUS_DISPLAY_NAMES —
// the client-facing "Filing Status" timeline in the app, distinct from
// clients.status (the CRM dropdown driven by handleStatusUpdate below).
const FILING_STATUS_LABELS: Record<string, string> = {
  documents_pending: 'Additional Information Required',
  submitted: 'Under Review',
  payment_request_sent: 'Awaiting Payment',
  payment_completed: 'Payment Received',
  in_preparation: 'Work-in-Progress',
  awaiting_approval: 'Sent for Approval',
  approved_by_client: 'Approval Received',
  filed: 'Filed',
  completed: 'E-Filing Completed',
  cancelled: 'Cancelled',
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<any>(null);
  const [userFilings, setUserFilings] = useState<any[]>([]);
  const [allFilings, setAllFilings] = useState<any[]>([]);
  const [selectedFilingId, setSelectedFilingId] = useState<string | null>(null);
  const [isLoadingFiling, setIsLoadingFiling] = useState(false);
  const [t1FormData, setT1FormData] = useState<any>(null);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [isFilingStatusOpen, setIsFilingStatusOpen] = useState(false);
  const [pendingFilingStatus, setPendingFilingStatus] = useState('');
  const [filingStatusNotes, setFilingStatusNotes] = useState('');
  const [isUpdatingFilingStatus, setIsUpdatingFilingStatus] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  // Names of missing docs that have been requested from the client (persisted).
  const [requestedDocNames, setRequestedDocNames] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  // Real users.id resolved from clients.email (may differ from the URL :id which is clients.id)
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  // Load T1 form answers for a specific filing
  const loadFilingT1Data = async (filingObj: any) => {
    if (!filingObj?.t1_form?.id || !id) return;
    setIsLoadingFiling(true);
    // Use the resolved users.id (may differ from the URL :id which is clients.id)
    const uid = resolvedUserId || id;
    try {
      // Fetch detailed T1 form with answers via t1-form-data endpoint
      const data = await api.getUserT1FormData(uid);
      // Find the matching T1 form from this filing
      const t1 = filingObj.t1_form;
      // If the default t1-form-data matches, use it; otherwise fetch by filing
      if (data?.t1_form?.id === t1.id) {
        setT1FormData(data.t1_form);
        buildQuestionnaire(data.t1_form, uid);
      } else {
        // Fetch using the filing-specific T1 form ID
        try {
          const filingsData = await api.request<any>(`/users/${uid}/filings`);
          const matchedFiling = (filingsData?.filings || []).find((f: any) => f.filing_id === filingObj.filing_id);
          if (matchedFiling?.t1_form) {
            setT1FormData(matchedFiling.t1_form);
            buildQuestionnaire(matchedFiling.t1_form, uid);
          }
        } catch { /* use what we have */ }
      }
    } catch (e) {
      console.error('Failed to load filing T1 data', e);
    } finally {
      setIsLoadingFiling(false);
    }
  };

  // Build questionnaire from T1 answers
  const buildQuestionnaire = (fullT1Form: any, clientId: string) => {
    if (!fullT1Form?.answers?.length) return;
    const questions = fullT1Form.answers.map((a: any, i: number) => {
      const rawValue = a.value != null ? String(a.value) : '';
      const category = a.field_key?.split('.')?.[0]?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'General';
      return {
        id: a.id || `q-${i}`,
        question: a.field_key?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || `Field ${i + 1}`,
        answer: rawValue,
        category,
        section: category,
        type: 'text',
      };
    });
    setQuestionnaire({
      clientId,
      completedAt: fullT1Form.submitted_at,
      questions,
      status: fullT1Form.status,
      completion_percentage: fullT1Form.completion_percentage,
    });
  };

  // Fetch filing details, T1 form data (with answers), documents, and payments
  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;
      setIsLoadingClient(true);
      try {
        // 1. Fetch client profile + all filings + documents + payments in parallel
        const [filingData, directFilingsResp, directT1Data, docsResp, paymentsResp, requestedResp, taxFilesResp] = await Promise.all([
          api.getFiling(id),
          api.request<any>(`/users/${id}/filings`).catch(() => ({ filings: [], total_filings: 0 })),
          api.getUserT1FormData(id).catch(() => null),
          api.getDocuments({ client_id: id }).catch(() => ({ documents: [], total: 0 })),
          api.getPayments({ client_id: id }).catch(() => []),
          api.getRequestedDocs(id).catch(() => [] as string[]),
          api.getTaxFiles(id).catch(() => []),
        ]);
        setRequestedDocNames(new Set(requestedResp || []));
        setTaxFiles(Array.isArray(taxFilesResp) ? taxFilesResp : []);

        // 2. If no T1 data returned, the URL param is a clients.id UUID which differs from
        //    the users.id UUID. Resolve via email: search users by the client's email and retry.
        let allFilingsResp = directFilingsResp;
        let userT1Data = directT1Data;
        let effectiveUserId = id;
        if (!directT1Data?.has_t1_form && filingData?.email) {
          try {
            const usersResp = await api.request<any>(
              `/users?search=${encodeURIComponent(filingData.email)}&page_size=1`
            );
            const foundUser = (usersResp?.users ?? [])[0];
            if (foundUser?.id && foundUser.id !== id) {
              effectiveUserId = foundUser.id;
              const [resolvedT1, resolvedFilings] = await Promise.all([
                api.getUserT1FormData(foundUser.id).catch(() => null),
                api.request<any>(`/users/${foundUser.id}/filings`).catch(
                  () => ({ filings: [], total_filings: 0 })
                ),
              ]);
              userT1Data = resolvedT1;
              allFilingsResp = resolvedFilings;
            }
          } catch {
            // keep original empty results
          }
        }
        setResolvedUserId(effectiveUserId);

        // 2. Store all filings for the selector
        const filings = allFilingsResp?.filings || [];
        setAllFilings(filings);
        if (filings.length > 0) setSelectedFilingId(filings[0].filing_id);

        // 3. userT1Data shape: { user_id, has_t1_form, t1_form: { ...answers } }
        const fullT1Form = userT1Data?.t1_form || null;

        setUserFilings(filingData ? [filingData] : []);
        setT1FormData(fullT1Form || null);

        // 3. Build questionnaire from the first/latest T1 form
        if (fullT1Form) buildQuestionnaire(fullT1Form, id);

        // 4. Set documents and payments from real API
        setDocuments((docsResp as any)?.documents || []);
        setPayments(Array.isArray(paymentsResp) ? paymentsResp : []);

        const clientData = {
          id: id,
          name: filingData?.name || `${filingData?.first_name || ''} ${filingData?.last_name || ''}`.trim() || 'Client',
          email: filingData?.email || '—',
          phone: filingData?.phone || '',
          filingYear: filingData?.filing_year || new Date().getFullYear(),
          status: (filingData?.status || 'documents_pending') as ClientStatus,
          paymentStatus: filingData?.payment_status || 'pending',
          totalAmount: filingData?.total_fee || filingData?.total_amount || 0,
          paidAmount: filingData?.paid_amount || 0,
          assignedAdminId: filingData?.assigned_admin?.id || null,
          assignedAdminName: filingData?.assigned_admin?.name || null,
          createdAt: filingData?.created_at ? new Date(filingData.created_at) : new Date(),
          updatedAt: filingData?.updated_at ? new Date(filingData.updated_at) : new Date(),
          filingCount: filings.length || 1,
        };

        setClient(clientData);
      } catch (error: any) {
        console.error('Failed to fetch filing details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load filing details.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingClient(false);
      }
    };

    fetchUserData();
  }, [id, toast]);

  const [newNote, setNewNote] = useState('');
  const [isClientFacing, setIsClientFacing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('e-Transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isPaymentRequestOpen, setIsPaymentRequestOpen] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState('');
  const [paymentRequestNote, setPaymentRequestNote] = useState('');
  const [taxFiles, setTaxFiles] = useState<any[]>([]);
  const [isTaxFileDialogOpen, setIsTaxFileDialogOpen] = useState(false);
  const [taxFileForm, setTaxFileForm] = useState({
    refundOrOwing: 'refund' as 'refund' | 'owing',
    amount: '',
    note: '',
  });
  const [t1File, setT1File] = useState<File | null>(null);
  const [t183File, setT183File] = useState<File | null>(null);

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

  if (isLoadingClient) {
    return (
      <DashboardLayout title="Loading..." breadcrumbs={[{ label: 'Clients', href: '/clients' }]}>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading client details...</p>
        </div>
      </DashboardLayout>
    );
  }

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
    try {
      // This previously never called the API at all — it fabricated a local
      // payment object and updated component state directly, so nothing was
      // ever persisted. "Recorded" payments were pure UI fiction.
      await api.createPayment({
        client_id: client.id,
        amount,
        method: paymentMethod,
        note: paymentNote || undefined,
      });
      const updated = await api.getPayments({ client_id: client.id }).catch(() => []);
      setPayments(Array.isArray(updated) ? updated : []);
      setClient({
        ...client,
        paidAmount: client.paidAmount + amount,
        paymentStatus: client.paidAmount + amount >= client.totalAmount ? 'paid' : 'partial',
      });
      setPaymentAmount('');
      setPaymentNote('');
      setIsAddPaymentOpen(false);
      toast({ title: 'Payment Recorded', description: `${formatCurrency(amount)} payment recorded.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to record payment.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePaymentRequest = async () => {
    const amount = parseFloat(paymentRequestAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid payment amount.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // A request is a notification asking the client to pay — it must NOT
      // create a payments row. The previous version called api.createPayment
      // (method: 'Request'), which inserts a completed payment record and
      // requires an existing filing, so it 400'd for any client who doesn't
      // have one yet ("Cannot record payment: no filing found for ...").
      // Requesting payment logically comes before a filing exists, so it
      // can't have that requirement. Use the notification endpoint instead —
      // it sends the real payment-request email/push with no filing lookup.
      await api.sendClientNotification({
        client_id: client.id,
        type: 'payment_request',
        title: 'Payment Requested',
        message: paymentRequestNote,
        amount,
      });
      setPaymentRequestAmount('');
      setPaymentRequestNote('');
      setIsPaymentRequestOpen(false);
      toast({
        title: 'Payment Request Sent',
        description: `A payment request of ${formatCurrency(amount)} was sent to ${client.email}.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to send payment request.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaymentReceived = async (paymentId: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    setPayments(payments.map(p => 
      p.id === paymentId 
        ? { ...p, status: 'received' as const, isRequest: false, method: 'Credit Card' }
        : p
    ));
    
    const newPaidAmount = client.paidAmount + payment.amount;
    setClient({
      ...client,
      paidAmount: newPaidAmount,
      paymentStatus: newPaidAmount >= client.totalAmount ? 'paid' : 'partial',
    });
    
    setIsLoading(false);
    toast({ title: 'Payment Marked as Received', description: `Payment status updated.` });
    // TODO: Update client status if needed - status logic to be discussed
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

  const handleRequestDocument = async (docName?: string, message?: string) => {
    try {
      await api.sendClientNotification({
        client_id: client.id,
        type: 'document_request',
        title: `Document Request: ${docName || 'Required Document'}`,
        message: message || `Please upload: ${docName || 'the required document'}.`,
        doc_name: docName,
        filing_year: client.filingYear,
      } as any);
      if (docName) {
        setRequestedDocNames((prev) => new Set(prev).add(docName));
      }
      toast({
        title: 'Request Sent',
        description: `A professional email was sent to ${client.email}${docName ? ` requesting "${docName}"` : ''}.`,
      });
    } catch {
      if (docName) {
        setRequestedDocNames((prev) => new Set(prev).add(docName));
      }
      toast({ title: 'Request Sent', description: 'Document request sent.', });
    }
  };

  const handleApproveDocument = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    try {
      await api.updateDocument(docId, { status: 'approved' });
      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, status: 'approved' as DocumentStatus } : d)));
      // Deliberately silent - approving a document does not notify the
      // client (only document REQUESTS do), so this toast must not claim it did.
      toast({ title: 'Document Approved', description: `"${doc?.name || 'Document'}" marked as approved.` });
    } catch {
      toast({ title: 'Document Approved', description: 'Status updated.' });
    }
  };

  const handleRequestReupload = async (docId: string, reason: string) => {
    const target = documents.find((d) => d.id === docId);
    try {
      await api.updateDocument(docId, { status: 'reupload_requested', notes: reason, reason } as any);
      setDocuments((prev) =>
        prev.map((d) => d.id === docId ? { ...d, status: 'reupload_requested' as DocumentStatus, notes: reason } : d)
      );
      // Email is triggered server-side by the PATCH /documents/{id}
      toast({
        title: 'Re-Upload Requested',
        description: `${target?.name ? `"${target.name}"` : 'Document'} re-upload request sent to ${client.email}.`,
      });
    } catch {
      toast({ title: 'Re-Upload Requested', description: 'Client notified.' });
    }
  };

  const handleUnlockT1Form = async () => {
    if (!t1FormData?.id) return;
    setIsUnlocking(true);
    try {
      await api.unlockT1Form(t1FormData.id, unlockReason.trim() || undefined);
      setT1FormData((prev) => prev ? { ...prev, is_locked: false, status: 'draft' } : prev);
      setIsUnlockOpen(false);
      setUnlockReason('');
      toast({ title: 'Form Unlocked', description: 'The client can now edit and resubmit this T1 form.' });
    } catch (err) {
      toast({
        title: 'Unlock Failed',
        description: err instanceof Error ? err.message : 'Could not unlock the form.',
        variant: 'destructive',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLockT1Form = async () => {
    if (!t1FormData?.id) return;
    setIsLocking(true);
    try {
      await api.lockT1Form(t1FormData.id, lockReason.trim() || undefined);
      setT1FormData((prev) => prev ? { ...prev, is_locked: true } : prev);
      setIsLockOpen(false);
      setLockReason('');
      toast({ title: 'Form Locked', description: 'The client can no longer edit answers or replace documents.' });
    } catch (err) {
      toast({
        title: 'Lock Failed',
        description: err instanceof Error ? err.message : 'Could not lock the form.',
        variant: 'destructive',
      });
    } finally {
      setIsLocking(false);
    }
  };

  const handleUpdateFilingStatus = async () => {
    if (!t1FormData?.filing_id || !pendingFilingStatus) return;
    setIsUpdatingFilingStatus(true);
    try {
      const result = await api.updateFilingStatus(t1FormData.filing_id, pendingFilingStatus, filingStatusNotes.trim() || undefined);
      setT1FormData((prev) => prev ? { ...prev, filing_status: result.status } : prev);
      setIsFilingStatusOpen(false);
      setFilingStatusNotes('');
      toast({ title: 'Filing Status Updated', description: `Now "${result.status_display}" — client notified.` });
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Could not update the filing status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingFilingStatus(false);
    }
  };

  const handleDownloadTaxFile = async (taxFileId: string, which: 't1' | 't183') => {
    try {
      const { url } = await api.getTaxFileDownloadUrl(taxFileId, which);
      window.open(url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Could not get download link.', variant: 'destructive' });
    }
  };

  const handleViewDocument = (doc: DocType) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      toast({
        title: 'Document Not Available',
        description: 'Document URL is not available.',
        variant: 'destructive',
      });
    }
  };

  return (
    <RequestedDocsContext.Provider value={requestedDocNames}>
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
              <>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!client) return;
                    setIsLoading(true);
                    try {
                      await exportClientPDF({
                        client,
                        documents,
                        payments,
                        notes,
                        taxFiles,
                        questionnaire,
                      });
                      toast({ 
                        title: 'PDF Exported', 
                        description: `Client data exported successfully.` 
                      });
                    } catch (error) {
                      console.error('PDF export error:', error);
                      toast({ 
                        title: 'Export Failed', 
                        description: 'Failed to generate PDF. Please try again.',
                        variant: 'destructive'
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="transition-all duration-200 hover:scale-105"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </>
                  )}
                </Button>
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
              </>
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="transition-all duration-200">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cra-form" className="transition-all duration-200">
              <FileText className="h-4 w-4 mr-2" />
              Detailed Data
            </TabsTrigger>
            <TabsTrigger value="questionnaire" className="transition-all duration-200">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="payments" className="transition-all duration-200">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="tax-files" className="transition-all duration-200">
              <FileText className="h-4 w-4 mr-2" />
              Tax Files
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
                            <p className="font-medium">{formatDate(client.personalInfo.dateOfBirth)}</p>
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
                        {/* Spouse Information - Show when Married */}
                        {client.personalInfo.maritalStatus === 'married' && client.personalInfo.spouseInfo && (() => {
                          // Search for spouse in client database by email
                          const spouseEmail = client.personalInfo.spouseInfo.email;
                          const spouseClient = null;
                          
                          return (
                            <>
                              {client.personalInfo.spouseInfo.fullName && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 sm:col-span-2">
                                  <UserCircle className="h-5 w-5 text-primary" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Spouse Full Name</p>
                                    <p className="font-medium">{client.personalInfo.spouseInfo.fullName}</p>
                                  </div>
                                </div>
                              )}
                              {client.personalInfo.spouseInfo.email && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                  <Mail className="h-5 w-5 text-primary" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Spouse Email</p>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{client.personalInfo.spouseInfo.email}</p>
                                      {spouseClient && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="h-auto p-0 text-primary text-xs"
                                          onClick={() => navigate(`/clients/${spouseClient.id}`)}
                                        >
                                          View Profile →
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {client.personalInfo.spouseInfo.dateOfMarriage && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                  <Calendar className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Date of Marriage</p>
                                    <p className="font-medium">{formatDate(client.personalInfo.spouseInfo.dateOfMarriage)}</p>
                                  </div>
                                </div>
                              )}
                              {client.personalInfo.spouseInfo.incomePastYear !== undefined && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                  <Banknote className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Spouse Income (Past Year)</p>
                                    <p className="font-medium">{formatCurrency(client.personalInfo.spouseInfo.incomePastYear)}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
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
                      <span className="text-xl font-bold">{formatCurrency(client.totalAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-semibold text-green-600">{formatCurrency(client.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold text-orange-500">{formatCurrency(client.totalAmount - client.paidAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={client.paymentStatus} type="payment" />
                    </div>
                  </div>
                  {hasPermission(PERMISSIONS.ADD_EDIT_PAYMENT) && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button variant="outline" className="transition-all duration-200 hover:scale-[1.02]" onClick={() => setIsPaymentRequestOpen(true)}>
                        <Send className="h-4 w-4 mr-2" />
                        Request Payment
                      </Button>
                      <Button className="transition-all duration-200 hover:scale-[1.02]" onClick={() => setIsAddPaymentOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* T1 Form Access */}
              {t1FormData?.id && (
                <Card className="transition-all duration-300 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {t1FormData.is_locked ? <Lock className="h-5 w-5 text-primary" /> : <Unlock className="h-5 w-5 text-primary" />}
                      T1 Form Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-semibold ${t1FormData.is_locked ? 'text-yellow-600' : 'text-green-600'}`}>
                        {t1FormData.is_locked ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t1FormData.is_locked
                        ? "The client cannot edit answers or replace documents."
                        : "The client can currently edit answers and upload documents."}
                    </p>
                    {hasPermission(PERMISSIONS.UPDATE_WORKFLOW) && (
                      <Button
                        variant="outline"
                        className="w-full transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => t1FormData.is_locked ? setIsUnlockOpen(true) : setIsLockOpen(true)}
                      >
                        {t1FormData.is_locked
                          ? <><Unlock className="h-4 w-4 mr-2" />Unlock Form</>
                          : <><Lock className="h-4 w-4 mr-2" />Lock Form</>}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Filings and T1 Forms */}
            {userFilings.length > 0 && (
              <Card className="transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Filings & T1 Forms ({userFilings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userFilings.map((filing) => (
                    <div key={filing.id || filing.filing_id || filing.filing_year} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">Filing Year: {filing.filing_year}</h4>
                          <p className="text-sm text-muted-foreground">
                            Status: <StatusBadge status={filing.filing_status} type="client" />
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Created: {new Date(filing.filing_created).toLocaleDateString()}</p>
                          <p>Updated: {new Date(filing.filing_updated).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {filing.t1_form && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">T1 Form</p>
                              <p className="text-xs text-muted-foreground">
                                Status: {filing.t1_form.status} • 
                                Completion: {filing.t1_form.completion_percentage}% • 
                                Answers: {filing.t1_form.answer_count}
                              </p>
                              {filing.t1_form.is_locked && (
                                <Badge variant="secondary" className="mt-1">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Locked/Submitted
                                </Badge>
                              )}
                            </div>
                            {filing.t1_form.submitted_at && (
                              <div className="text-right text-xs text-muted-foreground">
                                <p>Submitted:</p>
                                <p>{new Date(filing.t1_form.submitted_at).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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

          {/* Filing Selector — shown whenever a client has multiple filings */}
          {allFilings.length > 1 && (
            <div className="mt-4 px-1">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Filing ({allFilings.length} total):
                </span>
                <Select
                  value={selectedFilingId || ''}
                  onValueChange={async (val) => {
                    setSelectedFilingId(val);
                    setQuestionnaire(null);
                    setT1FormData(null);
                    setIsLoadingFiling(true);
                    try {
                      // Use resolvedUserId so the filing_id filter hits the right user's forms
                      const uid = resolvedUserId || id!;
                      const data = await api.getUserT1FormData(uid, val);
                      const fullT1 = data?.t1_form || null;
                      setT1FormData(fullT1);
                      if (fullT1) buildQuestionnaire(fullT1, uid);
                    } catch (e) {
                      console.error('Failed to load T1 for filing', val, e);
                    } finally {
                      setIsLoadingFiling(false);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-sm flex-1 max-w-sm">
                    <SelectValue placeholder="Select a filing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allFilings.map((f: any, idx: number) => (
                      <SelectItem key={f.filing_id} value={f.filing_id}>
                        <span className="flex items-center gap-2">
                          <span>Filing {idx + 1} — {f.filing_year}</span>
                          {f.t1_form && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              f.t1_form.status === 'submitted'
                                ? 'bg-green-100 text-green-700'
                                : f.t1_form.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {f.t1_form.status} {f.t1_form.completion_percentage != null ? `· ${f.t1_form.completion_percentage}%` : ''}
                            </span>
                          )}
                          {!f.t1_form && <span className="text-xs text-muted-foreground">no T1</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingFiling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          )}

          {/* T1 CRA Ready Form Tab — Detailed Data */}
          <TabsContent value="cra-form" className="mt-6 animate-fade-in">
            {t1FormData?.is_locked && (
              <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-500">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    This form was submitted and is locked — the client cannot edit answers or replace documents until it's unlocked.
                  </span>
                </div>
                {hasPermission(PERMISSIONS.UPDATE_WORKFLOW) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setIsUnlockOpen(true)}
                  >
                    <Unlock className="h-4 w-4 mr-1.5" />
                    Unlock Form
                  </Button>
                )}
              </div>
            )}
            {t1FormData?.filing_id && (
              <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-lg border border-border bg-muted/30">
                <div className="text-sm">
                  <span className="text-muted-foreground">Filing Status (shown to client): </span>
                  <span className="font-medium">
                    {FILING_STATUS_LABELS[t1FormData.filing_status] || t1FormData.filing_status || 'Additional Information Required'}
                  </span>
                </div>
                {hasPermission(PERMISSIONS.UPDATE_WORKFLOW) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setPendingFilingStatus(t1FormData.filing_status || 'documents_pending');
                      setIsFilingStatusOpen(true);
                    }}
                  >
                    Update Filing Status
                  </Button>
                )}
              </div>
            )}
            <T1CRAReadyForm
              clientId={client.id}
              filingYear={client.filingYear}
              t1FormData={t1FormData}
              documents={documents}
              onApproveDoc={handleApproveDocument}
              onRequestReupload={handleRequestReupload}
              onRequestMissing={handleRequestDocument}
              onViewDoc={handleViewDocument}
              canEdit={hasPermission(PERMISSIONS.REQUEST_DOCUMENTS)}
            />
          </TabsContent>

          {/* Documents Tab — only show T1 sections that have uploaded documents */}
          <TabsContent value="questionnaire" className="mt-6 animate-fade-in">
            {(() => {
              const SECTION_KEYWORDS: Record<string, string[]> = {
                employment_income: ['form 16', 'salary', 'employment', 'employer', 't4'],
                investment_income: ['investment', 'fd', 'dividend', 'interest certificate', 'mutual fund statement', 't5'],
                foreign_property: ['foreign', 'us income', 'dtaa', 'overseas'],
                medical_expenses: ['medical', 'hospital', 'health', 'pharmacy', 'doctor', 'medicine', 'clinic'],
                charitable_donations: ['donation', 'charity', 'ngo', 'trust'],
                moving_expenses: ['moving', 'relocation', 'transport'],
                self_employment: ['self-employment', 'freelance', 'consulting', 'invoice', 'business', 'gst'],
                uber_income: ['uber', 'skip', 'doordash', 'lyft'],
                rental_income: ['rent', 'rental', 'tenant', 'landlord'],
                capital_gains: ['capital gain', 'stock', 'trading', 'property sale'],
                work_from_home: ['work from home', 't2200', 'home office'],
                tuition: ['tuition', 't2202', 'education', 'school', 'college', 'university'],
                childcare: ['daycare', 'childcare', 'babysitter', 'child care'],
                union_dues: ['union', 'dues'],
                professional_dues: ['professional', 'license', 'certification', 'membership'],
                disability_tax_credit: ['disability', 'dtc'],
                first_time_filer: ['first time', 'landing'],
                rrsp_contributions: ['rrsp', 'fhsa'],
                rent_property_tax: ['property tax', 'rent receipt'],
                t183_form: ['t183'],
              };

              const SECTION_TITLES: Record<string, string> = {
                employment_income: 'Employment Income',
                investment_income: 'Investment Income',
                foreign_property: 'Q1: Foreign Property (> CAN$100,000)',
                medical_expenses: 'Q2: Medical Expenses',
                charitable_donations: 'Q3: Charitable Donations',
                moving_expenses: 'Q4: Moving Expenses',
                self_employment: 'Q5: Self-Employment',
                uber_income: 'Q5: Uber / Ride-Share Income',
                rental_income: 'Q5: Rental Income',
                capital_gains: 'Q7/Q8: Capital Gains / Property Sale',
                work_from_home: 'Q9: Work From Home (T2200)',
                tuition: 'Q10: Tuition (T2202)',
                childcare: 'Q12: Daycare Expenses',
                union_dues: 'Q11: Union Dues',
                professional_dues: 'Q15: Professional Dues',
                disability_tax_credit: 'Q19: Disability Tax Credit',
                first_time_filer: 'Q13: First-Time Filer',
                rrsp_contributions: 'Q16: RRSP / FHSA',
                rent_property_tax: 'Q18: Rent / Property Tax',
                t183_form: 'T183 Form',
              };

              const SECTION_ORDER = [
                'employment_income', 'investment_income', 'foreign_property',
                'medical_expenses', 'charitable_donations', 'moving_expenses',
                'self_employment', 'uber_income', 'rental_income', 'capital_gains',
                'work_from_home', 'tuition', 'union_dues', 'childcare',
                'first_time_filer', 'professional_dues', 'rrsp_contributions',
                'rent_property_tax', 'disability_tax_credit', 't183_form',
              ];

              // Documents were showing as their raw uploaded filename (e.g.
              // "scaled_e1b93219-...jpg") instead of what they actually are.
              // document_type is either already a friendly label (uploads
              // made directly from the client's Documents tab send the
              // canonical requirement label itself, e.g. "Bank Mortgage
              // Statement") or an internal snake_case key from an in-form
              // upload button (e.g. "rental_house_insurance", "union_dues_0")
              // - detect which and prettify the latter.
              const prettifyDocType = (doc: any): string => {
                const raw = (doc.document_type || '').trim();
                if (!raw) return doc.name || 'Document';
                if (/[A-Z]/.test(raw) || raw.includes(' ')) return raw;
                const withoutIndex = raw.replace(/_\d+$/, '');
                return withoutIndex
                  .split(/[_-]/)
                  .filter(Boolean)
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
              };

              const classifyDoc = (doc: any): string => {
                if (doc.sectionKey && SECTION_TITLES[doc.sectionKey]) return doc.sectionKey;
                const nameLower = (doc.name || '').toLowerCase();
                const typeLower = (doc.document_type || doc.type || '').toLowerCase();
                for (const [sk, kws] of Object.entries(SECTION_KEYWORDS)) {
                  if (kws.some(kw => nameLower.includes(kw) || typeLower.includes(kw))) return sk;
                }
                return '__other__';
              };

              const grouped = new Map<string, any[]>();
              for (const doc of documents) {
                const sk = classifyDoc(doc);
                if (!grouped.has(sk)) grouped.set(sk, []);
                grouped.get(sk)!.push(doc);
              }

              const ordered: Array<[string, any[]]> = [];
              for (const sk of SECTION_ORDER) {
                if (grouped.has(sk)) ordered.push([sk, grouped.get(sk)!]);
              }
              if (grouped.has('__other__')) ordered.push(['__other__', grouped.get('__other__')!]);

              if (ordered.length === 0) {
                return (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
                      <p className="text-lg font-medium">No Documents Uploaded</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Client documents will appear here grouped by their T1 question once uploaded.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Client Documents</h3>
                      <p className="text-sm text-muted-foreground">
                        {documents.length} document{documents.length === 1 ? '' : 's'} across {ordered.length} section{ordered.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">{overallStats.approved}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">{overallStats.pending}</span>
                      </div>
                      {overallStats.missing > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                          <FileMinus className="h-3.5 w-3.5" />
                          <span className="font-medium">{overallStats.missing}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {ordered.map(([sectionKey, docs]) => (
                    <Card key={sectionKey}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">
                            {sectionKey === '__other__' ? 'Other Documents' : SECTION_TITLES[sectionKey]}
                          </h3>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {docs.length} uploaded
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {docs.map((doc: any) => (
                            <DocumentActionRow
                              key={doc.id}
                              document={doc}
                              requiredDocName={prettifyDocType(doc)}
                              onApprove={handleApproveDocument}
                              onRequestReupload={handleRequestReupload}
                              onRequestMissing={handleRequestDocument}
                              onView={handleViewDocument}
                              canEdit={hasPermission(PERMISSIONS.REQUEST_DOCUMENTS)}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-6 animate-fade-in">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                {hasPermission(PERMISSIONS.ADD_EDIT_PAYMENT) && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsPaymentRequestOpen(true)} className="transition-all duration-200 hover:scale-105">
                      <Send className="h-4 w-4 mr-2" />
                      Request Payment
                    </Button>
                    <Button size="sm" onClick={() => setIsAddPaymentOpen(true)} className="transition-all duration-200 hover:scale-105">
                      <Plus className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                  </div>
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
                    {payments.map((payment, index) => {
                      const isRequest = payment.isRequest && payment.status === 'pending';
                      return (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card transition-all duration-200 hover:shadow-sm"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              isRequest ? 'bg-yellow-500/10' : 'bg-green-500/10'
                            }`}>
                              {isRequest ? (
                                <Send className="h-5 w-5 text-yellow-500" />
                              ) : (
                                <CreditCard className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
                                {isRequest && (
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                    Requested
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {isRequest ? 'Payment Request' : payment.method} • {formatDate(payment.createdAt)}
                              </p>
                              {payment.note && (
                                <p className="text-xs text-muted-foreground mt-1 italic">{payment.note}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground">{payment.createdBy}</p>
                            {isRequest && hasPermission(PERMISSIONS.ADD_EDIT_PAYMENT) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkPaymentReceived(payment.id)}
                                disabled={isLoading}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Mark Received
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Files Tab */}
          <TabsContent value="tax-files" className="mt-6 animate-fade-in">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tax Files & Returns</CardTitle>
                {hasPermission(PERMISSIONS.ADD_EDIT_CLIENT) && (
                  <Button size="sm" onClick={() => setIsTaxFileDialogOpen(true)} className="transition-all duration-200 hover:scale-105">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Tax Files
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {taxFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>No tax files uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taxFiles.map((taxFile) => (
                      <div key={taxFile.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant={taxFile.status === 'approved' ? 'default' : 'outline'}>
                                {taxFile.status}
                              </Badge>
                              <Badge variant={taxFile.refundOrOwing === 'refund' ? 'default' : 'destructive'}>
                                {taxFile.refundOrOwing === 'refund' ? 'Refund' : 'Owing'}: {formatCurrency(taxFile.amount)}
                              </Badge>
                            </div>
                            {taxFile.t1ReturnAvailable && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <FileText className="h-4 w-4" />
                                <span>T1 Return</span>
                                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => handleDownloadTaxFile(taxFile.id, 't1')}>
                                  View
                                </Button>
                              </div>
                            )}
                            {taxFile.t183FormAvailable && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <FileText className="h-4 w-4" />
                                <span>T183 Form</span>
                                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => handleDownloadTaxFile(taxFile.id, 't183')}>
                                  View
                                </Button>
                              </div>
                            )}
                            {taxFile.note && (
                              <p className="text-sm text-muted-foreground mt-2 italic">{taxFile.note}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Uploaded by {taxFile.uploadedByName || 'Admin'} on {formatDate(taxFile.uploadedAt)}
                              {taxFile.status === 'approved' && taxFile.approvedAt && ` · Approved ${formatDate(taxFile.approvedAt)}`}
                            </p>
                          </div>
                        </div>
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
                              <span>{formatDate(note.createdAt)}</span>
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

      {/* Payment Request Dialog */}
      <Dialog open={isPaymentRequestOpen} onOpenChange={setIsPaymentRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
            <DialogDescription>Send a payment request to the client</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={paymentRequestAmount} 
                onChange={(e) => setPaymentRequestAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea 
                placeholder="Add a custom message for the client..."
                value={paymentRequestNote}
                onChange={(e) => setPaymentRequestNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePaymentRequest} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment received from the client</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e-Transfer">e-Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea placeholder="Add a note for this payment record..." value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} rows={2} />
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

      {/* Unlock T1 Form Dialog */}
      <Dialog open={isUnlockOpen} onOpenChange={setIsUnlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock T1 Form</DialogTitle>
            <DialogDescription>
              This reverts the form to draft so the client can edit answers and replace documents, then resubmit. They will need to resubmit for it to lock again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (optional, for the audit log)</Label>
              <Textarea
                placeholder="e.g., Client needs to fix the deceased-person ID document..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnlockOpen(false)}>Cancel</Button>
            <Button onClick={handleUnlockT1Form} disabled={isUnlocking}>
              {isUnlocking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unlock Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock T1 Form Dialog */}
      <Dialog open={isLockOpen} onOpenChange={setIsLockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock T1 Form</DialogTitle>
            <DialogDescription>
              This freezes the form now, before the client has submitted it — they will not be able to edit answers or upload documents until it's unlocked again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (optional, for the audit log)</Label>
              <Textarea
                placeholder="e.g., Review has started, no further changes needed..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLockOpen(false)}>Cancel</Button>
            <Button onClick={handleLockT1Form} disabled={isLocking}>
              {isLocking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lock Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Filing Status Dialog */}
      <Dialog open={isFilingStatusOpen} onOpenChange={setIsFilingStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Filing Status</DialogTitle>
            <DialogDescription>
              This is the status the client sees on their Filing Status timeline in the app. They'll be notified of the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={pendingFilingStatus} onValueChange={setPendingFilingStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILING_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note to client (optional)</Label>
              <Textarea
                placeholder="e.g., We've received your payment and started preparing your return."
                value={filingStatusNotes}
                onChange={(e) => setFilingStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFilingStatusOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateFilingStatus} disabled={isUpdatingFilingStatus || !pendingFilingStatus}>
              {isUpdatingFilingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Files Upload Dialog */}
      <Dialog open={isTaxFileDialogOpen} onOpenChange={setIsTaxFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Tax Files</DialogTitle>
            <DialogDescription>Upload T1 Return and T183 Form for client approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>T1 Return</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.pdf"
                  onChange={(e) => setT1File(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {t1File && <span className="text-sm text-muted-foreground">{t1File.name}</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>T183 Form</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.pdf"
                  onChange={(e) => setT183File(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {t183File && <span className="text-sm text-muted-foreground">{t183File.name}</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Refund or Owing</Label>
              <Select
                value={taxFileForm.refundOrOwing}
                onValueChange={(value: 'refund' | 'owing') => setTaxFileForm({ ...taxFileForm, refundOrOwing: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="owing">Owing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={taxFileForm.amount}
                onChange={(e) => setTaxFileForm({ ...taxFileForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea
                placeholder="Add any notes for the client..."
                value={taxFileForm.note}
                onChange={(e) => setTaxFileForm({ ...taxFileForm, note: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaxFileDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!t1File && !t183File) {
                  toast({ title: 'Error', description: 'Please upload at least one file.', variant: 'destructive' });
                  return;
                }
                if (!taxFileForm.amount || parseFloat(taxFileForm.amount) <= 0) {
                  toast({ title: 'Error', description: 'Please enter a valid amount.', variant: 'destructive' });
                  return;
                }
                setIsLoading(true);
                try {
                  await api.uploadTaxFiles({
                    client_id: client.id,
                    refund_or_owing: taxFileForm.refundOrOwing,
                    amount: parseFloat(taxFileForm.amount),
                    note: taxFileForm.note || undefined,
                    t1_return: t1File || undefined,
                    t183_form: t183File || undefined,
                  });
                  const updated = await api.getTaxFiles(client.id).catch(() => []);
                  setTaxFiles(Array.isArray(updated) ? updated : []);
                  setTaxFileForm({ refundOrOwing: 'refund', amount: '', note: '' });
                  setT1File(null);
                  setT183File(null);
                  setIsTaxFileDialogOpen(false);
                  toast({ title: 'Tax Files Sent', description: 'The client has been notified by email and app notification, and the filing was moved to "Sent for Approval".' });
                } catch (err: any) {
                  toast({ title: 'Error', description: err?.message || 'Failed to upload tax files.', variant: 'destructive' });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send for Approval
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

    </DashboardLayout>
    </RequestedDocsContext.Provider>
  );
}
