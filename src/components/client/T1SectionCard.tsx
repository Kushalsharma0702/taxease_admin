import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentActionRow } from './DocumentActionRow';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { T1Question, Document as DocType } from '@/types';
import { useState } from 'react';
import { CATEGORY_TO_SECTION_KEY, DOCUMENT_SECTION_KEYS } from '@/lib/api/config';

interface T1SectionCardProps {
  category: string;
  questions: T1Question[];
  documents: DocType[];
  onApproveDoc: (docId: string) => void;
  onRequestReupload: (docId: string, reason: string) => void;
  onRequestMissing: (docName: string, reason: string) => void;
  onViewDoc: (doc: DocType) => void;
  canEdit?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Employment Income': '💼',
  'Investment Income': '📈',
  'RRSP Contributions': '🏦',
  'Medical Expenses': '🏥',
  'Daycare Expenses': '👶',
  'Home Office': '🏠',
  'Moving Expenses': '🚚',
  'Tuition & Education': '🎓',
};

// Keywords to match documents to categories (same as QuestionDocuments for consistency)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Medical Expenses': ['medical', 'hospital', 'health', 'pharmacy', 'doctor', 'medicine', 'clinic', 'fortis', 'apollo'],
  'Charitable Donations': ['donation', 'charity', 'ngo', 'trust', 'pm cares', 'cry'],
  'Donations': ['donation', 'charity', 'ngo', 'trust', 'pm cares', 'cry'],
  'Moving Expenses': ['moving', 'relocation', 'transport'],
  'Self-Employment': ['self-employment', 'freelance', 'consulting', 'invoice', 'business', 'gst'],
  'Rental Income': ['rent', 'rental', 'tenant', 'property tax', 'landlord'],
  'Capital Gains': ['capital gain', 'stock', 'trading', 'zerodha', 'groww', 'mutual fund', 'redemption'],
  'Home Office': ['work from home', 't2200', 'home office'],
  'Work From Home': ['work from home', 't2200', 'home office'],
  'Tuition & Education': ['tuition', 't2202', 'education', 'school', 'college', 'university'],
  'Tuition': ['tuition', 't2202', 'education', 'school', 'college', 'university'],
  'Education': ['tuition', 't2202', 'education', 'school', 'college', 'university'],
  'Daycare Expenses': ['daycare', 'childcare', 'babysitter', 'child care'],
  'Union Dues': ['union', 'dues'],
  'Professional Dues': ['professional', 'license', 'certification', 'membership'],
  'Disability': ['disability', 'dtc'],
  'PPF/EPF Contributions': ['rrsp', 'fhsa', 'ppf', 'epf', 'nps', 'lic', 'insurance premium', 'home loan'],
  'RRSP Contributions': ['rrsp', 'fhsa', 'ppf', 'epf', 'nps', 'lic', 'insurance premium'],
  'Investment Income': ['investment', 'fd', 'dividend', 'interest certificate', 'mutual fund statement'],
  'Foreign Income': ['foreign', 'us income', 'dtaa', 'overseas'],
  'Foreign Property': ['foreign', 'us income', 'dtaa', 'overseas'],
  'Employment Income': ['form 16', 'salary', 'employment', 'employer'],
  'Home Loan': ['home loan', 'housing loan', 'mortgage', 'principal'],
};

export function T1SectionCard({
  category,
  questions,
  documents,
  onApproveDoc,
  onRequestReupload,
  onRequestMissing,
  onViewDoc,
  canEdit = true,
}: T1SectionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get documents for a question - match by questionId, sectionKey, or keywords
  const getDocsForQuestion = (questionId: string, questionCategory?: string) => {
    const keywords = CATEGORY_KEYWORDS[questionCategory || category] || [];
    const sectionKey = CATEGORY_TO_SECTION_KEY[questionCategory || category];
    
    return documents.filter((d) => {
      // Match by questionId
      if (d.questionId === questionId) return true;
      
      // Match by sectionKey
      if (sectionKey && d.sectionKey === sectionKey) return true;
      
      // Match by keywords in document name
      const docNameLower = d.name.toLowerCase();
      if (keywords.some(keyword => docNameLower.includes(keyword.toLowerCase()))) {
        return true;
      }
      
      return false;
    });
  };

  const stats = useMemo(() => {
    let totalRequired = 0;
    let totalUploaded = 0;
    let totalApproved = 0;
    let totalPending = 0;
    let totalMissing = 0;

    questions.forEach((q) => {
      if (q.answer === 'yes') {
        totalRequired += q.requiredDocuments.length;
        const docs = getDocsForQuestion(q.id, q.category);
        docs.forEach((d) => {
          totalUploaded++;
          if (d.status === 'approved') totalApproved++;
          else if (d.status === 'missing') totalMissing++;
          else totalPending++;
        });
        // Count truly missing (required but not uploaded)
        q.requiredDocuments.forEach((reqDoc) => {
          const hasDoc = docs.some((d) => 
            d.name.toLowerCase().includes(reqDoc.toLowerCase().split(' ')[0])
          );
          if (!hasDoc) totalMissing++;
        });
      }
    });

    return { totalRequired, totalUploaded, totalApproved, totalPending, totalMissing };
  }, [questions, documents]);

  const isComplete = stats.totalMissing === 0 && stats.totalPending === 0 && stats.totalRequired > 0;
  const hasApplicable = questions.some((q) => q.answer === 'yes');

  const AnswerBadge = ({ answer }: { answer: 'yes' | 'no' | 'na' | null }) => {
    if (answer === 'yes') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Yes
        </Badge>
      );
    }
    if (answer === 'no') {
      return (
        <Badge variant="secondary" className="text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          No
        </Badge>
      );
    }
    if (answer === 'na') {
      return (
        <Badge variant="secondary" className="text-xs">
          <MinusCircle className="h-3 w-3 mr-1" />
          N/A
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30">
        <HelpCircle className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
              {CATEGORY_ICONS[category] || '📋'}
            </div>
            <div>
              <h3 className="font-semibold text-base">{category}</h3>
              <p className="text-xs text-muted-foreground">
                {questions.filter((q) => q.answer === 'yes').length} applicable items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Section Summary Stats */}
            {hasApplicable && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {stats.totalUploaded}/{stats.totalRequired} docs
                </span>
                <Badge
                  variant="outline"
                  className={
                    isComplete
                      ? 'bg-green-500/10 text-green-600 border-green-500/30'
                      : stats.totalMissing > 0
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                  }
                >
                  {isComplete ? 'Complete' : stats.totalMissing > 0 ? 'Incomplete' : 'In Review'}
                </Badge>
              </div>
            )}

            {/* Collapse Button */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 pt-0">
          {questions.map((question, qIndex) => {
            const docs = getDocsForQuestion(question.id, question.category);
            const showDocs = question.answer === 'yes' && question.requiredDocuments.length > 0;

            return (
              <div
                key={question.id}
                className={`rounded-lg border p-4 transition-all duration-200 ${
                  question.answer === 'yes' ? 'bg-muted/20' : 'bg-card'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm leading-relaxed text-foreground">
                      {question.question}
                    </p>
                  </div>
                  <AnswerBadge answer={question.answer} />
                </div>

                {/* Documents Section - Always Visible */}
                {showDocs && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Required Documents ({question.requiredDocuments.length})
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {question.requiredDocuments.map((reqDoc, dIndex) => {
                        const uploadedDoc = docs.find((d) =>
                          d.name.toLowerCase().includes(reqDoc.toLowerCase().split(' ')[0])
                        );

                        return (
                          <DocumentActionRow
                            key={dIndex}
                            document={uploadedDoc}
                            requiredDocName={reqDoc}
                            onApprove={onApproveDoc}
                            onRequestReupload={onRequestReupload}
                            onRequestMissing={onRequestMissing}
                            onView={onViewDoc}
                            canEdit={canEdit}
                          />
                        );
                      })}

                      {/* Additional uploaded documents */}
                      {docs
                        .filter(
                          (d) =>
                            !question.requiredDocuments.some((req) =>
                              d.name.toLowerCase().includes(req.toLowerCase().split(' ')[0])
                            )
                        )
                        .map((doc) => (
                          <DocumentActionRow
                            key={doc.id}
                            document={doc}
                            requiredDocName={doc.name}
                            onApprove={onApproveDoc}
                            onRequestReupload={onRequestReupload}
                            onRequestMissing={onRequestMissing}
                            onView={onViewDoc}
                            canEdit={canEdit}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
