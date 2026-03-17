const CURRENCY_SYMBOLS = {
  AZN: '₼',
  USD: '$',
  EUR: '€',
  TRY: '₺',
  GBP: '£',
  RUB: '₽',
};

export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency || '₼';
}

export function formatMoney(amount, currency) {
  if (amount == null || isNaN(amount)) return '—';
  const num = Number(amount);
  const sym = getCurrencySymbol(currency);
  return `${num.toFixed(2)} ${sym}`;
}
