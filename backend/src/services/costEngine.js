const { estimateCosts } = require('./estimationService');
const { convertCurrency, normalizeCurrency } = require('./currencyService');

function buildOpportunity({ request, destination, flight, hotel }) {
  const duration = Math.max(1, Math.ceil((new Date(request.returnDate) - new Date(request.departureDate)) / 86400000));
  const currency = normalizeCurrency(request.currency);
  const estimates = estimateCosts(destination.name, duration, request.travelers, currency);
  const hotelCost = convertCurrency(
    hotel?.estimatedTotal || (hotel?.pricePerNight || 130) * duration,
    hotel?.currency,
    currency
  );
  const flightCost = convertCurrency(flight?.price || 0, flight?.currency, currency);
  const mandatoryCosts = 0;
  const total = flightCost + hotelCost + estimates.food + estimates.transport + estimates.activities + mandatoryCosts;
  const budgetTotal = Number(request.budget || 0);
  return {
    destination: destination.name, destinationCode: destination.code,
    origin: request.origin, departureDate: request.departureDate, returnDate: request.returnDate,
    duration, nights: duration, travelers: request.travelers, budget: budgetTotal, currency,
    flight, hotel: { ...hotel, costSource: hotel?.costSource || 'ESTIMATED' },
    estimatedFoodCost: estimates.food, estimatedLocalTransportCost: estimates.transport,
    estimatedActivitiesCost: estimates.activities, mandatoryCosts, totalTripCost: total,
    costPerPerson: Math.round(total / request.travelers), remainingBudget: budgetTotal - total,
    overBudget: budgetTotal > 0 && total > budgetTotal,
    costBreakdown: { flight: flightCost, hotel: hotelCost, food: estimates.food, transport: estimates.transport, activities: estimates.activities, mandatory: mandatoryCosts },
    confidence: flight?.source === 'LIVE' && hotel?.costSource === 'LIVE' ? 'HIGH' : 'MEDIUM',
    sources: [flight?.source || 'ESTIMATED', hotel?.costSource || 'ESTIMATED', 'ESTIMATED'],
    preferences: request.preferences || {},
  };
}
module.exports = { buildOpportunity };
