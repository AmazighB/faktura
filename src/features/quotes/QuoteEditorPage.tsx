import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DocumentEditor } from '@/components/ui/DocumentEditor';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import type { QuoteStatus, DocumentItem } from '@/types';

export default function QuoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { push } = useToast();
  const isEdit = Boolean(id);
  const { data: quotes } = useAsync(() => services.quotes.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);

  const nextNumber = `${settings?.numbering.quotePrefix ?? 'DEV'}-${new Date().getFullYear()}-${String((quotes?.length ?? 0) + 1).padStart(settings?.numbering.quotePad ?? 4, '0')}`;

  const handleSave = async (data: {
    clientId: string;
    date: string;
    dueDateOrExpiry: string;
    items: DocumentItem[];
    notes: string;
    conditions: string;
    status: 'brouillon' | 'emise' | 'envoye';
  }) => {
    const quoteStatus: QuoteStatus = data.status === 'envoye' ? 'envoye' : 'brouillon';
    if (isEdit && id) {
      await services.quotes.update(id, {
        clientId: data.clientId,
        date: data.date,
        expiryDate: data.dueDateOrExpiry,
        items: data.items,
        notes: data.notes,
        conditions: data.conditions,
        status: quoteStatus,
      });
      push('success', 'Devis modifié');
      navigate(`/quotes/${id}`);
    } else {
      const created = await services.quotes.create({
        number: nextNumber,
        clientId: data.clientId,
        date: data.date,
        expiryDate: data.dueDateOrExpiry,
        items: data.items,
        notes: data.notes,
        conditions: data.conditions,
        status: quoteStatus,
      });
      services.activityLogs.log({
        userId: 'u1', userName: 'Administrateur',
        action: 'a créé le devis', entity: 'Devis', entityId: created.id, details: created.number,
      });
      push('success', 'Devis créé');
      navigate(`/quotes/${created.id}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold">{isEdit ? 'Modifier le devis' : 'Nouveau devis'}</h1>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800">{nextNumber}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentEditor type="devis" documentId={id} onSave={handleSave} initialNumber={nextNumber} initialClientId={searchParams.get('client') ?? undefined} />
      </div>
    </div>
  );
}