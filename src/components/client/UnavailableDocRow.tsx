import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { unavailableRequestMessage } from '@/lib/documentRequest';

interface Props {
  /** Readable name of the document, e.g. "T5008". */
  docName: string;
  /** True once a request for this name has already been sent. */
  requested: boolean;
  /** Admin may send document requests (REQUEST_DOCUMENTS permission). */
  canRequest: boolean;
  /** Sends the request to the client (same flow as "Request" on a missing document). */
  onRequest: (docName: string, message: string) => void | Promise<void>;
}

/** A document the client marked "not available" in the app, with a button to ask for it again. */
export function UnavailableDocRow({ docName, requested, canRequest, onRequest }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await onRequest(docName, unavailableRequestMessage(docName, note));
      setOpen(false);
      setNote('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-muted">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{docName}</p>
          <p className="text-xs text-muted-foreground">Client marked this document as not available</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {requested ? (
          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
            🔁 Re-requested
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
            ⚪ Not available
          </Badge>
        )}
        {canRequest && (
          requested ? (
            <Button variant="outline" size="sm" disabled className="h-8 text-xs opacity-70">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Re-requested
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="h-8 text-xs">
              <Send className="h-3 w-3 mr-1" />
              Re-request
            </Button>
          )
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-request document</DialogTitle>
            <DialogDescription>
              The client marked "{docName}" as not available. This asks them again to upload it. They get an email and
              an app notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Extra note to the client (optional)</Label>
            <Textarea
              placeholder="e.g., This slip is needed to report your investment sales."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Message sent: {unavailableRequestMessage(docName, note)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button onClick={send} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
