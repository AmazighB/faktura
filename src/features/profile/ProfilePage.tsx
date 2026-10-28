import { useState } from 'react';
import { User, Mail, Shield, Check, KeyRound, LogOut, Bell, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/app/providers/AuthContext';
import { useApp } from '@/app/providers/AppContext';
import { useConfirm } from '@/app/providers/ConfirmContext';
import { userRoleLabels } from '@/utils/labels';
import { cn } from '@/utils/cn';

export default function ProfilePage() {
  const { push } = useToast();
  const { user, logout } = useAuth();
  const { theme, setTheme, locale, setLocale } = useApp();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifOverdue, setNotifOverdue] = useState(true);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { push('error', 'Nom et email obligatoires'); return; }
    setSaving(true);
    setTimeout(() => { setSaving(false); push('success', 'Profil mis à jour'); }, 600);
  };

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Déconnexion', message: 'Voulez-vous vraiment vous déconnecter ?', confirmLabel: 'Déconnexion', variant: 'danger' });
    if (ok) { logout(); navigate('/login'); }
  };

  return (
    <div>
      <PageHeader title="Mon profil" description="Vos informations et préférences"
        actions={<Button size="sm" onClick={handleSave} disabled={saving}><Check className="h-3.5 w-3.5" /> {saving ? '...' : 'Enregistrer'}</Button>}
      />
      <PageContent>
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Identity — compact, spans 1 column */}
            <Card className="md:col-span-1">
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-xl font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                  {(name || '?').charAt(0).toUpperCase()}
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name || '—'}</h2>
                <Badge className="bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">{userRoleLabels[user?.role ?? 'employe']}</Badge>
                <p className="flex items-center gap-1 text-xs text-gray-400"><Mail className="h-3 w-3" /> {email || '—'}</p>
                <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => push('info', 'Mot de passe', 'Un email de réinitialisation sera envoyé')}>
                  <KeyRound className="h-3.5 w-3.5" /> Mot de passe
                </Button>
              </div>
            </Card>

            {/* Edit fields + preferences — spans 2 columns */}
            <div className="md:col-span-2 space-y-4">
              <Card className="p-4">
                <div className="mb-3 flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Coordonnées</h3></div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Nom complet"><Input className="text-sm" value={name} onChange={(e) => setName(e.target.value)} /></Field>
                  <Field label="Email"><Input type="email" className="text-sm" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                </div>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Palette className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Apparence</h3></div>
                  <div className="space-y-2.5">
                    <Field label="Langue"><Select className="text-sm" value={locale} onChange={(e) => setLocale(e.target.value as 'fr' | 'ar' | 'en')}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></Select></Field>
                    <Field label="Thème"><Select className="text-sm" value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}><option value="light">Clair</option><option value="dark">Sombre</option><option value="system">Système</option></Select></Field>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-gray-400" /><h3 className="text-sm font-semibold">Notifications</h3></div>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-300">Par email</span><Switch checked={notifEmail} onChange={setNotifEmail} /></label>
                    <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-300">Factures en retard</span><Switch checked={notifOverdue} onChange={setNotifOverdue} /></label>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Logout — compact single row */}
          <Card className="mt-4 flex items-center justify-between border-red-200 p-4 dark:border-red-900/30">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-red-400" /><p className="text-sm text-gray-500">Déconnexion de votre compte</p></div>
            <Button variant="outline" size="sm" onClick={handleLogout} className={cn('border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20')}>
              <LogOut className="h-3.5 w-3.5" /> Déconnexion
            </Button>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}