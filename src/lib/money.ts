/**
 * Money helpers.
 *
 * Everything is stored in minor units (cents) as integers. Floats and money
 * are a classic way to end up 3p off and never know why.
 */

export const toCents = (major: number): number => Math.round(major * 100);
export const toMajor = (cents: number): number => cents / 100;

const symbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  MAD: 'DH',
  AED: 'AED',
  INR: '₹',
  CHF: 'CHF',
  SEK: 'kr',
  NGN: '₦',
  ZAR: 'R',
  BRL: 'R$',
  MXN: 'MX$',
};

export const currencySymbol = (code: string): string => symbols[code] ?? code;

/** `$1,240.50`. Set `compact` for `$1.2k` on tight surfaces. */
export function formatMoney(
  cents: number,
  currency = 'USD',
  opts: { compact?: boolean; signed?: boolean; hideSymbol?: boolean } = {}
): string {
  const { compact = false, signed = false, hideSymbol = false } = opts;
  const sym = hideSymbol ? '' : currencySymbol(currency);
  const negative = cents < 0;
  const abs = Math.abs(cents);

  let body: string;
  if (compact && abs >= 100_000_00) {
    body = `${trim(abs / 100_000_00)}m`;
  } else if (compact && abs >= 1_000_00) {
    body = `${trim(abs / 1_000_00)}k`;
  } else {
    body = (abs / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const sign = negative ? '-' : signed ? '+' : '';
  return `${sign}${sym}${body}`;
}

const trim = (n: number): string =>
  n.toFixed(1).replace(/\.0$/, '');

/** Parses whatever the keypad produced into cents. Tolerates `1,234.5` and `12.`. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
