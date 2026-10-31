import { createContext, useContext } from 'react';
import type { User } from '@/types';

export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'permissions'>;
export type LockReason = 'manual' | 'auto';

export interface AuthContextValue {
  user: AuthUser | null;
  /** `remember` : conserve la session à la fermeture du navigateur (sinon, elle s'arrête avec l'onglet). */
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  locked: boolean;
  lockReason: LockReason | null;
  lock: (reason?: LockReason) => void;
  /** Vérifie le mot de passe ; lève une AuthError si incorrect ou si trop d'essais. */
  unlock: (password: string) => Promise<void>;
  /** Recharge l'utilisateur depuis le serveur (après modification du profil). */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}