/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'VND',
  locale: string = 'vi-VN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number, locale: string = 'vi-VN'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'vi-VN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove all non-digit characters except decimal separator
  const cleaned = currencyString.replace(/[^\d.,]/g, '');
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return roundToTwo((value / total) * 100);
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(originalPrice: number, discountPercent: number): number {
  return roundToTwo(originalPrice * (discountPercent / 100));
}

/**
 * Calculate final price after discount
 */
export function calculateDiscountedPrice(originalPrice: number, discountPercent: number): number {
  const discount = calculateDiscount(originalPrice, discountPercent);
  return roundToTwo(originalPrice - discount);
}
