import { Badge } from '@/components/ui/Badge';
import { invoiceStatusStyles, quoteStatusStyles, creditNoteStatusStyles } from '@/utils/styles';
import { invoiceStatusLabels, quoteStatusLabels, creditNoteStatusLabels } from '@/utils/labels';
import type { InvoiceStatus, QuoteStatus, CreditNoteStatus } from '@/types';

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge className={invoiceStatusStyles[status]}>{invoiceStatusLabels[status]}</Badge>;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={quoteStatusStyles[status]}>{quoteStatusLabels[status]}</Badge>;
}

export function CreditNoteStatusBadge({ status }: { status: CreditNoteStatus }) {
  return <Badge className={creditNoteStatusStyles[status]}>{creditNoteStatusLabels[status]}</Badge>;
}
