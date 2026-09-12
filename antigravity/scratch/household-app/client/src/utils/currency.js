export const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs.', label: '₨ / Rs. - Pakistani Rupee (PKR)' },
  { code: '$', symbol: '$', label: '$ - US Dollar / Standard' },
  { code: '€', symbol: '€', label: '€ - Euro' },
  { code: '£', symbol: '£', label: '£ - British Pound' },
  { code: '₹', symbol: '₹', label: '₹ - Indian Rupee' },
  { code: 'C$', symbol: 'C$', label: 'C$ - Canadian Dollar' },
  { code: 'A$', symbol: 'A$', label: 'A$ - Australian Dollar' },
  { code: '¥', symbol: '¥', label: '¥ - Japanese Yen / Chinese Yuan' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF - Swiss Franc' },
];

export const DEFAULT_CURRENCY = 'PKR';

export function getCurrencySymbol(code) {
  if (!code || code === 'PKR' || code === 'Rs.' || code === '₨' || code === 'Rs') {
    return 'Rs.';
  }
  return code;
}

export function formatAmount(amount, currencyCode = 'PKR') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const sym = getCurrencySymbol(currencyCode);
  return `${sym} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
