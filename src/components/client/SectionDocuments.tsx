import { useState } from 'react';
import { FileText, Download, Eye, AlertTriangle, Send, X, CheckCircle2, Ban } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { Document, DocumentStatus } from '@/types';
import { formatDate } from '@/lib/utils';

interface SectionDocumentsProps {
  sectionKey: string;
  sectionName: string;
  documents: Document[];
  onMarkMissing?: (docId: string, message: string) => void;
  onRequestDocument?: (sectionKey: string, message: string) => void;
  onUpdateDocument?: (docId: string, status: DocumentStatus, reason?: string) => Promise<void> | void;
}

export function SectionDocuments({
  sectionKey,
  sectionName,
  documents,
  onMarkMissing,
  onRequestDocument,
  onUpdateDocument,
}: SectionDocumentsProps) {
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<DocumentStatus | null>(null);

  // Filter documents for this section
  const sectionDocs = documents.filter(doc => doc.sectionKey === sectionKey);

  if (sectionDocs.length === 0) {
    return null;
  }

  const handleViewDocument = (url?: string) => {
    if (url) {
      // Open document in new tab for direct viewing/downloading
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Document not available',
        description: 'This document does not have a viewable URL.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (url?: string, name?: string) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleMarkMissing = () => {
    if (!selectedDocId) return;
    const reason = requestMessage.trim();
    if (!reason) return;
    if (actionStatus && onUpdateDocument) {
      onUpdateDocument(selectedDocId, actionStatus, reason);
    } else {
      onMarkMissing?.(selectedDocId, reason);
    }
    toast({
      title: 'Document request sent',
      description: 'The client will be notified about the missing document.',
    });
    setIsRequestDialogOpen(false);
    setRequestMessage('');
    setSelectedDocId(null);
    setActionStatus(null);
  };

  const handleRequestForSection = () => {
    if (requestMessage.trim()) {
      onRequestDocument?.(sectionKey, requestMessage);
      toast({
        title: 'Document request sent',
        description: `Request sent for ${sectionName} documents.`,
      });
      setIsRequestDialogOpen(false);
      setRequestMessage('');
    }
  };

  const openActionDialog = (docId: string, status: DocumentStatus) => {
    setSelectedDocId(docId);
    setActionStatus(status);
    setIsRequestDialogOpen(true);
  };

  const getStatusBadge = (doc: Document) => {
    if (doc.isMissing || doc.status === 'missing') {
      return <Badge variant="destructive">Missing</Badge>;
    }
    switch (doc.status) {
      case 'complete':
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'reupload_requested':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Reupload Requested</Badge>;
      default:
        return <Badge variant="outline">{doc.status}</Badge>;
    }
  };

  const getFileTypeIcon = (doc: Document) => {
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Attached Documents ({sectionDocs.length})
        </h5>
      </div>

      <div className="space-y-2">
        {sectionDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 bg-background rounded-md border"
          >
            <div className="flex items-center gap-3">
              {getFileTypeIcon(doc)}
              <div>
                <p className="text-sm font-medium">{doc.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{doc.type}</span>
                  {doc.uploadedAt && (
                    <>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(doc)}
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleViewDocument(doc.url)}
                  title="View in new tab"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(doc.url, doc.name)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-orange-600 hover:text-orange-700"
                  onClick={() => {
                    setRequestMessage(`Please re-upload ${doc.name} for ${sectionName}.`);
                    openActionDialog(doc.id, 'reupload_requested');
                  }}
                  title="Request re-upload"
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700"
                  onClick={() => {
                    setRequestMessage(`Reason for rejection of ${doc.name}`);
                    openActionDialog(doc.id, 'rejected');
                  }}
                  title="Reject document"
                >
                  <Ban className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700"
                  onClick={() => onUpdateDocument?.(doc.id, 'approved')}
                  title="Mark verified"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Missing documents indicator */}
        {sectionDocs.some(d => d.isMissing || d.status === 'missing') && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              Some documents are marked as missing
            </span>
          </div>
        )}
      </div>

      {/* Request Document Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionStatus === 'rejected'
                ? 'Reject Document'
                : actionStatus === 'reupload_requested'
                  ? 'Request Re-upload'
                  : 'Request Document'}
            </DialogTitle>
            <DialogDescription>
              Send a request to the client for the missing document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message to Client</label>
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Enter your message to the client..."
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={selectedDocId ? handleMarkMissing : handleRequestForSection}
              disabled={!requestMessage.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SectionDocuments;
