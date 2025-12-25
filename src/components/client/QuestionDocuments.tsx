import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Eye,
  CheckCircle,
  RotateCcw,
  Send,
  FileText,
  Loader2,
  Download,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { Document as DocType, DocumentStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { DOCUMENT_SECTION_KEYS } from '@/lib/api/config';

interface QuestionDocumentsProps {
  sectionKey: keyof typeof DOCUMENT_SECTION_KEYS;
  sectionTitle: string;
  documents: DocType[];
  requiredDocuments?: string[];
  onApprove?: (docId: string) => void;
  onRequestReupload?: (docId: string, reason: string) => void;
  onRequestMissing?: (docName: string, reason: string) => void;
  onView?: (doc: DocType) => void;
  canEdit?: boolean;
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string; icon: string }> = {
  approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 border-green-500/30', icon: '✅' },
  complete: { label: 'Pending Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: '🟡' },
  pending: { label: 'Pending Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: '🟡' },
  missing: { label: 'Missing', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: '🔴' },
  reupload_requested: { label: 'Re-upload Requested', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: '🔁' },
};

export function QuestionDocuments({
  sectionKey,
  sectionTitle,
  documents,
  requiredDocuments = [],
  onApprove,
  onRequestReupload,
  onRequestMissing,
  onView,
  canEdit = true,
}: QuestionDocumentsProps) {
  const { toast } = useToast();
  const [isReuploadOpen, setIsReuploadOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [requestDocName, setRequestDocName] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get documents for this section
  const sectionKeyValue = DOCUMENT_SECTION_KEYS[sectionKey];
  const sectionDocs = documents.filter(d => d.sectionKey === sectionKeyValue);

  // If no documents and no required documents, don't show the section
  if (sectionDocs.length === 0 && requiredDocuments.length === 0) {
    return null;
  }

  const handleApprove = async (doc: DocType) => {
    if (!onApprove) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    onApprove(doc.id);
    setIsLoading(false);
    toast({ title: 'Document Approved', description: `${doc.name} has been approved.` });
  };

  const handleReuploadRequest = async () => {
    if (!selectedDoc || !reason.trim() || !onRequestReupload) {
      toast({ title: 'Error', description: 'Please provide a reason for re-upload.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    onRequestReupload(selectedDoc.id, reason);
    setIsReuploadOpen(false);
    setSelectedDoc(null);
    setReason('');
    setIsLoading(false);
    toast({ title: 'Re-upload Requested', description: `Request sent to client for ${selectedDoc.name}.` });
  };

  const handleMissingRequest = async () => {
    if (!reason.trim() || !onRequestMissing) {
      toast({ title: 'Error', description: 'Please provide a reason for the request.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    onRequestMissing(requestDocName, reason);
    setIsRequestOpen(false);
    setRequestDocName('');
    setReason('');
    setIsLoading(false);
    toast({ title: 'Document Requested', description: `Request sent to client for ${requestDocName}.` });
  };

  const handleViewDoc = (doc: DocType) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else if (onView) {
      onView(doc);
    } else {
      toast({
        title: 'Document Not Available',
        description: 'Document URL is not available.',
        variant: 'destructive',
      });
    }
  };

  const openRequestDialog = (docName: string) => {
    setRequestDocName(docName);
    setIsRequestOpen(true);
  };

  const openReuploadDialog = (doc: DocType) => {
    setSelectedDoc(doc);
    setIsReuploadOpen(true);
  };

  // Find missing required documents
  const missingRequiredDocs = requiredDocuments.filter(reqDoc => {
    return !sectionDocs.some(d => 
      d.name.toLowerCase().includes(reqDoc.toLowerCase().split(' ')[0])
    );
  });

  return (
    <div className="mt-4 p-4 rounded-lg border border-dashed border-border/60 bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Supporting Documents</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {sectionDocs.length} uploaded
        </Badge>
      </div>

      <div className="space-y-2">
        {/* Existing Documents */}
        {sectionDocs.map((doc) => {
          const status = doc.status || 'pending';
          const config = STATUS_CONFIG[status];

          return (
            <div 
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card/50 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  status === 'approved' ? 'bg-green-500/10' :
                  status === 'missing' ? 'bg-destructive/10' :
                  status === 'reupload_requested' ? 'bg-orange-500/10' :
                  'bg-yellow-500/10'
                }`}>
                  <FileText className={`h-4 w-4 ${
                    status === 'approved' ? 'text-green-500' :
                    status === 'missing' ? 'text-destructive' :
                    status === 'reupload_requested' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.fileType?.toUpperCase() || 'PDF'} • v{doc.version} • {doc.uploadedAt?.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-xs ${config.className}`}>
                  {config.icon} {config.label}
                </Badge>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDoc(doc)}
                    className="h-8 w-8 p-0"
                    title="View Document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {canEdit && status !== 'approved' && onApprove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(doc)}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      title="Approve Document"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {canEdit && onRequestReupload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openReuploadDialog(doc)}
                      className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                      title="Request Re-upload"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Missing Required Documents */}
        {missingRequiredDocs.map((reqDoc, idx) => (
          <div 
            key={`missing-${idx}`}
            className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-destructive/5 transition-all duration-200 hover:bg-destructive/10"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-muted-foreground">{reqDoc}</p>
                <p className="text-xs text-destructive">Not uploaded</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                🔴 Missing
              </Badge>

              {canEdit && onRequestMissing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRequestDialog(reqDoc)}
                  className="h-8 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Request
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* No documents message */}
        {sectionDocs.length === 0 && missingRequiredDocs.length === 0 && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mr-2 opacity-50" />
            No documents attached to this section
          </div>
        )}
      </div>

      {/* Re-upload Request Dialog */}
      <Dialog open={isReuploadOpen} onOpenChange={setIsReuploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Re-upload</DialogTitle>
            <DialogDescription>
              Send a request to the client to re-upload "{selectedDoc?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for re-upload</Label>
              <Textarea
                placeholder="e.g., Document is blurry, incomplete, or incorrect..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReuploadOpen(false)}>Cancel</Button>
            <Button onClick={handleReuploadRequest} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Document Request Dialog */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Missing Document</DialogTitle>
            <DialogDescription>
              Send a request to the client for "{requestDocName}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message to client (optional)</Label>
              <Textarea
                placeholder="Add any specific instructions..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleMissingRequest} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
