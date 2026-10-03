/**
 * Utility functions for clean number formatting & 1M abbreviations
 */

export function formatScoreM(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (num === 0) return '0';

  if (Math.abs(num) >= 1_000_000) {
    const millions = num / 1_000_000;
    // Format cleanly without trailing zeros (e.g. 1M, 2.5M, 3.25M)
    const formatted = parseFloat(millions.toFixed(2)).toString();
    return `${formatted}M`;
  }

  if (Math.abs(num) >= 1_000) {
    const thousands = num / 1_000;
    const formatted = parseFloat(thousands.toFixed(1)).toString();
    return `${formatted}k`;
  }

  return num.toString();
}

export function formatPoints(value: number | undefined | null): string {
  return `${formatScoreM(value)} pts`;
}

export function formatCurrencyAr(amount: number | undefined | null): string {
  if (!amount) return '0 Ar';
  return `${amount.toLocaleString('fr-FR')} Ar`;
}
