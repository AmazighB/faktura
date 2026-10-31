export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_disabled'
  | 'too_many_attempts'
  | 'weak_password'
  | 'wrong_current_password'
  | 'same_password'
  | 'not_found';

/** Erreur d'authentification typée : le backend renverra les mêmes codes. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly retryAfterSeconds?: number;
  readonly remainingAttempts?: number;

  constructor(code: AuthErrorCode, message: string, options?: { retryAfterSeconds?: number; remainingAttempts?: number }) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.remainingAttempts = options?.remainingAttempts;
  }
}