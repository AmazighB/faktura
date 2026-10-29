import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, FileX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { computeTotals, lineHT } from '@/utils/calc';
import { cn } from '@/utils/cn';
import { formatCurrency, toISODate } from '@/utils/format';
import type { CompanyInfo, DocumentItem } from '@/types';
import { invoiceBalanceWithCredit } from '@/utils/invoice';

export default function CreditNoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const isEdit = Boolean(id);
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(toISODate());
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: invoices } = useAsync(() => services.invoices.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const { data: existingCn } = useAsync(() => (id ? services.creditNotes.get(id) : Promise.resolve(null)), [id]);

  // Load existing credit note for editing
  useEffect(() => {
    if (!isEdit || !existingCn || loaded) return;
    setClientId(existingCn.clientId);
    setInvoiceId(existingCn.invoiceId);
    setInvoiceNumber(existingCn.invoiceNumber);
    setDate(existingCn.date.split('T')[0]);
    setReason(existingCn.reason);
    setNotes(existingCn.notes ?? '');
    setItems(existingCn.items.map((item) => ({ ...item, id: Math.random().toString(36).slice(2) })));
    setLoaded(true);
  }, [isEdit, existingCn, loaded]);

  const company = settings?.company ?? ({} as CompanyInfo);
  const currency = settings?.currency ?? 'DA';
  const selectedClient = (clients ?? []).find((c) => c.id === clientId) ?? null;

  const clientInvoices = useMemo(() => {
    return (invoices ?? []).filter((i) => i.clientId === clientId && i.status !== 'brouillon' && i.status !== 'annulee');
  }, [invoices, clientId]);

  const totals = useMemo(() => computeTotals(items), [items]);

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId);
    const inv = (invoices ?? []).find((i) => i.id === invId);
    if (inv) {
      setInvoiceNumber(inv.number);
      setItems(inv.items.map((item) => ({ ...item, id: Math.random().toString(36).slice(2) })));
    }
  };

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        designation: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        vatRate: settings?.defaultVatRate ?? 19,
        unit: 'unité',
      },
    ]);
  };

  const updateLine = (index: number, field: keyof DocumentItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeLine = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const linkedInvoice = (invoices ?? []).find((i) => i.id === invoiceId);
  const dateError = linkedInvoice && date && date < linkedInvoice.date
    ? "La date de l'avoir ne peut pas être antérieure à la date de la facture"
    : null;

  const handleSave = async (status: 'brouillon' | 'emis') => {
    if (!clientId) { push('error', 'Sélectionnez un client'); return; }
    if (!invoiceId) { push('error', 'Sélectionnez une facture'); return; }
    if (!reason.trim()) { push('error', 'Le motif est obligatoire'); return; }
    if (items.length === 0 || items.every((i) => !i.designation)) { push('error', 'Ajoutez au moins une ligne'); return; }
    if (dateError) { push('error', dateError); return; }
    setSaving(true);
    try {
      const inv = (invoices ?? []).find((i) => i.id === invoiceId) ?? { number: invoiceNumber };
      const filteredItems = items.filter((i) => i.designation.trim());
      if (isEdit && id) {
        await services.creditNotes.update(id, {
          clientId,
          invoiceId,
          invoiceNumber: inv.number,
          date,
          items: filteredItems,
          reason,
          notes,
          status,
        });
        push('success', status === 'brouillon' ? 'Avoir modifié (brouillon)' : 'Avoir émis');
        navigate(`/credit-notes/${id}`);
      } else {
        const created = await services.creditNotes.create({
          number: '', // attribué par le service (série unique)
          clientId,
          invoiceId,
          invoiceNumber: inv.number,
          date,
          items: filteredItems,
          reason,
          notes,
          status,
          appliedAmount: 0,
        });
        push('success', status === 'brouillon' ? 'Avoir enregistré en brouillon' : 'Avoir émis');
        navigate(`/credit-notes/${created.id}`);
      }
    } catch {
      push('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Editor */}
      <div className="flex w-full shrink-0 flex-col overflow-y-auto scrollbar-thin border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[440px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <Tooltip label="Retour" side="right">
            <Button variant="ghost" size="icon" onClick={() => navigate('/credit-notes')} aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Tooltip>
          <div className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-orange-500" />
            <h1 className="text-base font-semibold">{isEdit ? 'Modifier l\'avoir' : 'Nouvel avoir'}</h1>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Client selector */}
          <Field label="Client" required>
            <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setInvoiceId(''); setItems([]); }}>
              <option value="">— Sélectionner —</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>

          {/* Invoice selector */}
          <Field label="Facture à créditer" required>
            <Select value={invoiceId} onChange={(e) => handleInvoiceChange(e.target.value)} disabled={!clientId}>
              <option value="">— Sélectionner —</option>
              {clientInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.number} — {formatCurrency(computeTotals(inv.items).totalTTC, currency)}</option>
              ))}
            </Select>
            {clientId && clientInvoices.length === 0 && (
              <p className="text-xs text-amber-500">Aucune facture éligible pour ce client</p>
            )}
          </Field>

          {/* Date */}
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={cn(dateError && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')} />
          </Field>
          {dateError && <p className="text-xs text-red-500">{dateError}</p>}

          {/* Reason */}
          <Field label="Motif" required>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(settings?.documentFields.creditNote.reasons ?? ['Retour matériel', 'Erreur de facturation', 'Remise commerciale', 'Annulation partielle', 'Autre']).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>

          {/* Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lignes</label>
              <Button variant="ghost" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-md border border-gray-200 p-2.5 dark:border-gray-800">
                  <input
                    type="text"
                    value={item.designation}
                    onChange={(e) => updateLine(idx, 'designation', e.target.value)}
                    placeholder="Désignation..."
                    className="mb-2 h-8 w-full rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    <div>
                      <label className="text-xs text-gray-400">Qté</label>
                      <Input type="number" className="h-7 text-xs" value={item.quantity} onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Prix</label>
                      <Input type="number" className="h-7 text-xs" value={item.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">TVA%</label>
                      <Input type="number" className="h-7 text-xs" value={item.vatRate} onChange={(e) => updateLine(idx, 'vatRate', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Total</label>
                      <div className="flex h-7 items-center text-xs font-medium">{formatCurrency(lineHT(item), currency)}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <select
                      value={item.unit}
                      onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                      className="h-6 w-20 rounded border border-gray-200 px-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                    >
                      {(settings?.documentFields.creditNote.units ?? ['unité', 'heure', 'jour', 'mois', 'mètre', 'forfait']).map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button onClick={() => removeLine(idx)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" aria-label="Supprimer la ligne">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <button onClick={addLine} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 py-3 text-sm text-gray-400 hover:border-gray-400 dark:border-gray-700">
                  <Plus className="h-4 w-4" /> Ajouter une ligne
                </button>
              )}
            </div>
          </div>

          <Field label="Notes"><Textarea className="min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Sous-total</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
            <div className="flex justify-between text-gray-500"><span>TVA</span><span>{formatCurrency(totals.vatAmount, currency)}</span></div>
            <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-gray-100"><span>Total TTC</span><span>{formatCurrency(totals.totalTTC, currency)}</span></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => handleSave('brouillon')} disabled={saving}>Brouillon</Button>
            <Button className="flex-1" onClick={() => handleSave('emis')} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Émettre'}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-100 p-4 dark:bg-gray-950 lg:p-6">
        <DocumentPreview
          type="avoir"
          number={isEdit && existingCn ? existingCn.number : `AV-${new Date().getFullYear()}-…`}
          date={date}
          dueDateOrExpiry={date}
          client={selectedClient}
          items={items}
          notes={notes}
          conditions={reason}
          company={company}
          currency={currency}
          template={settings?.invoiceTemplate}
          reference={(() => {
            const ref = (invoices ?? []).find((i) => i.id === invoiceId);
            if (!ref) return undefined;
            const applied = existingCn?.status === 'applique';
            return { number: ref.number, date: ref.date, balance: { ...invoiceBalanceWithCredit(ref, computeTotals(items).totalTTC, applied), applied } };
          })()}
        />
      </div>
    </div>
  );
}