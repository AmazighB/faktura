import type { NumberingConfig } from '@/types';

export type DocumentKind = 'invoice' | 'quote' | 'creditNote';

/** Prochain numéro d'une série : plus grand numéro existant avec ce préfixe + 1 (jamais le nombre de documents). */
export function nextSequentialNumber(existing: string[], head: string, pad = 4, start = 1): string {
  let max = 0;
  for (const n of existing) {
    if (!n.startsWith(head)) continue;
    const tail = n.slice(head.length);
    if (/^\d+$/.test(tail)) max = Math.max(max, Number(tail));
  }
  return head + String(Math.max(max + 1, start || 1)).padStart(pad || 4, '0');
}

/** Numéro de document selon les réglages (préfixe, numéro de départ, longueur, année). */
export function nextDocumentNumber(
  existing: string[],
  config: NumberingConfig,
  kind: DocumentKind,
  now: Date = new Date(),
): string {
  const prefix = config[`${kind}Prefix` as keyof NumberingConfig] as string;
  const start = config[`${kind}Start` as keyof NumberingConfig] as number;
  const pad = config[`${kind}Pad` as keyof NumberingConfig] as number;
  const head = config.useYear ? `${prefix}-${now.getFullYear()}-` : `${prefix}-`;
  return nextSequentialNumber(existing, head, pad, start);
}