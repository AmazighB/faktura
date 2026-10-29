import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DocumentEditor } from '@/components/ui/DocumentEditor';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import type { InvoiceStatus, DocumentItem } from '@/types';
import { nextDocumentNumber } from '@/utils/numbering';

export default function InvoiceEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { push } = useToast();
  const isEdit = Boolean(id);
  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const { data: existing } = useAsync(() => (id ? services.invoices.get(id) : Promise.resolve(null)), [id]);

  // Numéro proposé : plus grand numéro de la série + 1 (le service garantit l'unicité à l'enregistrement)
  const nextNumber = settings ? nextDocumentNumber((invoices ?? []).map((i) => i.number), settings.numbering, 'invoice') : '';

  const handleSave = async (data: {
    clientId: string;
    date: string;
    dueDateOrExpiry: string;
    items: DocumentItem[];
    notes: string;
    conditions: string;
    status: 'brouillon' | 'emise' | 'envoye';
  }) => {
    const invoiceStatus: InvoiceStatus = data.status === 'emise' ? 'emise' : 'brouillon';
    try {
    if (isEdit && id) {
      await services.invoices.update(id, {
        clientId: data.clientId,
        date: data.date,
        dueDate: data.dueDateOrExpiry,
        items: data.items,
        notes: data.notes,
        conditions: data.conditions,
        status: invoiceStatus,
      });
      push('success', 'Facture modifiée');
      navigate(`/invoices/${id}`);
    } else {
      const created = await services.invoices.create({
        number: nextNumber,
        clientId: data.clientId,
        date: data.date,
        dueDate: data.dueDateOrExpiry,
        items: data.items,
        notes: data.notes,
        conditions: data.conditions,
        status: invoiceStatus,
        paidAmount: 0,
        creditNotesApplied: 0,
      });
      services.activityLogs.log({
        userId: 'u1', userName: 'Administrateur',
        action: 'a créé la facture', entity: 'Facture', entityId: created.id, details: created.number,
      });
      push('success', 'Facture créée');
      navigate(`/invoices/${created.id}`);
    }
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  };

  // Facture émise : verrouillée (la correction passe par un avoir)
  if (isEdit && existing && existing.status !== 'brouillon') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">Facture {existing.number} verrouillée</h1>
        <p className="max-w-md text-sm text-gray-500">Une facture émise ne peut plus être modifiée. Pour corriger un montant ou une ligne, créez un avoir depuis la fiche de la facture.</p>
        <Button onClick={() => navigate(`/invoices/${existing.id}`)}>Retour à la facture</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold">{isEdit ? 'Modifier la facture' : 'Nouvelle facture'}</h1>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800">{existing?.number ?? nextNumber}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentEditor type="facture" documentId={id} onSave={handleSave} initialNumber={nextNumber} initialClientId={searchParams.get('client') ?? undefined} />
      </div>
    </div>
  );
}