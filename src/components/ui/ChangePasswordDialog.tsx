import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useToast } from '@/app/providers/ToastContext';
import { services } from '@/services';
import { validatePassword } from '@/utils/password';

interface AuthErrorLike {
  code: string;
  message: string;
  remainingAttempts?: number;
}

function isAuthError(error: unknown): error is AuthErrorLike {
  return typeof error === 'object' && error !== null
    && 'code' in error && typeof error.code === 'string'
    && 'message' in error && typeof error.message === 'string';
}

interface ChangePasswordDialogProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

/** Changement de mot de passe par l'utilisateur lui-même (le mot de passe actuel est vérifié). */
export function ChangePasswordDialog({ open, userId, onClose }: ChangePasswordDialogProps) {
  const { push } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setCurrent(''); setNext(''); setConfirm(''); setError(''); }
  }, [open]);

  const submit = async () => {
    if (saving) return;
    setError('');
    if (!current) return setError('Saisissez votre mot de passe actuel.');
    const weak = validatePassword(next);
    if (weak) return setError(weak);
    if (next !== confirm) return setError('La confirmation ne correspond pas au nouveau mot de passe.');
    setSaving(true);
    try {
      await services.auth.changePassword(userId, current, next);
      push('success', 'Mot de passe modifié');
      onClose();
    } catch (e) {
      if (isAuthError(e)) {
        const left = e.code === 'wrong_current_password' && e.remainingAttempts !== undefined ? ` (${e.remainingAttempts} essai(s) restant(s))` : '';
        setError(e.message + left);
      } else {
        setError('Modification impossible.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Changer le mot de passe"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Enregistrement…' : 'Modifier le mot de passe'}</Button>
        </>
      }
    >
      <div className="space-y-4 p-5" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}>
        <Field label="Mot de passe actuel" required>
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
        </Field>
        <Field label="Nouveau mot de passe" required hint="8 caractères minimum, avec au moins une lettre et un chiffre.">
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          <PasswordStrength password={next} />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" required>
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
      </div>
    </Dialog>
  );
}