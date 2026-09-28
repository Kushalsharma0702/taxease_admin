import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, User } from 'lucide-react';
import { ClientStatus } from '@/types';

interface FilingStatusBadgeProps {
  status: ClientStatus;
  autoUpdated?: boolean;
  lastUpdatedBy?: string;
  lastUpdatedAt?: Date;
}

// Labels track PIPELINE_STATUS_LABELS in @/types; the last three keys are the
// legacy clients.status values older rows still carry.
const STATUS_CONFIG: Record<ClientStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  draft: { label: 'Form in Draft', variant: 'secondary' },
  documents_pending: { label: 'Additional Info Required', variant: 'secondary' },
  submitted: { label: 'Under Review', variant: 'outline', className: 'border-blue-500 text-blue-600' },
  payment_request_sent: { label: 'Awaiting Payment', variant: 'outline', className: 'border-orange-500 text-orange-600' },
  payment_completed: { label: 'Ready to Prepare', variant: 'outline', className: 'border-teal-500 text-teal-600' },
  in_preparation: { label: 'Work-in-Progress', variant: 'default', className: 'bg-blue-600' },
  awaiting_approval: { label: 'Sent for Approval', variant: 'outline', className: 'border-yellow-500 text-yellow-600' },
  approved_by_client: { label: 'Approval Received', variant: 'outline', className: 'border-violet-500 text-violet-600' },
  filed: { label: 'Filed', variant: 'default', className: 'bg-green-600' },
  completed: { label: 'E-Filing Completed', variant: 'default', className: 'bg-green-700' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  under_review: { label: 'Under Review', variant: 'outline', className: 'border-blue-500 text-blue-600' },
  cost_estimate_sent: { label: 'Estimate Sent', variant: 'outline', className: 'border-purple-500 text-purple-600' },
  awaiting_payment: { label: 'Awaiting Payment', variant: 'outline', className: 'border-orange-500 text-orange-600' },
};

export function FilingStatusBadge({
  status,
  autoUpdated = false,
  lastUpdatedBy,
  lastUpdatedAt,
}: FilingStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const badge = (
    <Badge variant={config.variant} className={`${config.className || ''} flex items-center gap-1`}>
      {autoUpdated && <Zap className="h-3 w-3" />}
      {config.label}
    </Badge>
  );

  if (autoUpdated || lastUpdatedBy) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              {autoUpdated && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Auto-updated by system</span>
                </div>
              )}
              {lastUpdatedBy && !autoUpdated && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Updated by {lastUpdatedBy}</span>
                </div>
              )}
              {lastUpdatedAt && (
                <div className="text-muted-foreground">
                  {formatDate(lastUpdatedAt)}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

export default FilingStatusBadge;
