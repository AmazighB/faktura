import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';
import { PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { services } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/app/providers/ToastContext';
import type { Client, ClientType } from '@/types';

const empty: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'> = {
  name: '', type: 'entreprise', nif: '', nis: '', rc: '', ai: '',
  address: '', wilaya: '', commune: '', phone: '', email: '', secondaryContact: '',
  paymentConditions: '', defaultDiscount: 0, groupId: '', notes: '',
};

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const isEdit = Boolean(id);
  const { data: existing } = useAsync(() => (id ? services.clients.get(id) : Promise.resolve(null)), [id]);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const groups = settings?.clientGroups ?? [];
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm({ ...empty, ...existing });
  }, [existing]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      push('error', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await services.clients.update(id, form);
        push('success', 'Client modifié');
        navigate(`/clients/${id}`);
      } else {
        const created = await services.clients.create(form);
        push('success', 'Client créé');
        navigate(`/clients/${created.id}`);
      }
    } catch {
      push('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) { e.preventDefault(); void handleSave(); }
    else if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); void handleSave(); }
  };

  return (
    <PageContent className="pt-6">
      <div className="mx-auto max-w-2xl" onKeyDown={onKey}>
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
        <h1 className="text-[26px] font-semibold leading-tight">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
        <p className="mt-1 text-sm text-gray-500">{isEdit ? 'Mettez à jour les informations du client.' : "Seul le nom est obligatoire. Vous pourrez compléter la fiche plus tard."}</p>

        {/* L'essentiel d'abord */}
        <Card className="mt-6">
          <div className="space-y-4 p-5">
            <Field label="Nom / Raison sociale" required>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Ex. SARL Atlas" autoFocus={!isEdit} />
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">Type</p>
              <div className="inline-flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800/70" role="radiogroup" aria-label="Type de client">
                {([['entreprise', 'Entreprise'], ['particulier', 'Particulier']] as [ClientType, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={form.type === k} onClick={() => update('type', k)}
                    className={cn('rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors', form.type === k ? 'bg-white shadow-card dark:bg-gray-950' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400')}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Téléphone"><Input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></Field>
            </div>
          </div>
        </Card>

        {/* Le reste, à la demande */}
        <div className="mt-3 space-y-3">
          <Section title="Adresse" hint="Wilaya, commune" defaultOpen={isEdit}>
            <Field label="Adresse"><Input value={form.address} onChange={(e) => update('address', e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Wilaya"><Input value={form.wilaya} onChange={(e) => update('wilaya', e.target.value)} /></Field>
              <Field label="Commune"><Input value={form.commune} onChange={(e) => update('commune', e.target.value)} /></Field>
            </div>
          </Section>
          <Section title="Identifiants fiscaux" hint="NIF, NIS, RC, AI" defaultOpen={isEdit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="NIF"><Input value={form.nif} onChange={(e) => update('nif', e.target.value)} /></Field>
              <Field label="NIS"><Input value={form.nis} onChange={(e) => update('nis', e.target.value)} /></Field>
              <Field label="RC"><Input value={form.rc} onChange={(e) => update('rc', e.target.value)} /></Field>
              <Field label="AI"><Input value={form.ai} onChange={(e) => update('ai', e.target.value)} /></Field>
            </div>
          </Section>
          <Section title="Conditions et notes" hint="Paiement, remise, contact secondaire" defaultOpen={isEdit}>
            {groups.length > 0 && (
              <Field label="Groupe">
                <Select value={form.groupId ?? ''} onChange={(e) => update('groupId', e.target.value)}>
                  <option value="">Aucun</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Conditions de paiement"><Input value={form.paymentConditions} onChange={(e) => update('paymentConditions', e.target.value)} placeholder="ex. 30 jours" /></Field>
              <Field label="Remise par défaut (%)"><Input type="number" value={form.defaultDiscount} onChange={(e) => update('defaultDiscount', Number(e.target.value))} /></Field>
            </div>
            <Field label="Contact secondaire"><Input value={form.secondaryContact} onChange={(e) => update('secondaryContact', e.target.value)} /></Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field>
          </Section>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="hidden text-xs text-gray-400 sm:block"><span className="kbd">Entrée</span> ou <span className="kbd">Ctrl S</span> pour enregistrer</span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le client'}</Button>
          </div>
        </div>
      </div>
    </PageContent>
  );
}

/** Section repliable : on ne montre que ce dont on a besoin maintenant. */
function Section({ title, hint, defaultOpen, children }: { title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="surface group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium">{title} {hint && <span className="ml-1 font-normal text-gray-400">{hint}</span>}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-gray-200 p-5 dark:border-gray-800">{children}</div>
    </details>
  );
}