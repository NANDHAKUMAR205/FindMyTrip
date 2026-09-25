const DESTINATION_ESTIMATES = {
  'New York': { food: 70, transport: 25, activities: 45 },
  'London': { food: 65, transport: 22, activities: 40 },
  'Paris': { food: 60, transport: 18, activities: 38 },
  'Tokyo': { food: 55, transport: 15, activities: 35 },
  'Dubai': { food: 55, transport: 25, activities: 45 },
  'Singapore': { food: 60, transport: 16, activities: 42 },
  'Bali': { food: 35, transport: 12, activities: 28 },
  'Rome': { food: 58, transport: 16, activities: 35 },
};

function estimateCosts(destination, duration, travelers, currency = 'USD') {
  const base = DESTINATION_ESTIMATES[destination] || { food: 50, transport: 20, activities: 35 };
  const days = Math.max(1, duration || 1);
  const { convertCurrency } = require('./currencyService');
  return {
    food: convertCurrency(base.food * days * travelers, 'USD', currency),
    transport: convertCurrency(base.transport * days * travelers, 'USD', currency),
    activities: convertCurrency(base.activities * days * travelers, 'USD', currency),
    currency,
    source: 'ESTIMATED',
  };
}
module.exports = { estimateCosts, DESTINATION_ESTIMATES };
