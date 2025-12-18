import { cn } from '@/lib/utils';
import { ClientStatus, PaymentStatus, DocumentStatus, STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types';

interface StatusBadgeProps {
  status: ClientStatus | PaymentStatus | DocumentStatus;
  type?: 'client' | 'payment' | 'document';
}

const clientStatusColors: Record<ClientStatus, string> = {
  documents_pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cost_estimate_sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  awaiting_payment: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  in_preparation: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  awaiting_approval: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  filed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const documentStatusColors: Record<DocumentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  missing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  reupload_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export function StatusBadge({ status, type = 'client' }: StatusBadgeProps) {
  let colorClass = '';
  let label: string = status;

  if (type === 'client' && status in clientStatusColors) {
    colorClass = clientStatusColors[status as ClientStatus];
    label = STATUS_LABELS[status as ClientStatus];
  } else if (type === 'payment' && status in paymentStatusColors) {
    colorClass = paymentStatusColors[status as PaymentStatus];
    label = PAYMENT_STATUS_LABELS[status as PaymentStatus];
  } else if (type === 'document' && status in documentStatusColors) {
    colorClass = documentStatusColors[status as DocumentStatus];
    label = status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClass
      )}
    >
      {label}
    </span>
  );
}
