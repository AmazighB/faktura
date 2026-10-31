import { persistentStore } from '@/mocks/helpers';
import { mockUsers } from '@/mocks/data';

/**
 * Identifiants de connexion (mock). Les mots de passe ne sont jamais stockés en clair :
 * PBKDF2-SHA256 avec sel aléatoire, comme le fera le backend.
 */
export interface Credential {
  userId: string;
  salt: string;
  hash: string;
  iterations: number;
  updatedAt: string;
  failedAttempts: number;
  lockedUntil?: number;
}

const ITERATIONS = 100_000;
export const DEMO_PASSWORD = 'demo1234';

const store = persistentStore<Credential>('credentials', []);

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => Uint8Array.from(hex.match(/.{2}/g) ?? [], (h) => parseInt(h, 16));

async function derive(password: string, saltHex: string, iterations: number): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Le chiffrement du navigateur (Web Crypto) est indisponible : utilisez localhost ou https.');
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations }, key, 256);
  return toHex(bits);
}

export function getCredential(userId: string): Credential | undefined {
  return store.items.find((c) => c.userId === userId);
}

/** Crée ou remplace le mot de passe d'un utilisateur (réinitialise aussi le blocage). */
export async function createCredential(userId: string, password: string): Promise<void> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derive(password, salt, ITERATIONS);
  const next: Credential = { userId, salt, hash, iterations: ITERATIONS, updatedAt: new Date().toISOString(), failedAttempts: 0 };
  const idx = store.items.findIndex((c) => c.userId === userId);
  if (idx === -1) store.items.push(next);
  else store.items[idx] = next;
}

export function removeCredential(userId: string): void {
  store.items = store.items.filter((c) => c.userId !== userId);
}

export async function checkPassword(credential: Credential, password: string): Promise<boolean> {
  const hash = await derive(password, credential.salt, credential.iterations);
  // comparaison à temps constant
  let diff = hash.length ^ credential.hash.length;
  for (let i = 0; i < hash.length && i < credential.hash.length; i++) diff |= hash.charCodeAt(i) ^ credential.hash.charCodeAt(i);
  return diff === 0;
}

let seeding: Promise<void> | null = null;

/** Comptes de démonstration : mot de passe initial `demo1234` (créé au premier usage). */
export function ensureSeedCredentials(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      for (const u of mockUsers) {
        if (!getCredential(u.id)) await createCredential(u.id, DEMO_PASSWORD);
      }
    })().finally(() => {
      seeding = null;
    });
  }
  return seeding;
}