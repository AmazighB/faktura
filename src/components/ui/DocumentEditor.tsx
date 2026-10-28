import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, X, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Field, Textarea } from '@/components/ui/Input';
import { DocumentPreview } from '@/components/ui/DocumentPreview';
import { Dialog } from '@/components/ui/Dialog';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { computeTotals, lineHT } from '@/utils/calc';
import { formatCurrency, toISODate, addDays } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { DocumentItem, Product, CompanyInfo } from '@/types';

interface DocumentEditorProps {
  type: 'facture' | 'devis';
  documentId?: string;
  onSave: (data: {
    clientId: string;
    date: string;
    dueDateOrExpiry: string;
    items: DocumentItem[];
    notes: string;
    conditions: string;
    status: 'brouillon' | 'emise' | 'envoye';
  }) => Promise<void>;
  initialNumber: string;
  /** Client présélectionné (ex. depuis une fiche client) */
  initialClientId?: string;
}

const newLine = (vatRate: number): DocumentItem => ({
  id: Math.random().toString(36).slice(2),
  designation: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  vatRate,
  unit: 'unité',
});

export function DocumentEditor({ type, documentId, onSave, initialNumber, initialClientId }: DocumentEditorProps) {
  const { push } = useToast();
  const [clientId, setClientId] = useState(initialClientId ?? '');
  const [date, setDate] = useState(toISODate());
  const [dueDate, setDueDate] = useState(toISODate(addDays(new Date(), 30)));
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState<number | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const [hi, setHi] = useState(0); // suggestion surlignée (clavier)
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const lineRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: products } = useAsync(() => services.products.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);

  // Load existing document
  useEffect(() => {
    if (!documentId) return;
    const load = async () => {
      const doc = type === 'facture'
        ? await services.invoices.get(documentId)
        : await services.quotes.get(documentId);
      if (doc) {
        setClientId(doc.clientId);
        setDate(doc.date.split('T')[0]);
        const due = type === 'facture' ? (doc as { dueDate: string }).dueDate : (doc as { expiryDate: string }).expiryDate;
        setDueDate(due.split('T')[0]);
        setItems(doc.items);
        setNotes(doc.notes ?? '');
        setConditions(doc.conditions ?? '');
      }
    };
    load();
  }, [documentId, type]);

  // Nouvelle pièce : une première ligne prête à être saisie
  useEffect(() => {
    if (!documentId && settings) setItems((prev) => (prev.length ? prev : [newLine(settings.defaultVatRate ?? 19)]));
  }, [documentId, settings]);

  // Donne le focus à la ligne qui vient d'être ajoutée
  useEffect(() => {
    if (focusIdx === null) return;
    lineRefs.current[focusIdx]?.focus();
    setFocusIdx(null);
  }, [focusIdx, items.length]);

  const company = settings?.company ?? ({} as CompanyInfo);
  const currency = settings?.currency ?? 'DA';
  const selectedClient = (clients ?? []).find((c) => c.id === clientId) ?? null;
  const totals = useMemo(() => computeTotals(items), [items]);

  const filteredClients = (clients ?? [])
    .filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch))
    .slice(0, 6);

  const filteredProducts = (search: string) =>
    (products ?? []).filter((p) =>
      p.active && (p.name.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase())),
    );

  const addLine = () => {
    setFocusIdx(items.length);
    setItems((prev) => [...prev, newLine(settings?.defaultVatRate ?? 19)]);
  };

  const addProductLine = (product: Product, index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: product.id,
        designation: product.name,
        unitPrice: product.priceHT,
        vatRate: product.vatRate,
        unit: product.unit,
      };
      return next;
    });
    setProductDropdownOpen(null);
    setProductSearch('');
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

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      push('error', 'Le nom est obligatoire');
      return;
    }
    const created = await services.clients.create({
      name: newClientName,
      type: 'entreprise',
      phone: newClientPhone,
      address: '', wilaya: '', commune: '', email: '',
    });
    setClientId(created.id);
    setNewClientOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    setClientDropdownOpen(false);
    push('success', 'Client créé');
  };

  const dateError = dueDate && date && dueDate < date
    ? type === 'devis' ? "La date de validité ne peut pas être antérieure à la date du devis"
    : "L'échéance ne peut pas être antérieure à la date de facture"
    : null;

  const handleSave = async (status: 'brouillon' | 'emise' | 'envoye') => {
    if (!clientId) {
      push('error', 'Sélectionnez un client');
      return;
    }
    if (items.length === 0 || items.every((i) => !i.designation)) {
      push('error', 'Ajoutez au moins une ligne');
      return;
    }
    if (dateError) {
      push('error', dateError);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        clientId, date, dueDateOrExpiry: dueDate,
        items: items.filter((i) => i.designation.trim()),
        notes, conditions, status,
      });
    } catch {
      push('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Raccourcis : Ctrl+S = brouillon, Ctrl+Entrée = émettre / envoyer
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 's') { e.preventDefault(); void saveRef.current('brouillon'); }
      else if (e.key === 'Enter') { e.preventDefault(); void saveRef.current(type === 'devis' ? 'envoye' : 'emise'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [type]);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Editor */}
      <div className="flex w-full shrink-0 flex-col overflow-y-auto scrollbar-thin border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[480px] lg:border-b-0 lg:border-r">
        <div className="space-y-5 p-5">
          {/* Client selector */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Client</label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedClient.name}</p>
                  <p className="text-xs text-gray-400">{selectedClient.phone} · {selectedClient.wilaya}</p>
                </div>
                <button onClick={() => { setClientId(''); setClientSearch(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                      onFocus={() => setClientDropdownOpen(true)}
                      placeholder="Rechercher ou créer un client…"
                      autoFocus={!documentId}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm shadow-card focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-0 dark:border-gray-700 dark:bg-gray-900"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setNewClientOpen(true)} aria-label="Nouveau client">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {clientDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setClientDropdownOpen(false)} />
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto scrollbar-thin rounded-xl border border-gray-200 bg-white py-1 shadow-pop dark:border-gray-800 dark:bg-gray-900">
                      {filteredClients.length === 0 && clientSearch ? (
                        <button
                          onClick={() => { setNewClientOpen(true); setNewClientName(clientSearch); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20"
                        >
                          <Plus className="h-4 w-4" /> Créer "{clientSearch}"
                        </button>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setClientId(c.id); setClientDropdownOpen(false); setClientSearch(''); }}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <span className="text-sm font-medium">{c.name}</span>
                            <span className="text-xs text-gray-400">{c.phone} · {c.wilaya}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={type === 'devis' ? "Valable jusqu'au" : 'Échéance'}>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className={cn(dateError && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')} />
            </Field>
          </div>
          {dateError && <p className="text-xs text-red-500">{dateError}</p>}

          {/* Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Lignes</label>
              <Button variant="ghost" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Ajouter une ligne</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-card focus-within:border-accent-400 dark:border-gray-800 dark:bg-gray-900">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      ref={(el) => { lineRefs.current[idx] = el; }}
                      value={item.designation}
                      onKeyDown={(e) => {
                        const list = filteredProducts(productSearch).slice(0, 6);
                        if (productDropdownOpen !== idx || list.length === 0) return;
                        if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                        else if (e.key === 'Enter') { e.preventDefault(); addProductLine(list[Math.min(hi, list.length - 1)], idx); }
                        else if (e.key === 'Escape') setProductDropdownOpen(null);
                      }}
                      onChange={(e) => {
                        updateLine(idx, 'designation', e.target.value);
                        setProductDropdownOpen(e.target.value ? idx : null);
                        setProductSearch(e.target.value);
                        setHi(0);
                      }}
                      onFocus={() => item.designation && setProductDropdownOpen(idx)}
                      placeholder="Tapez un produit ou un service…"
                      className="h-9 w-full rounded-md border-0 bg-transparent px-1 text-sm font-medium placeholder:font-normal placeholder:text-gray-400 focus:ring-0 focus:ring-offset-0"
                    />
                    {productDropdownOpen === idx && productSearch && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setProductDropdownOpen(null)} />
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto scrollbar-thin rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                          {filteredProducts(productSearch).slice(0, 6).map((p, pi) => (
                            <button
                              key={p.id}
                              onMouseEnter={() => setHi(pi)}
                              onClick={() => addProductLine(p, idx)}
                              className={cn('flex w-full items-center justify-between px-3 py-2 text-left', pi === hi ? 'bg-accent-50 dark:bg-accent-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}
                            >
                              <div>
                                <p className="text-sm">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.reference}</p>
                              </div>
                              <span className="num text-xs text-gray-500">{formatCurrency(p.priceHT, currency)}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
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
                      <Input type="number" className="h-7 text-xs" value={item.vatRate} onChange={(e) => updateLine(idx, 'vatRate', Number(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter' && idx === items.length - 1) { e.preventDefault(); addLine(); } }} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Total</label>
                      <div className="num flex h-7 items-center text-xs font-semibold">{formatCurrency(lineHT(item), currency)}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <select
                      value={item.unit}
                      onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                      className="h-6 w-20 rounded border border-gray-200 px-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                    >
                      {(settings?.documentFields[type === 'facture' ? 'invoice' : 'quote'].units ?? ['unité', 'heure', 'jour', 'mois', 'mètre', 'forfait']).map((u) => (
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
                <button onClick={addLine} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-accent-400 hover:text-accent-600 dark:border-gray-700">
                  <Plus className="h-4 w-4" /> Ajouter une ligne
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes"><Textarea className="min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Field label="Conditions"><Textarea className="min-h-[60px]" value={conditions} onChange={(e) => setConditions(e.target.value)} /></Field>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="num mb-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Sous-total HT</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
            <div className="flex justify-between text-gray-500"><span>TVA</span><span>{formatCurrency(totals.vatAmount, currency)}</span></div>
            <div className="flex items-baseline justify-between border-t border-gray-200 pt-2 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-50"><span className="text-sm">Total TTC</span><span>{formatCurrency(totals.totalTTC, currency)}</span></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => handleSave('brouillon')} disabled={saving}>Enregistrer le brouillon</Button>
            <Button size="lg" className="flex-1" onClick={() => handleSave(type === 'devis' ? 'envoye' : 'emise')} disabled={saving}>
              {saving ? 'Enregistrement…' : type === 'devis' ? 'Envoyer le devis' : 'Émettre la facture'}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400"><span className="kbd">Ctrl</span> <span className="kbd">S</span> brouillon · <span className="kbd">Ctrl</span> <span className="kbd">Entrée</span> {type === 'devis' ? 'envoyer' : 'émettre'}</p>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-100 p-4 dark:bg-gray-950 lg:p-8">
        <DocumentPreview
          type={type}
          number={initialNumber}
          date={date}
          dueDateOrExpiry={dueDate}
          client={selectedClient}
          items={items}
          notes={notes}
          conditions={conditions}
          company={company}
          currency={currency}
          template={type === 'devis' ? settings?.quoteTemplate : settings?.invoiceTemplate}
        />
      </div>

      {/* Quick client creation */}
      <Dialog open={newClientOpen} onClose={() => setNewClientOpen(false)} title="Nouveau client" size="sm" footer={<><Button variant="outline" onClick={() => setNewClientOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateClient}>Créer</Button></>}>
        <div className="space-y-3 p-5">
          <Field label="Nom" required><Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} /></Field>
          <Field label="Téléphone"><Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} /></Field>
        </div>
      </Dialog>
    </div>
  );
}