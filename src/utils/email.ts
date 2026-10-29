/** Remplace les variables {{clientName}}, {{number}}… d'un modèle d'e-mail. */
export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/** Lien mailto: ouvrant la messagerie de l'utilisateur avec le message prêt à envoyer. */
export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}