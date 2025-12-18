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
} from 'lucide-react';
import { Document as DocType, DocumentStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface DocumentActionRowProps {
  document?: DocType;
  requiredDocName: string;
  onApprove: (docId: string) => void;
  onRequestReupload: (docId: string, reason: string) => void;
  onRequestMissing: (docName: string, reason: string) => void;
  onView: (doc: DocType) => void;
  canEdit?: boolean;
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string; icon: string }> = {
  approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 border-green-500/30', icon: '✅' },
  complete: { label: 'Pending Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: '🟡' },
  pending: { label: 'Pending Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: '🟡' },
  missing: { label: 'Missing', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: '🔴' },
  reupload_requested: { label: 'Re-upload Requested', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: '🔁' },
};

export function DocumentActionRow({
  document,
  requiredDocName,
  onApprove,
  onRequestReupload,
  onRequestMissing,
  onView,
  canEdit = true,
}: DocumentActionRowProps) {
  const { toast } = useToast();
  const [isReuploadOpen, setIsReuploadOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const status = document?.status || 'missing';
  const config = STATUS_CONFIG[status];

  const handleApprove = async () => {
    if (!document) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    onApprove(document.id);
    setIsLoading(false);
    toast({ title: 'Document Approved', description: `${document.name} has been approved.` });
  };

  const handleReuploadRequest = async () => {
    if (!document || !reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for re-upload.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    onRequestReupload(document.id, reason);
    setIsReuploadOpen(false);
    setReason('');
    setIsLoading(false);
    toast({ title: 'Re-upload Requested', description: `Request sent to client for ${document.name}.` });
  };

  const handleMissingRequest = async () => {
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for the request.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    onRequestMissing(requiredDocName, reason);
    setIsRequestOpen(false);
    setReason('');
    setIsLoading(false);
    toast({ title: 'Document Requested', description: `Request sent to client for ${requiredDocName}.` });
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm group">
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
            <p className="text-sm font-medium truncate">{document?.name || requiredDocName}</p>
            {document && (
              <p className="text-xs text-muted-foreground">
                v{document.version} • {document.uploadedAt?.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${config.className}`}>
            {config.icon} {config.label}
          </Badge>

          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {document ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(document)}
                  className="h-8 w-8 p-0"
                  title="View Document"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit && status !== 'approved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                    title="Approve Document"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReuploadOpen(true)}
                    className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                    title="Request Re-upload"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRequestOpen(true)}
                  className="h-8 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Request
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Re-upload Request Dialog */}
      <Dialog open={isReuploadOpen} onOpenChange={setIsReuploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Re-upload</DialogTitle>
            <DialogDescription>
              Send a request to the client to re-upload "{document?.name}".
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
              Send a request to the client for "{requiredDocName}".
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
    </>
  );
}
