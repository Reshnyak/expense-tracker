/** Formatting and parsing helpers for money held as integer minor units (cents). */

/** Format `cents` (minor units) as a localized currency string. */
export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency }).format(cents / 100);
}

/**
 * Parse a user-typed amount ("12", "12.5", "12,50", "1 200,00") into integer
 * minor units. Returns `null` when the input is empty or not a positive number.
 */
export function parseAmountToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 ? cents : null;
}

/** Minor units back to an editable decimal string ("1234" -> "12.34"). */
export function centsToAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
