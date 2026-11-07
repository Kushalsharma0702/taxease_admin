/**
 * Payment Summary numbers for a client.
 *
 * A payment request is stored only as a notification, so the client's stored total can be $0 (older
 * requests) or lag behind. Total due is the larger of the stored total and the sum of every request:
 * right for old and new clients, and never counted twice.
 */
export type PaymentSummaryStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export function summarizePayments(args: {
  requestAmounts: number[];
  recordedAmounts: number[];       // payments actually received (not request rows)
  storedTotal?: number | null;     // clients.total_amount
  storedPaid?: number | null;      // clients.paid_amount
  storedStatus?: string | null;    // clients.payment_status
}) {
  const requestedTotal = args.requestAmounts.reduce((s, a) => s + (Number(a) || 0), 0);
  const recordedTotal = args.recordedAmounts.reduce((s, a) => s + (Number(a) || 0), 0);
  const receivedTotal = Math.max(Number(args.storedPaid) || 0, recordedTotal);
  const totalDue = Math.max(Number(args.storedTotal) || 0, requestedTotal);
  const balanceDue = Math.max(0, totalDue - receivedTotal);
  const status: PaymentSummaryStatus =
    totalDue > 0 && receivedTotal >= totalDue ? 'paid'
    : receivedTotal > 0 && totalDue <= 0 ? 'paid'
    : receivedTotal > 0 ? 'partial'
    : args.storedStatus === 'overdue' ? 'overdue'
    : 'pending';
  return { totalDue, receivedTotal, balanceDue, status, overpaid: Math.max(0, receivedTotal - totalDue) };
}
