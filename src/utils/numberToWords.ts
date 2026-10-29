const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0 à 99. `final` : « quatre-vingts » prend un s seulement s'il n'est suivi de rien (ou d'un nom : millions, milliards). */
function below100(n: number, final: boolean): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) {
    // soixante-dix, quatre-vingt-dix : on s'appuie sur 60 / 80 + 10..19
    const base = t === 7 ? 'soixante' : 'quatre-vingt';
    const rest = 10 + u;
    return t === 7 && u === 1 ? `${base} et onze` : `${base}-${UNITS[rest]}`;
  }
  if (t === 8) return u === 0 ? (final ? 'quatre-vingts' : 'quatre-vingt') : `quatre-vingt-${UNITS[u]}`;
  if (u === 0) return TENS[t];
  return u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
}

/** 0 à 999. `final` : « cent » et « quatre-vingts » prennent un s s'ils ne sont suivis de rien (deux cents, mais deux cent mille). */
function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 && final ? 's' : ''}`);
  if (r > 0) parts.push(below100(r, final));
  return parts.join(' ');
}

/** Entier positif en lettres, en français (jusqu'aux milliards). */
export function integerToWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'zéro';
  const scales: [number, string, string][] = [
    [1_000_000_000, 'milliard', 'milliards'],
    [1_000_000, 'million', 'millions'],
  ];
  const out: string[] = [];
  for (const [size, one, many] of scales) {
    const q = Math.floor(n / size);
    if (q > 0) {
      out.push(`${below1000(q, true)} ${q > 1 ? many : one}`); // million(s) est un nom : « deux cents millions »
      n %= size;
    }
  }
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    out.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`);
    n %= 1000;
  }
  if (n > 0) out.push(below1000(n, true));
  return out.join(' ');
}

const CURRENCIES: Record<string, [string, string, string, string]> = {
  DA: ['dinar algérien', 'dinars algériens', 'centime', 'centimes'],
  DZD: ['dinar algérien', 'dinars algériens', 'centime', 'centimes'],
  EUR: ['euro', 'euros', 'centime', 'centimes'],
  USD: ['dollar', 'dollars', 'cent', 'cents'],
};

/** « Cent dix-neuf mille dinars algériens et cinquante centimes » */
export function amountInWords(amount: number, currency = 'DA'): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const whole = Math.floor(rounded);
  const cents = Math.round((rounded - whole) * 100);
  const [one, many, centOne, centMany] = CURRENCIES[currency.toUpperCase()] ?? [currency, currency, 'centime', 'centimes'];
  let text = `${integerToWords(whole)} ${whole > 1 ? many : one}`;
  // « million(s) » et « milliard(s) » se lient à l'unité monétaire par « de »
  if (whole >= 1_000_000 && whole % 1_000_000 === 0) text = text.replace(/ (dinars?|euros?|dollars?)/, ' de $1');
  if (cents > 0) text += ` et ${integerToWords(cents)} ${cents > 1 ? centMany : centOne}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}