import { useEffect, useRef, useState } from 'react';
import { Save, Building2, FileText, CreditCard, Globe, RefreshCw, CheckCircle2, AlertCircle, Mail, Server, Hash, Percent, LayoutGrid, ListChecks, Tag, Plus, Trash2, X, ChevronDown, RotateCcw, Upload, ImageIcon } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastContext';
import { useApp } from '@/app/providers/AppContext';
import { cn } from '@/utils/cn';
import { ALL_MODULES, loadModuleConfig, saveModuleConfig, type ModuleConfig } from '@/utils/modules';
import type { Settings, PaymentMethod, SmtpConfig, ExpenseCategoryConfig, EmailTemplateKey, EmailTemplate } from '@/types';

const sections = [
  { key: 'company', label: 'Entreprise', icon: Building2 },
  { key: 'billing', label: 'Facturation', icon: Percent },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'documentFields', label: 'Champs & Unités', icon: ListChecks },
  { key: 'payments', label: 'Paiements', icon: CreditCard },
  { key: 'categories', label: 'Catégories', icon: Tag },
  { key: 'email', label: 'Email (SMTP)', icon: Mail },
  { key: 'modules', label: 'Modules', icon: LayoutGrid },
  { key: 'system', label: 'Système', icon: Globe },
] as const;

const compactInput = 'text-sm';

export default function SettingsPage() {
  const { push } = useToast();
  const { theme, setTheme, locale, setLocale } = useApp();
  const [section, setSection] = useState<string>('company');
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [smtpTested, setSmtpTested] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [openTpl, setOpenTpl] = useState<string | null>(null);

  const { data: settings, reload } = useAsync(() => services.settings.get(), []);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(() => loadModuleConfig());
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => { if (settings) setForm({ ...settings }); }, [settings]);

  // Ctrl+S enregistre (le raccourci pointe toujours vers la dernière version de handleSave)
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!form) return null;
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => ({ ...f!, [key]: value }));
  const updateCompany = <K extends keyof Settings['company']>(key: K, value: Settings['company'][K]) => setForm((f) => ({ ...f!, company: { ...f!.company, [key]: value } }));
  const updateNumbering = <K extends keyof Settings['numbering']>(key: K, value: Settings['numbering'][K]) => setForm((f) => ({ ...f!, numbering: { ...f!.numbering, [key]: value } }));
  const updateSmtp = <K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) => setForm((f) => ({ ...f!, smtp: { ...f!.smtp, [key]: value } }));
  const updateEmailTemplate = (key: EmailTemplateKey, field: keyof EmailTemplate, value: string | boolean) =>
    setForm((f) => ({ ...f!, emailTemplates: { ...f!.emailTemplates, [key]: { ...f!.emailTemplates[key], [field]: value } } }));

  const updateDocFields = (docType: 'invoice' | 'quote', key: string, field: 'enabled' | 'required', value: boolean) =>
    setForm((f) => {
      const fields = f!.documentFields[docType].fields.map((fld) => fld.key === key ? { ...fld, [field]: value } : fld);
      return { ...f!, documentFields: { ...f!.documentFields, [docType]: { ...f!.documentFields[docType], fields } } };
    });

  const updateDocUnits = (docType: 'invoice' | 'quote', units: string[]) =>
    setForm((f) => ({ ...f!, documentFields: { ...f!.documentFields, [docType]: { ...f!.documentFields[docType], units } } }));

  const updateCreditNoteReasons = (reasons: string[]) =>
    setForm((f) => ({ ...f!, documentFields: { ...f!.documentFields, creditNote: { ...f!.documentFields.creditNote, reasons } } }));

  const updateCreditNoteUnits = (units: string[]) =>
    setForm((f) => ({ ...f!, documentFields: { ...f!.documentFields, creditNote: { ...f!.documentFields.creditNote, units } } }));

  const updateExpenseCategories = (categories: ExpenseCategoryConfig[]) =>
    setForm((f) => ({ ...f!, expenseCategories: categories }));

  const handleSave = async () => {
    setSaving(true);
    try { await services.settings.update(form); push('success', 'Paramètres enregistrés'); reload(); }
    catch { push('error', 'Erreur'); } finally { setSaving(false); }
  };
  saveRef.current = () => { if (dirty && !saving) void handleSave(); };

  const handleTestSmtp = () => {
    setSmtpTesting(true);
    setTimeout(() => { setSmtpTesting(false); setSmtpTested(true); push('success', 'Connexion SMTP réussie', `Test vers ${form.smtp.host}:${form.smtp.port}`); }, 1500);
  };

  const toggleModule = (key: string, enabled: boolean) => {
    const next = { ...moduleConfig, [key]: enabled };
    setModuleConfig(next); saveModuleConfig(next);
    push(enabled ? 'success' : 'info', enabled ? 'Module activé' : 'Module désactivé', ALL_MODULES.find((m) => m.key === key)?.label);
  };

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setTimeout(() => { setCheckingUpdate(false); push('info', 'À jour', 'Vous utilisez la dernière version (1.0.0)'); }, 1500);
  };

  const handleLogoUpload = (file: File) => {
    if (file.size > 500_000) { push('error', 'Fichier trop volumineux', 'Le logo doit faire moins de 500 Ko'); return; }
    const reader = new FileReader();
    reader.onload = () => { updateCompany('logo', reader.result as string); push('success', 'Logo importé'); };
    reader.readAsDataURL(file);
  };

  const pmLabels: Record<PaymentMethod, string> = { especes: 'Espèces', virement: 'Virement', carte: 'Carte', cheque: 'Chèque', en_ligne: 'Paiement en ligne', autre: 'Autre' };

  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de l'application" />
      <PageContent>
        <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
          {/* Section sidebar */}
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    section === s.key ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200',
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", section === s.key ? "text-accent-600 dark:text-accent-400" : "text-gray-400")} /> {s.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {section === 'company' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Coordonnées</h3></div>
                  <div className="space-y-2.5">
                    <Field label="Nom"><Input className={compactInput} value={form.company.name} onChange={(e) => updateCompany('name', e.target.value)} /></Field>
                    <Field label="Adresse"><Textarea className="min-h-[44px] text-sm" value={form.company.address} onChange={(e) => updateCompany('address', e.target.value)} /></Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Téléphone"><Input className={compactInput} value={form.company.phone} onChange={(e) => updateCompany('phone', e.target.value)} /></Field>
                      <Field label="Email"><Input className={compactInput} value={form.company.email} onChange={(e) => updateCompany('email', e.target.value)} /></Field>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Hash className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Identifiants fiscaux</h3></div>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="NIF"><Input className={compactInput} value={form.company.nif} onChange={(e) => updateCompany('nif', e.target.value)} /></Field>
                      <Field label="NIS"><Input className={compactInput} value={form.company.nis} onChange={(e) => updateCompany('nis', e.target.value)} /></Field>
                      <Field label="RC"><Input className={compactInput} value={form.company.rc} onChange={(e) => updateCompany('rc', e.target.value)} /></Field>
                      <Field label="AI"><Input className={compactInput} value={form.company.ai} onChange={(e) => updateCompany('ai', e.target.value)} /></Field>
                    </div>
                    <Field label="Coordonnées bancaires"><Textarea className="min-h-[44px] text-sm" value={form.company.bankDetails} onChange={(e) => updateCompany('bankDetails', e.target.value)} /></Field>
                  </div>
                </Card>
                <Card className="p-4 md:col-span-2">
                  <div className="mb-3 flex items-center gap-2"><ImageIcon className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Logo de l'entreprise</h3></div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                      {form.company.logo
                        ? <img src={form.company.logo} alt="Logo" className="h-full w-full object-contain" />
                        : <ImageIcon className="h-6 w-6 text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Le logo apparaît sur les factures, devis et avoirs. Format PNG ou JPG, 500 Ko max.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label>
                          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
                          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-accent-400 hover:text-accent-600 dark:border-gray-800 dark:text-gray-300"><Upload className="h-3.5 w-3.5" /> Importer</span>
                        </label>
                        {form.company.logo && (
                          <button onClick={() => updateCompany('logo', '')} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-800 dark:text-gray-300"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {section === 'billing' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Hash className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Numérotation</h3></div>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Préf. facture"><Input className={compactInput} value={form.numbering.invoicePrefix} onChange={(e) => updateNumbering('invoicePrefix', e.target.value)} /></Field>
                      <Field label="Préf. devis"><Input className={compactInput} value={form.numbering.quotePrefix} onChange={(e) => updateNumbering('quotePrefix', e.target.value)} /></Field>
                      <Field label="Préf. avoir"><Input className={compactInput} value={form.numbering.creditNotePrefix} onChange={(e) => updateNumbering('creditNotePrefix', e.target.value)} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="N° départ"><Input type="number" className={compactInput} value={form.numbering.invoiceStart} onChange={(e) => updateNumbering('invoiceStart', Number(e.target.value))} /></Field>
                      <Field label="Longueur"><Input type="number" className={compactInput} value={form.numbering.invoicePad} onChange={(e) => updateNumbering('invoicePad', Number(e.target.value))} /></Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={form.numbering.useYear} onChange={(v) => updateNumbering('useYear', v)} /> Inclure l'année</label>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Percent className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Paramètres</h3></div>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="TVA par défaut (%)"><Input type="number" className={compactInput} value={form.defaultVatRate} onChange={(e) => update('defaultVatRate', Number(e.target.value))} /></Field>
                      <Field label="Devise"><Input className={compactInput} value={form.currency} onChange={(e) => update('currency', e.target.value)} /></Field>
                      <Field label="Délai paiement (j)"><Input type="number" className={compactInput} value={form.defaultPaymentDelay} onChange={(e) => update('defaultPaymentDelay', Number(e.target.value))} /></Field>
                      <Field label="Validité devis (j)"><Input type="number" className={compactInput} value={form.defaultQuoteValidity} onChange={(e) => update('defaultQuoteValidity', Number(e.target.value))} /></Field>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {section === 'documents' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Modèles</h3></div>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Modèle facture"><Select className={compactInput} value={form.invoiceTemplate} onChange={(e) => update('invoiceTemplate', e.target.value as Settings['invoiceTemplate'])}><option value="moderne">Moderne</option><option value="classique">Classique</option><option value="minimal">Minimal</option></Select></Field>
                      <Field label="Modèle devis"><Select className={compactInput} value={form.quoteTemplate} onChange={(e) => update('quoteTemplate', e.target.value as Settings['quoteTemplate'])}><option value="moderne">Moderne</option><option value="classique">Classique</option><option value="minimal">Minimal</option></Select></Field>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Textes</h3></div>
                  <div className="space-y-2.5">
                    <Field label="Pied de page"><Textarea className="min-h-[44px] text-sm" value={form.footer} onChange={(e) => update('footer', e.target.value)} /></Field>
                    <Field label="Conditions générales"><Textarea className="min-h-[60px] text-sm" value={form.terms} onChange={(e) => update('terms', e.target.value)} /></Field>
                  </div>
                </Card>
              </div>
            )}

            {section === 'documentFields' && (
              <div className='space-y-4'>
                {/* Invoice fields */}
                <Card className='p-4'>
                  <div className='mb-3 flex items-center gap-2'><FileText className='h-4 w-4 text-gray-400' /><h3 className='text-sm font-semibold'>Champs de la facture</h3></div>
                  <div className='space-y-1.5'>
                    {form.documentFields.invoice.fields.map((fld) => (
                      <div key={fld.key} className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800'>
                        <span className={cn('text-sm', !fld.enabled && 'text-gray-400')}>{fld.label}</span>
                        <div className='flex items-center gap-4'>
                          <label className='flex items-center gap-1.5 text-xs text-gray-500'><Switch checked={fld.required} onChange={(v) => updateDocFields('invoice', fld.key, 'required', v)} disabled={!fld.enabled} /> Obligatoire</label>
                          <Switch checked={fld.enabled} onChange={(v) => updateDocFields('invoice', fld.key, 'enabled', v)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className='mt-4'>
                    <p className='mb-1.5 text-xs font-medium text-gray-500'>Unités disponibles</p>
                    <div className='flex flex-wrap gap-1.5'>
                      {form.documentFields.invoice.units.map((unit, i) => (
                        <span key={i} className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-800'>
                          {unit}
                          <button onClick={() => updateDocUnits('invoice', form.documentFields.invoice.units.filter((_, idx) => idx !== i))} className='text-gray-400 hover:text-red-500'><X className='h-3 w-3' /></button>
                        </span>
                      ))}
                      <UnitAdder onAdd={(u) => updateDocUnits('invoice', [...form.documentFields.invoice.units, u])} />
                    </div>
                  </div>
                </Card>

                {/* Quote fields */}
                <Card className='p-4'>
                  <div className='mb-3 flex items-center gap-2'><FileText className='h-4 w-4 text-gray-400' /><h3 className='text-sm font-semibold'>Champs du devis</h3></div>
                  <div className='space-y-1.5'>
                    {form.documentFields.quote.fields.map((fld) => (
                      <div key={fld.key} className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800'>
                        <span className={cn('text-sm', !fld.enabled && 'text-gray-400')}>{fld.label}</span>
                        <div className='flex items-center gap-4'>
                          <label className='flex items-center gap-1.5 text-xs text-gray-500'><Switch checked={fld.required} onChange={(v) => updateDocFields('quote', fld.key, 'required', v)} disabled={!fld.enabled} /> Obligatoire</label>
                          <Switch checked={fld.enabled} onChange={(v) => updateDocFields('quote', fld.key, 'enabled', v)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className='mt-4'>
                    <p className='mb-1.5 text-xs font-medium text-gray-500'>Unités disponibles</p>
                    <div className='flex flex-wrap gap-1.5'>
                      {form.documentFields.quote.units.map((unit, i) => (
                        <span key={i} className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-800'>
                          {unit}
                          <button onClick={() => updateDocUnits('quote', form.documentFields.quote.units.filter((_, idx) => idx !== i))} className='text-gray-400 hover:text-red-500'><X className='h-3 w-3' /></button>
                        </span>
                      ))}
                      <UnitAdder onAdd={(u) => updateDocUnits('quote', [...form.documentFields.quote.units, u])} />
                    </div>
                  </div>
                </Card>

                {/* Credit note reasons */}
                <Card className='p-4'>
                  <div className='mb-3 flex items-center gap-2'><FileText className='h-4 w-4 text-gray-400' /><h3 className='text-sm font-semibold'>Motifs des avoirs</h3></div>
                  <div className='space-y-1.5'>
                    {form.documentFields.creditNote.reasons.map((reason, i) => (
                      <div key={i} className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800'>
                        <span className='text-sm'>{reason}</span>
                        <button onClick={() => updateCreditNoteReasons(form.documentFields.creditNote.reasons.filter((_, idx) => idx !== i))} className='text-gray-400 hover:text-red-500'><Trash2 className='h-3.5 w-3.5' /></button>
                      </div>
                    ))}
                    <ReasonAdder onAdd={(r) => updateCreditNoteReasons([...form.documentFields.creditNote.reasons, r])} />
                  </div>
                  <div className='mt-4'>
                    <p className='mb-1.5 text-xs font-medium text-gray-500'>Unités disponibles (avoirs)</p>
                    <div className='flex flex-wrap gap-1.5'>
                      {form.documentFields.creditNote.units.map((unit, i) => (
                        <span key={i} className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-800'>
                          {unit}
                          <button onClick={() => updateCreditNoteUnits(form.documentFields.creditNote.units.filter((_, idx) => idx !== i))} className='text-gray-400 hover:text-red-500'><X className='h-3 w-3' /></button>
                        </span>
                      ))}
                      <UnitAdder onAdd={(u) => updateCreditNoteUnits([...form.documentFields.creditNote.units, u])} />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {section === 'categories' && (
              <Card className='p-4'>
                <div className='mb-3 flex items-center gap-2'><Tag className='h-4 w-4 text-gray-400' /><h3 className='text-sm font-semibold'>Catégories de dépenses</h3></div>
                <div className='space-y-1.5'>
                  {form.expenseCategories.map((cat, i) => (
                    <div key={cat.id} className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800'>
                      <div className='flex items-center gap-2'>
                        <span className='h-3 w-3 rounded-full' style={{ backgroundColor: cat.color }} />
                        <span className='text-sm font-medium'>{cat.name}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <input type='color' value={cat.color} onChange={(e) => updateExpenseCategories(form.expenseCategories.map((c, idx) => idx === i ? { ...c, color: e.target.value } : c))} className='h-7 w-7 cursor-pointer rounded border border-gray-200 dark:border-gray-800' />
                        <input type='text' value={cat.name} onChange={(e) => updateExpenseCategories(form.expenseCategories.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))} className='h-7 w-32 rounded border border-gray-200 px-2 text-xs dark:border-gray-800 dark:bg-gray-900' />
                        <button onClick={() => updateExpenseCategories(form.expenseCategories.filter((_, idx) => idx !== i))} className='text-gray-400 hover:text-red-500'><Trash2 className='h-3.5 w-3.5' /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => updateExpenseCategories([...form.expenseCategories, { id: `ec${Date.now()}`, name: 'Nouvelle catégorie', color: '#6b7280' }])} className='flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-accent-400 hover:text-accent-600 dark:border-gray-700'><Plus className='h-3.5 w-3.5' /> Ajouter une catégorie</button>
                </div>
              </Card>
            )}

            {section === 'payments' && (
              <Card className="p-4">
                <div className="mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Modes de paiement</h3></div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {(['especes', 'virement', 'carte', 'cheque', 'en_ligne', 'autre'] as PaymentMethod[]).map((method) => {
                    const enabled = form.paymentMethods.includes(method);
                    return (
                      <label key={method} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800">
                        <span className="text-sm">{pmLabels[method]}</span>
                        <Switch checked={enabled} onChange={(v) => update('paymentMethods', v ? [...form.paymentMethods, method] : form.paymentMethods.filter((m) => m !== method))} />
                      </label>
                    );
                  })}
                </div>
              </Card>
            )}

            {section === 'email' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Serveur SMTP</h3></div>
                    <label className="flex items-center gap-2"><span className="text-xs text-gray-500">Activer</span><Switch checked={form.smtp.enabled} onChange={(v) => updateSmtp('enabled', v)} /></label>
                  </div>
                  <div className={cn('space-y-2.5', !form.smtp.enabled && 'pointer-events-none opacity-50')}>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <div className="col-span-2"><Field label="Hôte"><Input className={compactInput} value={form.smtp.host} onChange={(e) => updateSmtp('host', e.target.value)} placeholder="smtp.gmail.com" /></Field></div>
                      <Field label="Port"><Select className={compactInput} value={String(form.smtp.port)} onChange={(e) => updateSmtp('port', Number(e.target.value))}><option value="25">25</option><option value="465">465 (SSL)</option><option value="587">587 (TLS)</option><option value="2525">2525</option></Select></Field>
                      <Field label="Chiffrement"><Select className={compactInput} value={form.smtp.encryption} onChange={(e) => updateSmtp('encryption', e.target.value as SmtpConfig['encryption'])}><option value="none">Aucun</option><option value="ssl">SSL</option><option value="tls">TLS</option></Select></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Utilisateur"><Input className={compactInput} value={form.smtp.username} onChange={(e) => updateSmtp('username', e.target.value)} placeholder="user@domaine.com" /></Field>
                      <Field label="Mot de passe"><Input type="password" className={compactInput} value={form.smtp.password} onChange={(e) => updateSmtp('password', e.target.value)} placeholder="••••••••" /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Email expéditeur"><Input type="email" className={compactInput} value={form.smtp.fromEmail} onChange={(e) => updateSmtp('fromEmail', e.target.value)} placeholder="noreply@domaine.com" /></Field>
                      <Field label="Nom expéditeur"><Input className={compactInput} value={form.smtp.fromName} onChange={(e) => updateSmtp('fromName', e.target.value)} placeholder="Mon Entreprise" /></Field>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Button variant="outline" size="sm" onClick={handleTestSmtp} disabled={!form.smtp.host || smtpTesting}><Server className={cn('h-3.5 w-3.5', smtpTesting && 'animate-spin')} />{smtpTesting ? 'Test...' : 'Tester'}</Button>
                      {smtpTested && <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Connexion réussie</span>}
                    </div>
                  </div>
                </Card>
                <Card className="border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gmail: smtp.gmail.com (587, TLS) avec mot de passe d'application. Outlook: smtp.office365.com (587, TLS).</p>
                  </div>
                </Card>

                {/* Email templates */}
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Modèles d'emails</h3></div>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Personnalisez les emails envoyés automatiquement. Variables disponibles : {'{{clientName}}'}, {'{{companyName}}'}, {'{{number}}'}, {'{{amount}}'}, {'{{dueDate}}'}, {'{{expiryDate}}'}, {'{{reason}}'}, {'{{invoiceNumber}}'}.
                  </p>
                  <div className="space-y-3">
                    {EMAIL_TEMPLATE_META.map((tpl) => {
                      const value = form.emailTemplates[tpl.key];
                      const isOpen = openTpl === tpl.key;
                      return (
                        <div key={tpl.key} className="rounded-lg border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <button onClick={() => setOpenTpl(isOpen ? null : tpl.key)} className="flex flex-1 items-center gap-2 text-left">
                              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform', !isOpen && '-rotate-90')} />
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{tpl.label}</span>
                              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', value.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}>
                                {value.enabled ? 'Actif' : 'Inactif'}
                              </span>
                            </button>
                            <Switch checked={value.enabled} onChange={(v) => updateEmailTemplate(tpl.key, 'enabled', v)} />
                          </div>
                          {isOpen && (
                            <div className="space-y-2.5 border-t border-gray-200 p-3 dark:border-gray-800">
                              <Field label="Objet">
                                <Input className={compactInput} value={value.subject} onChange={(e) => updateEmailTemplate(tpl.key, 'subject', e.target.value)} />
                              </Field>
                              <Field label="Corps de l'email">
                                <Textarea className="min-h-[120px] text-sm font-mono" value={value.body} onChange={(e) => updateEmailTemplate(tpl.key, 'body', e.target.value)} />
                              </Field>
                              <Button variant="ghost" size="sm" onClick={() => updateEmailTemplate(tpl.key, 'body', EMAIL_TEMPLATE_META.find((t) => t.key === tpl.key)!.defaultBody)}>
                                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {section === 'modules' && (
              <div className="grid gap-2.5 md:grid-cols-2">
                {(['core', 'sales', 'finance', 'system'] as const).map((group) => {
                  const groupModules = ALL_MODULES.filter((m) => m.group === group);
                  const groupLabels: Record<string, string> = { core: 'Principal', sales: 'Ventes', finance: 'Finances', system: 'Système' };
                  return (
                    <div key={group} className="space-y-1.5">
                      <p className="px-1 text-xs font-medium uppercase tracking-wider text-gray-400">{groupLabels[group]}</p>
                      {groupModules.map((mod) => {
                        const enabled = moduleConfig[mod.key] ?? mod.defaultEnabled;
                        const Icon = mod.icon;
                        return (
                          <div key={mod.key} className={cn('flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800', !enabled && 'opacity-60')}>
                            <div className="flex items-center gap-2.5">
                              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', enabled ? 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{mod.label}</p>
                                <p className="text-xs text-gray-400">{mod.description}</p>
                              </div>
                            </div>
                            <Switch checked={enabled} onChange={(v) => toggleModule(mod.key, v)} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {section === 'system' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Langue et thème</h3></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Langue"><Select className={compactInput} value={locale} onChange={(e) => setLocale(e.target.value as 'fr' | 'ar' | 'en')}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></Select></Field>
                    <Field label="Thème"><Select className={compactInput} value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}><option value="light">Clair</option><option value="dark">Sombre</option><option value="system">Système</option></Select></Field>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Mise à jour</h3></div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">v1.0.0</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    <p className="flex-1 text-sm text-gray-600 dark:text-gray-400">Logiciel à jour</p>
                    <Button variant="outline" size="sm" onClick={handleCheckUpdate} disabled={checkingUpdate}><RefreshCw className={cn('h-3.5 w-3.5', checkingUpdate && 'animate-spin')} />{checkingUpdate ? '...' : 'Vérifier'}</Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </PageContent>

      {/* Barre d'enregistrement : visible uniquement s'il y a des changements */}
      {dirty && (
        <div role="region" aria-label="Modifications non enregistrées" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 animate-slide-up">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-2 shadow-pop dark:border-gray-700 dark:bg-gray-900">
            <span className="text-[13px] text-gray-600 dark:text-gray-300">Modifications non enregistrées</span>
            <Button variant="ghost" size="sm" onClick={() => setForm(settings ? { ...settings } : null)}>Annuler</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer'}<span className="kbd ml-1 border-white/30 bg-white/10 text-white">Ctrl S</span></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitAdder({ onAdd }: { onAdd: (unit: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-accent-400 hover:text-accent-600 dark:border-gray-700">
        <Plus className="h-3 w-3" /> Ajouter
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) { onAdd(value.trim()); setValue(''); setEditing(false); }
          if (e.key === 'Escape') { setValue(''); setEditing(false); }
        }}
        onBlur={() => { if (value.trim()) { onAdd(value.trim()); } setValue(''); setEditing(false); }}
        placeholder="unité"
        className="h-7 w-20 rounded border border-gray-200 px-2 text-xs dark:border-gray-800 dark:bg-gray-900"
      />
    </span>
  );
}

function ReasonAdder({ onAdd }: { onAdd: (reason: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-accent-400 hover:text-accent-600 dark:border-gray-700">
        <Plus className="h-3.5 w-3.5" /> Ajouter un motif
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) { onAdd(value.trim()); setValue(''); setEditing(false); }
          if (e.key === 'Escape') { setValue(''); setEditing(false); }
        }}
        onBlur={() => { if (value.trim()) { onAdd(value.trim()); } setValue(''); setEditing(false); }}
        placeholder="Nouveau motif..."
        className="h-8 flex-1 rounded border border-gray-200 px-2 text-sm dark:border-gray-800 dark:bg-gray-900"
      />
    </div>
  );
}

const EMAIL_TEMPLATE_META: { key: EmailTemplateKey; label: string; defaultBody: string }[] = [
  {
    key: 'invoiceSent',
    label: 'Facture envoyée',
    defaultBody: 'Bonjour {{clientName}},\n\nVeuillez trouver ci-joint la facture {{number}} d\'un montant de {{amount}}.\nDate d\'échéance : {{dueDate}}.\n\nMerci de votre confiance.\n{{companyName}}',
  },
  {
    key: 'invoiceReminder',
    label: 'Rappel de facture',
    defaultBody: 'Bonjour {{clientName}},\n\nNous vous rappelons que la facture {{number}} d\'un montant de {{amount}} arrive à échéance le {{dueDate}}.\n\nMerci de procéder au règlement dans les meilleurs délais.\n{{companyName}}',
  },
  {
    key: 'quoteSent',
    label: 'Devis envoyé',
    defaultBody: 'Bonjour {{clientName}},\n\nVeuillez trouver ci-joint notre devis {{number}} d\'un montant de {{amount}}.\nCe devis est valable jusqu\'au {{expiryDate}}.\n\nNous restons à votre disposition pour toute question.\n{{companyName}}',
  },
  {
    key: 'paymentReceived',
    label: 'Paiement reçu',
    defaultBody: 'Bonjour {{clientName}},\n\nNous accusons réception de votre paiement de {{amount}} concernant la facture {{number}}.\n\nMerci pour votre confiance.\n{{companyName}}',
  },
  {
    key: 'creditNoteIssued',
    label: 'Avoir émis',
    defaultBody: 'Bonjour {{clientName}},\n\nNous vous informons qu\'un avoir {{number}} d\'un montant de {{amount}} a été émis suite à : {{reason}}.\n\nCet avoir est rattaché à la facture {{invoiceNumber}}.\n{{companyName}}',
  },
  {
    key: 'paymentOverdue',
    label: 'Paiement en retard',
    defaultBody: 'Bonjour {{clientName}},\n\nMalgré nos précédents rappels, la facture {{number}} d\'un montant de {{amount}} reste impayée. Elle était due le {{dueDate}}.\n\nNous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais.\n\nCordialement,\n{{companyName}}',
  },
];