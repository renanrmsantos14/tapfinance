export const MAX_AMOUNT_CENTS = 9_999_999_999;

export function parseCurrencyToCents(input: string): number | null {
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return null;

  const cents = BigInt(digits);
  if (cents > BigInt(MAX_AMOUNT_CENTS)) return null;
  return Number(cents);
}

export function formatCentsToBRL(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(cents));
  const whole = Math.floor(absolute / 100).toLocaleString("pt-BR");
  const decimal = String(absolute % 100).padStart(2, "0");
  return `${sign}R$ ${whole},${decimal}`;
}

export function formatInputCents(cents: number): string {
  return formatCentsToBRL(cents);
}
