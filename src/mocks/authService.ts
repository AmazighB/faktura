import type { User } from '@/types';
import type { AuthService, AuthSession } from '@/services/types';
import { delay, clone } from '@/mocks/helpers';
import { userService } from '@/mocks/miscServices';
import { checkPassword, createCredential, ensureSeedCredentials, getCredential, type Credential } from '@/mocks/credentials';
import { validatePassword } from '@/utils/password';
import { LOCKOUT_SECONDS, MAX_FAILED_ATTEMPTS } from '@/utils/security';

const normalize = (email: string) => email.trim().toLowerCase();
const INVALID = 'Identifiants incorrects.';

class AuthError extends Error {
  readonly code: string;
  readonly remainingAttempts?: number;
  readonly retryAfterSeconds?: number;

  constructor(code: string, message: string, details?: { remainingAttempts?: number; retryAfterSeconds?: number }) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.remainingAttempts = details?.remainingAttempts;
    this.retryAfterSeconds = details?.retryAfterSeconds;
  }
}

class MockAuthService implements AuthService {
  /** Essais échoués pour des adresses inconnues (même blocage que pour un compte réel, sans révéler lequel existe). */
  private unknown = new Map<string, { count: number; lockedUntil?: number }>();

  private lockedMessage(until: number): AuthError {
    const seconds = Math.max(1, Math.ceil((until - Date.now()) / 1000));
    return new AuthError('too_many_attempts', `Trop de tentatives. Réessayez dans ${seconds} s.`, { retryAfterSeconds: seconds });
  }

  private assertNotLocked(credential: Credential | undefined, emailKey?: string) {
    const until = credential?.lockedUntil ?? (emailKey ? this.unknown.get(emailKey)?.lockedUntil : undefined);
    if (until && until > Date.now()) throw this.lockedMessage(until);
  }

  /** Enregistre un échec et lève l'erreur adaptée (identifiants incorrects, ou blocage au 5e essai). */
  private registerFailure(credential: Credential | undefined, emailKey: string, message: string, code: 'invalid_credentials' | 'wrong_current_password'): never {
    const entry = credential ?? this.unknown.get(emailKey) ?? { count: 0 };
    const count = ('failedAttempts' in entry ? entry.failedAttempts : entry.count) + 1;
    if (count >= MAX_FAILED_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_SECONDS * 1000;
      if (credential) {
        credential.failedAttempts = 0;
        credential.lockedUntil = until;
      } else {
        this.unknown.set(emailKey, { count: 0, lockedUntil: until });
      }
      throw this.lockedMessage(until);
    }
    if (credential) credential.failedAttempts = count;
    else this.unknown.set(emailKey, { count });
    throw new AuthError(code, message, { remainingAttempts: MAX_FAILED_ATTEMPTS - count });
  }

  private resetFailures(credential: Credential) {
    credential.failedAttempts = 0;
    credential.lockedUntil = undefined;
  }

  async login(email: string, password: string): Promise<AuthSession> {
    await ensureSeedCredentials();
    const key = normalize(email);
    const user = userService._internalList().find((u) => u.email.toLowerCase() === key);
    const credential = user ? getCredential(user.id) : undefined;
    this.assertNotLocked(credential, key);
    if (!user || !credential) this.registerFailure(undefined, key, INVALID, 'invalid_credentials');
    if (!(await checkPassword(credential!, password))) this.registerFailure(credential, key, INVALID, 'invalid_credentials');
    if (!user!.active) throw new AuthError('account_disabled', 'Ce compte est désactivé. Contactez votre administrateur.');
    this.resetFailures(credential!);
    userService._touchLogin(user!.id);
    const fresh = userService._internalList().find((u) => u.id === user!.id)!;
    return delay({ user: clone(fresh) });
  }

  async verifyPassword(userId: string, password: string): Promise<void> {
    await ensureSeedCredentials();
    const user = userService._internalList().find((u) => u.id === userId);
    if (!user) throw new AuthError('not_found', 'Utilisateur introuvable.');
    if (!user.active) throw new AuthError('account_disabled', 'Ce compte est désactivé. Contactez votre administrateur.');
    const credential = getCredential(userId);
    this.assertNotLocked(credential);
    if (!credential || !(await checkPassword(credential, password))) {
      this.registerFailure(credential, user.email.toLowerCase(), 'Mot de passe incorrect.', 'invalid_credentials');
    }
    this.resetFailures(credential!);
    return delay(undefined);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.verifyPassword(userId, currentPassword);
    } catch (e) {
      if (e instanceof AuthError && e.code === 'invalid_credentials') {
        throw new AuthError('wrong_current_password', 'Le mot de passe actuel est incorrect.', { remainingAttempts: e.remainingAttempts });
      }
      throw e;
    }
    const weak = validatePassword(newPassword);
    if (weak) throw new AuthError('weak_password', weak);
    if (newPassword === currentPassword) throw new AuthError('same_password', 'Le nouveau mot de passe doit être différent de l\'actuel.');
    await createCredential(userId, newPassword);
    return delay(undefined);
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = userService._internalList().find((u) => u.id === userId);
    if (!user) throw new AuthError('not_found', 'Utilisateur introuvable.');
    const weak = validatePassword(newPassword);
    if (weak) throw new AuthError('weak_password', weak);
    await createCredential(userId, newPassword);
    return delay(undefined);
  }

  async getUser(userId: string): Promise<User | null> {
    const user = userService._internalList().find((u) => u.id === userId);
    return delay(user ? clone(user) : null);
  }
}

export const authService = new MockAuthService();