function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function matchesSearch(target: string, search?: string): boolean {
  if (!search) return true;
  return target.toLowerCase().includes(search.toLowerCase());
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ── Persistance locale (en attendant le backend Tauri/Rust) ──────────────────
// Les données de démonstration sont chargées une fois, puis les modifications
// sont conservées dans le navigateur. Incrémenter DATA_VERSION pour repartir des données de départ.
const DATA_VERSION = 'v1';
const PREFIX = `faktura.data.${DATA_VERSION}.`;
const registry: { key: string; get: () => unknown }[] = [];

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function load<T>(key: string, seed: T): T {
  if (hasStorage()) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* données illisibles : on repart des données de départ */
    }
  }
  return clone(seed);
}

/** Collection persistante : `store.items` est la liste courante. */
function persistentStore<T>(key: string, seed: T[]): { items: T[] } {
  const store = { items: load<T[]>(key, seed) };
  registry.push({ key, get: () => store.items });
  return store;
}

/** Valeur persistante unique (ex. réglages). */
function persistentValue<T>(key: string, seed: T): { value: T } {
  const store = { value: load<T>(key, seed) };
  registry.push({ key, get: () => store.value });
  return store;
}

function saveAll(): void {
  if (!hasStorage()) return;
  for (const r of registry) {
    try {
      localStorage.setItem(PREFIX + r.key, JSON.stringify(r.get()));
    } catch {
      /* quota dépassé : on ignore, les données restent en mémoire */
    }
  }
}

/** Efface les données enregistrées et recharge l'application avec les données de départ. */
function resetPersistedData(): void {
  if (!hasStorage()) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith('faktura.data.'))
    .forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}

export { delay, uid, matchesSearch, clone, persistentStore, persistentValue, saveAll, resetPersistedData };