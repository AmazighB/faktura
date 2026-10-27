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

export { delay, uid, matchesSearch, clone };
