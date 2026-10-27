import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { services } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/app/providers/ToastProvider';
import { toISODate } from '@/utils/format';
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

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier le client' : 'Nouveau client'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold">Identité</h3>
            </div>
            <div className="space-y-4 p-5">
              <Field label="Nom / Raison sociale" required>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nom du client" />
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={(e) => update('type', e.target.value as ClientType)}>
                  <option value="entreprise">Entreprise</option>
                  <option value="particulier">Particulier</option>
                </Select>
              </Field>
              {groups.length > 0 && (
                <Field label="Groupe (facultatif)">
                  <Select value={form.groupId ?? ''} onChange={(e) => update('groupId', e.target.value)}>
                    <option value="">— Aucun —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="NIF"><Input value={form.nif} onChange={(e) => update('nif', e.target.value)} /></Field>
                <Field label="NIS"><Input value={form.nis} onChange={(e) => update('nis', e.target.value)} /></Field>
                <Field label="RC"><Input value={form.rc} onChange={(e) => update('rc', e.target.value)} /></Field>
                <Field label="AI"><Input value={form.ai} onChange={(e) => update('ai', e.target.value)} /></Field>
              </div>
              <Field label="Adresse">
                <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Wilaya"><Input value={form.wilaya} onChange={(e) => update('wilaya', e.target.value)} /></Field>
                <Field label="Commune"><Input value={form.commune} onChange={(e) => update('commune', e.target.value)} /></Field>
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <h3 className="text-sm font-semibold">Contact</h3>
              </div>
              <div className="space-y-4 p-5">
                <Field label="Téléphone"><Input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></Field>
                <Field label="Contact secondaire"><Input value={form.secondaryContact} onChange={(e) => update('secondaryContact', e.target.value)} /></Field>
              </div>
            </Card>

            <Card>
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <h3 className="text-sm font-semibold">Informations commerciales</h3>
              </div>
              <div className="space-y-4 p-5">
                <Field label="Conditions de paiement"><Input value={form.paymentConditions} onChange={(e) => update('paymentConditions', e.target.value)} placeholder="ex: 30 jours" /></Field>
                <Field label="Remise par défaut (%)"><Input type="number" value={form.defaultDiscount} onChange={(e) => update('defaultDiscount', Number(e.target.value))} /></Field>
                <Field label="Notes"><Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field>
              </div>
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
