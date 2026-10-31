export const MIN_PASSWORD_LENGTH = 8;

/** Règle de mot de passe : 8 caractères minimum, au moins une lettre et un chiffre. Renvoie un message d'erreur ou null. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  return null;
}

/** Indicateur de robustesse (0 à 4) pour l'interface. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (validatePassword(password)) score = Math.min(score, 1);
  const labels = ['Très faible', 'Faible', 'Correct', 'Bon', 'Excellent'] as const;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: s, label: labels[s] };
}

/** Mot de passe aléatoire lisible (sans caractères ambigus), garanti conforme à la règle. */
export function generatePassword(length = 12): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string, byte: number) => set[byte % set.length];
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const chars = Array.from(bytes, (b) => pick(all, b));
  chars[0] = pick(letters, bytes[0]);
  chars[length - 1] = pick(digits, bytes[length - 1]);
  return chars.join('');
}