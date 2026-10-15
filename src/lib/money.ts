/** Decimal places per currency; FinStack amounts are integers in minor units. */
const MINOR_UNITS: Record<string, number> = { JPY: 0 };

/** 150050, "NGN" -> "₦1,500.50". Exact: no floating-point division. */
export function formatMoney(minor: number, currency: string): string {
  const exponent = MINOR_UNITS[currency] ?? 2;
  const negative = minor < 0;
  const digits = Math.abs(Math.trunc(minor)).toString().padStart(exponent + 1, '0');
  const whole = digits.slice(0, digits.length - exponent) || '0';
  const fraction = exponent > 0 ? digits.slice(-exponent) : '';
  const grouped = BigInt(whole).toLocaleString('en-US');
  const symbol = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value;
  return `${negative ? '-' : ''}${symbol ?? `${currency} `}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/**
 * What a person typed ("1,500.50") -> minor units (150050), exactly. Null
 * for anything that isn't a positive amount the currency can represent:
 * money is never rounded.
 */
export function parseAmount(input: string, currency: string): number | null {
  const exponent = MINOR_UNITS[currency] ?? 2;
  const text = input.trim().replace(/,/g, '');
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  const fraction = (match[2] ?? '').replace(/0+$/, '');
  if (fraction.length > exponent) return null;
  const minor =
    BigInt(match[1] ?? "0") * BigInt(10) ** BigInt(exponent) +
    BigInt(fraction.padEnd(exponent, '0') || '0');
  if (minor <= BigInt(0) || minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor);
}
