import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Hash,
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CreditCard,
  Briefcase,
  Heart,
  Home,
  TrendingUp,
  Plane,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { Client, Document as DocType } from '@/types';

// T1 Section Configuration
const T1_SECTIONS = {
  EMPLOYMENT: {
    icon: Briefcase,
    title: 'Employment Income',
    color: 'bg-blue-100 text-blue-700',
    questions: ['Q001_T4_EMPLOYMENT'],
    requiredDocs: ['T4'],
  },
  INVESTMENT: {
    icon: TrendingUp,
    title: 'Investment Income',
    color: 'bg-green-100 text-green-700',
    questions: ['Q002_T5_INVESTMENT'],
    requiredDocs: ['T5'],
  },
  SELF_EMPLOYMENT: {
    icon: Building2,
    title: 'Self-Employment',
    color: 'bg-purple-100 text-purple-700',
    questions: ['Q003_SELF_EMPLOYMENT', 'SELF_EMPLOYED'],
    requiredDocs: ['T2125', 'business_expenses'],
  },
  MOVING: {
    icon: Home,
    title: 'Moving Expenses',
    color: 'bg-orange-100 text-orange-700',
    questions: ['Q004_MOVING_EXPENSES'],
    requiredDocs: ['moving_receipts', 'employment_letter'],
  },
  MEDICAL: {
    icon: Heart,
    title: 'Medical Expenses',
    color: 'bg-red-100 text-red-700',
    questions: ['Q005_MEDICAL_EXPENSES'],
    requiredDocs: ['medical_receipts'],
  },
  FOREIGN: {
    icon: Plane,
    title: 'Foreign Income & Property',
    color: 'bg-indigo-100 text-indigo-700',
    questions: [],
    requiredDocs: ['T1135', 'foreign_property'],
  },
  DONATIONS: {
    icon: DollarSign,
    title: 'Donations & Credits',
    color: 'bg-pink-100 text-pink-700',
    questions: [],
    requiredDocs: ['donation_receipts'],
  },
};

interface T1Question {
  id: string;
  code: string;
  question_text: string;
  answer_type: string;
}

interface T1Answer {
  id: string;
  form_id: string;
  question_code: string;
  value: any;
}

export default function ClientDetailEnhanced() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { formatAmount } = useCurrency();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [questions, setQuestions] = useState<T1Question[]>([]);
  const [answers, setAnswers] = useState<T1Answer[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAllData();
    }
  }, [id]);

  const loadAllData = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const [clientData, docsData, paymentsData] = await Promise.all([
        apiService.getClient(id),
        apiService.getDocuments({ client_id: id }),
        apiService.getPayments({ client_id: id }),
      ]);

      // Transform client data
      const transformedClient: Client = {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone || '',
        filingYear: clientData.filingYear,
        status: clientData.status as any,
        paymentStatus: clientData.paymentStatus,
        assignedAdminId: clientData.assignedAdminId,
        assignedAdminName: clientData.assignedAdminName,
        totalAmount: clientData.totalAmount || 0,
        paidAmount: clientData.paidAmount || 0,
        createdAt: new Date(clientData.createdAt),
        updatedAt: new Date(clientData.updatedAt),
      };
      setClient(transformedClient);
      setDocuments(docsData || []);
      setPayments(paymentsData || []);

      // Mock T1 questions and answers - replace with actual API calls
      // TODO: Implement actual API endpoints for questions and answers
      setQuestions([
        {
          id: '1',
          code: 'Q001_T4_EMPLOYMENT',
          question_text: 'Do you have T4 employment income?',
          answer_type: 'yes_no',
        },
        {
          id: '2',
          code: 'Q002_T5_INVESTMENT',
          question_text: 'Do you have T5 investment income?',
          answer_type: 'yes_no',
        },
        {
          id: '3',
          code: 'Q003_SELF_EMPLOYMENT',
          question_text: 'Do you have self-employment income?',
          answer_type: 'yes_no',
        },
        {
          id: '4',
          code: 'Q004_MOVING_EXPENSES',
          question_text: 'Did you have moving expenses for work or school?',
          answer_type: 'yes_no',
        },
        {
          id: '5',
          code: 'Q005_MEDICAL_EXPENSES',
          question_text: 'Do you have medical expenses to claim?',
          answer_type: 'yes_no',
        },
      ]);

      setAnswers([
        { id: '1', form_id: id, question_code: 'Q001_T4_EMPLOYMENT', value: true },
        { id: '2', form_id: id, question_code: 'Q002_T5_INVESTMENT', value: true },
        { id: '3', form_id: id, question_code: 'Q004_MOVING_EXPENSES', value: false },
      ]);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAnswerForQuestion = (questionCode: string): any => {
    const answer = answers.find((a) => a.question_code === questionCode);
    return answer?.value;
  };

  const getDocumentsForSection = (sectionKey: string): DocType[] => {
    const section = T1_SECTIONS[sectionKey as keyof typeof T1_SECTIONS];
    if (!section) return [];

    return documents.filter((doc) =>
      section.requiredDocs.some((reqDoc) =>
        doc.type.toLowerCase().includes(reqDoc.toLowerCase().replace('_', ' '))
      )
    );
  };

  const getSectionStatus = (sectionKey: string): {
    status: 'complete' | 'partial' | 'missing' | 'not_applicable';
    label: string;
    color: string;
  } => {
    const section = T1_SECTIONS[sectionKey as keyof typeof T1_SECTIONS];
    const hasAnsweredYes = section.questions.some((q) => getAnswerForQuestion(q) === true);

    if (!hasAnsweredYes) {
      return { status: 'not_applicable', label: 'N/A', color: 'bg-gray-100 text-gray-600' };
    }

    const sectionDocs = getDocumentsForSection(sectionKey);
    const completeDocs = sectionDocs.filter((d) => d.status === 'complete');
    const pendingDocs = sectionDocs.filter((d) => d.status === 'pending');
    const missingDocs = sectionDocs.filter((d) => d.status === 'missing');

    if (sectionDocs.length === 0) {
      return { status: 'missing', label: 'Missing Docs', color: 'bg-red-100 text-red-700' };
    }
    if (pendingDocs.length > 0) {
      return { status: 'partial', label: 'In Review', color: 'bg-yellow-100 text-yellow-700' };
    }
    if (completeDocs.length === sectionDocs.length) {
      return { status: 'complete', label: 'Complete', color: 'bg-green-100 text-green-700' };
    }
    if (missingDocs.length > 0) {
      return { status: 'missing', label: 'Incomplete', color: 'bg-orange-100 text-orange-700' };
    }

    return { status: 'partial', label: 'Incomplete', color: 'bg-orange-100 text-orange-700' };
  };

  if (isLoading || !client) {
    return (
      <DashboardLayout
        title="Client Details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title=""
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clients', href: '/clients' },
        { label: client.name },
      ]}
    >
      <div className="space-y-6">
        {/* Header with Client Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <p className="text-muted-foreground">Filing Year: {client.filingYear}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={client.status} type="client" />
            <StatusBadge status={client.paymentStatus} type="payment" />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="t1form">T1 Form</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-base">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="text-base">{client.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                        <p className="text-base">March 15, 1985</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">SIN</p>
                        <p className="text-base">***-***-123</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p className="text-base">123 Maple Street, Toronto, ON M5V 2T6</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                        <p className="text-base">Married</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Document Overview</CardTitle>
                <CardDescription>Quick summary of all uploaded documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-green-700">
                            {documents.filter((d) => d.status === 'complete').length}
                          </p>
                          <p className="text-sm text-green-600">Complete</p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-yellow-700">
                            {documents.filter((d) => d.status === 'pending').length}
                          </p>
                          <p className="text-sm text-yellow-600">Pending Review</p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-red-700">
                            {documents.filter((d) => d.status === 'missing').length}
                          </p>
                          <p className="text-sm text-red-600">Missing</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* T1 FORM TAB */}
          <TabsContent value="t1form" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>T1 Tax Return - 2024</CardTitle>
                <CardDescription>
                  Review questionnaire responses and corresponding documents organized by section
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <p className="font-medium text-blue-900">Status Legend</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700">Complete</Badge>
                      <span className="text-muted-foreground">All docs approved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-700">In Review</Badge>
                      <span className="text-muted-foreground">Pending documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-700">Missing Docs</Badge>
                      <span className="text-muted-foreground">No documents uploaded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-600">N/A</Badge>
                      <span className="text-muted-foreground">Not applicable</span>
                    </div>
                  </div>
                </div>

                <Accordion type="single" collapsible className="space-y-2">
                  {Object.entries(T1_SECTIONS).map(([key, section]) => {
                    const Icon = section.icon;
                    const sectionStatus = getSectionStatus(key);
                    const sectionDocs = getDocumentsForSection(key);
                    const hasAnsweredYes = section.questions.some(
                      (q) => getAnswerForQuestion(q) === true
                    );

                    return (
                      <AccordionItem
                        key={key}
                        value={key}
                        className="border rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${section.color}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-base">{section.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sectionDocs.length} document{sectionDocs.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <Badge className={sectionStatus.color}>{sectionStatus.label}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 py-4 bg-gray-50">
                          {/* Questions */}
                          <div className="space-y-4 mb-6">
                            <h4 className="font-medium flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Questionnaire Responses
                            </h4>
                            {section.questions.map((questionCode) => {
                              const question = questions.find((q) => q.code === questionCode);
                              const answer = getAnswerForQuestion(questionCode);

                              if (!question) return null;

                              return (
                                <div
                                  key={questionCode}
                                  className="flex items-start justify-between p-4 bg-white border rounded-lg"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{question.question_text}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Code: {question.code}
                                    </p>
                                  </div>
                                  <div className="ml-4">
                                    {answer === true && (
                                      <Badge className="bg-green-100 text-green-700">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Yes
                                      </Badge>
                                    )}
                                    {answer === false && (
                                      <Badge className="bg-gray-100 text-gray-600">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        No
                                      </Badge>
                                    )}
                                    {answer === undefined && (
                                      <Badge variant="outline">Not answered</Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <Separator className="my-4" />

                          {/* Documents */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Required Documents
                              </h4>
                              {hasAnsweredYes && sectionDocs.length === 0 && (
                                <Button size="sm" variant="outline">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Request Documents
                                </Button>
                              )}
                            </div>

                            {!hasAnsweredYes && (
                              <div className="p-4 bg-white border border-dashed rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">
                                  Not applicable - Client answered "No" to related questions
                                </p>
                              </div>
                            )}

                            {hasAnsweredYes && sectionDocs.length === 0 && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                                <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-2" />
                                <p className="font-medium text-red-900">Missing Documents</p>
                                <p className="text-sm text-red-700">
                                  Client needs to upload: {section.requiredDocs.join(', ')}
                                </p>
                              </div>
                            )}

                            {sectionDocs.length > 0 && (
                              <div className="space-y-2">
                                {sectionDocs.map((doc) => (
                                  <Card key={doc.id} className="border-l-4 border-l-blue-500">
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <FileText className="h-5 w-5 text-blue-600" />
                                          <div>
                                            <p className="font-medium">{doc.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <p className="text-xs text-muted-foreground">
                                                Type: {doc.type}
                                              </p>
                                              <span className="text-xs text-muted-foreground">•</span>
                                              <p className="text-xs text-muted-foreground">
                                                Version: v{doc.version || 1}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <StatusBadge status={doc.status} type="document" />
                                          <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="sm">
                                            <Download className="h-4 w-4" />
                                          </Button>
                                          {doc.status === 'pending' && (
                                            <>
                                              <Button variant="ghost" size="sm" className="text-green-600">
                                                <ThumbsUp className="h-4 w-4" />
                                              </Button>
                                              <Button variant="ghost" size="sm" className="text-red-600">
                                                <ThumbsDown className="h-4 w-4" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-2xl font-bold">{formatAmount(client.totalAmount)}</p>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatAmount(client.paidAmount)}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Balance</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatAmount(client.totalAmount - client.paidAmount)}
                    </p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <h4 className="font-medium">Payment History</h4>
                  {payments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No payments recorded yet
                    </p>
                  )}
                  {payments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg">{formatAmount(payment.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.method} • {new Date(payment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-700">Received</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
                <CardDescription>Private notes for admin team only</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  No notes yet. Add internal notes to track client communications and important details.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
