const USD_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
};

function normalizeCurrency(currency) {
  const normalized = String(currency || 'USD').toUpperCase();
  return USD_RATES[normalized] ? normalized : 'USD';
}

function convertCurrency(value, fromCurrency = 'USD', toCurrency = 'USD') {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  return Math.round(Number(value || 0) * (USD_RATES[to] / USD_RATES[from]));
}

module.exports = { convertCurrency, normalizeCurrency };
