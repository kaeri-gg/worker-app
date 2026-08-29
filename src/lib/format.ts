const CURRENCY_SYMBOLS: Record<string, string> = {
  GEL: '₾',
  USD: '$',
  EUR: '€',
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded.toFixed(2)} ${symbol}`;
}

export function formatKg(kg: number, unit: string = 'kg'): string {
  const rounded = Math.round(kg * 100) / 100;
  return `${rounded.toFixed(2)} ${unit}`;
}

export function formatKgShort(kg: number): string {
  const rounded = Math.round(kg * 100) / 100;
  return rounded.toString();
}

export function formatTime(ts: number, locale = 'en-GB'): string {
  return new Date(ts).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(ts: number | string, locale = 'en-GB'): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}
