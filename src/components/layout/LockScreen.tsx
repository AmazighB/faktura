import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut, Receipt } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AUTO_LOCK_MINUTES } from '@/utils/security';

type AuthErrorLike = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
};

function isAuthError(error: unknown): error is AuthErrorLike {
  return typeof error === 'object' && error !== null &&
    'code' in error && typeof error.code === 'string' &&
    'message' in error && typeof error.message === 'string';
}

/** Écran de verrouillage : recouvre l'application jusqu'à la saisie du mot de passe. */
export function LockScreen() {
  const { user, lockReason, unlock, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const focusInput = () => wrap.current?.querySelector('input')?.focus();

  useEffect(() => {
    focusInput();
  }, []);

  useEffect(() => {
    if (retryIn <= 0) return;
    const id = setInterval(() => setRetryIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [retryIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (busy || retryIn > 0 || !password) return;
    setBusy(true);
    setError('');
    try {
      await unlock(password);
    } catch (e) {
      if (isAuthError(e)) {
        if (e.code === 'too_many_attempts') setRetryIn(e.retryAfterSeconds ?? 60);
        setError(e.code === 'invalid_credentials' && e.remainingAttempts !== undefined ? `${e.message} ${e.remainingAttempts} essai(s) restant(s).` : e.message);
      } else {
        setError('Déverrouillage impossible.');
      }
      setPassword('');
      setBusy(false);
      setTimeout(focusInput, 0);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Session verrouillée" className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900"><Receipt className="h-5 w-5" /></div>
          <span className="text-lg font-semibold">Factura</span>
        </div>
        <div className="surface p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-xl font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
            {(user?.name ?? '?').charAt(0).toUpperCase()}
          </div>
          <h1 className="mt-3 flex items-center justify-center gap-1.5 text-base font-semibold"><Lock className="h-4 w-4 text-gray-400" />Session verrouillée</h1>
          <p className="mt-1 text-sm text-gray-500">{user?.name} · {user?.email}</p>
          <p className="mt-3 text-xs text-gray-500">
            {lockReason === 'auto' ? `Verrouillée après ${AUTO_LOCK_MINUTES} minutes d'inactivité. ` : ''}
            Saisissez votre mot de passe pour reprendre où vous en étiez.
          </p>

          <div ref={wrap} className="mt-4 text-left" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete="current-password" disabled={retryIn > 0} aria-label="Mot de passe" />
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{retryIn > 0 ? `Trop de tentatives. Réessayez dans ${retryIn} s.` : error}</p>}
          <Button className="mt-4 w-full" size="lg" onClick={submit} disabled={busy || retryIn > 0 || !password}>
            {busy ? 'Vérification…' : 'Déverrouiller'}
          </Button>
          <button onClick={() => { logout(); navigate('/login'); }} className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <LogOut className="h-3.5 w-3.5" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}