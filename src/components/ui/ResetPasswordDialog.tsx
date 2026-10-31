import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/app/providers/AuthContext';
import { services } from '@/services';
import { generatePassword, validatePassword } from '@/utils/password';
import type { User } from '@/types';

interface ResetPasswordDialogProps {
  user: User | null;
  onClose: () => void;
}

/** Réinitialisation du mot de passe d'un utilisateur par un administrateur. */
export function ResetPasswordDialog({ user, onClose }: ResetPasswordDialogProps) {
  const { push } = useToast();
  const { user: actor } = useAuth();
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) { setPassword(generatePassword()); setError(''); setCopied(false); }
  }, [user]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      push('warning', 'Copie impossible', 'Sélectionnez le mot de passe et copiez-le manuellement.');
    }
  };

  const submit = async () => {
    if (!user || saving) return;
    const weak = validatePassword(password);
    if (weak) return setError(weak);
    setSaving(true);
    setError('');
    try {
      await services.auth.setPassword(user.id, password);
      if (actor) services.activityLogs.log({ userId: actor.id, userName: actor.name, action: 'Mot de passe réinitialisé', entity: 'Utilisateur', entityId: user.id, details: user.email });
      push('success', 'Mot de passe réinitialisé', `Transmettez-le à ${user.name}.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Réinitialisation impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!user}
      onClose={onClose}
      title={user ? `Réinitialiser le mot de passe de ${user.name}` : 'Réinitialiser le mot de passe'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <Field label="Nouveau mot de passe" required hint="Transmettez-le à l'utilisateur : il pourra le modifier depuis son profil.">
          <PasswordInput value={password} onChange={(e) => { setPassword(e.target.value); setCopied(false); }} onGenerate={() => { setPassword(generatePassword()); setCopied(false); }} autoComplete="new-password" />
          <PasswordStrength password={password} />
        </Field>
        <Button variant="outline" size="sm" onClick={copy} disabled={!password}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copié' : 'Copier le mot de passe'}
        </Button>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
      </div>
    </Dialog>
  );
}