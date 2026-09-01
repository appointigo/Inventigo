/**
 * Format a number as Indian Rupee currency.
 */
import { formatCurrency as formatMoney } from "./money";

export function formatCurrency(amount: number | string): string {
  return formatMoney(amount);
}
