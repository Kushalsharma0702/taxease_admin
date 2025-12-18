import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Document as DocType, DocumentStatus } from '@/types';
import { Download, ExternalLink, FileText, X } from 'lucide-react';

interface DocumentPreviewModalProps {
  document: DocType | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  complete: { label: 'Pending Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  pending: { label: 'Pending Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  missing: { label: 'Missing', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  reupload_requested: { label: 'Re-upload Requested', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
};

export function DocumentPreviewModal({ document, isOpen, onClose }: DocumentPreviewModalProps) {
  if (!document) return null;

  const config = STATUS_CONFIG[document.status];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{document.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Version {document.version} • {document.uploadedAt?.toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 mt-4 rounded-lg border bg-muted/20 flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Document Preview</p>
            <p className="text-sm">Preview would display here for PDF/Image files</p>
          </div>
        </div>

        {document.notes && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{document.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
