import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser, type LockReason } from './AuthContext';
import { services } from '@/services';
import type { User } from '@/types';
import { LAST_ACTIVITY_KEY, LOCKED_KEY } from '@/utils/security';

const STORAGE_KEY = 'factura.auth';

const toAuthUser = (u: User): AuthUser => ({ id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions });

function readSession(): AuthUser | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<AuthUser>;
      if (parsed && typeof parsed.id === 'string') return parsed as AuthUser; // les sessions anciennes (sans id) sont ignorées
    } catch {
      /* session illisible */
    }
  }
  return null;
}

function writeSession(user: AuthUser, remember: boolean) {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LOCKED_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSession);
  const [lockReason, setLockReason] = useState<LockReason | null>(() =>
    readSession() ? ((localStorage.getItem(LOCKED_KEY) as LockReason | null) ?? null) : null,
  );
  const userRef = useRef(user);
  userRef.current = user;

  const log = useCallback((u: AuthUser, action: string, details?: string) => {
    services.activityLogs.log({ userId: u.id, userName: u.name, action, entity: 'Session', entityId: u.id, details });
  }, []);

  const logout = useCallback(() => {
    const u = userRef.current;
    if (u) log(u, 'Déconnexion');
    clearSession();
    setUser(null);
    setLockReason(null);
  }, [log]);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      const { user: found } = await services.auth.login(email, password);
      const authUser = toAuthUser(found);
      writeSession(authUser, remember);
      localStorage.removeItem(LOCKED_KEY);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setUser(authUser);
      setLockReason(null);
      log(authUser, 'Connexion');
    },
    [log],
  );

  const lock = useCallback(
    (reason: LockReason = 'manual') => {
      const u = userRef.current;
      if (!u) return;
      localStorage.setItem(LOCKED_KEY, reason);
      setLockReason(reason);
      log(u, reason === 'auto' ? 'Verrouillage automatique' : 'Verrouillage de la session');
    },
    [log],
  );

  const unlock = useCallback(
    async (password: string) => {
      const u = userRef.current;
      if (!u) return;
      await services.auth.verifyPassword(u.id, password); // lève une AuthError si le mot de passe est incorrect
      localStorage.removeItem(LOCKED_KEY);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setLockReason(null);
      log(u, 'Déverrouillage de la session');
    },
    [log],
  );

  const refreshUser = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    const fresh = await services.auth.getUser(u.id);
    if (!fresh || !fresh.active) {
      logout();
      return;
    }
    const authUser = toAuthUser(fresh);
    writeSession(authUser, localStorage.getItem(STORAGE_KEY) !== null);
    setUser(authUser);
  }, [logout]);

  // Au démarrage : le compte existe-t-il encore et est-il toujours actif ? (rôle et droits à jour)
  const userId = user?.id;
  useEffect(() => {
    if (userId) void refreshUser();
  }, [userId, refreshUser]);

  // Synchronisation entre onglets : verrouillage et déconnexion
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCKED_KEY) setLockReason((e.newValue as LockReason | null) ?? null);
      if (e.key === STORAGE_KEY && !e.newValue && !sessionStorage.getItem(STORAGE_KEY)) setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, locked: !!user && lockReason !== null, lockReason: user ? lockReason : null, lock, unlock, refreshUser }),
    [user, lockReason, login, logout, lock, unlock, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}