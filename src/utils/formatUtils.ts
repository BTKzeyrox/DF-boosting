/**
 * Utility functions for clean number formatting & 1M abbreviations
 */

const trimNum = (n: number, digits: number): string => parseFloat(n.toFixed(digits)).toString();

export function formatScoreM(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (num === 0) return '0';

  const abs = Math.abs(num);
  // Millions : M avec jusqu'à 3 décimales (20 467 000 -> 20.467M, 25 000 000 -> 25M)
  if (abs >= 1_000_000) return `${trimNum(num / 1_000_000, 3)}M`;
  // Milliers : k avec jusqu'à 3 décimales (12 500 -> 12.5k)
  if (abs >= 1_000) return `${trimNum(num / 1_000, 3)}k`;
  return trimNum(num, 2);
}

export function formatPoints(value: number | undefined | null): string {
  return `${formatScoreM(value)} pts`;
}

export function formatCurrencyAr(amount: number | undefined | null): string {
  if (!amount) return '0 Ar';
  return `${amount.toLocaleString('fr-FR')} Ar`;
}

// « 1 avance », « 2 avances » : accord du pluriel (0 et 1 = singulier)
export const plural = (n: number, one: string, many?: string): string =>
  `${n} ${n > 1 ? many || one + 's' : one}`;
