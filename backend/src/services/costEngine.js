const { estimateCosts } = require('./estimationService');
const { convertCurrency, normalizeCurrency } = require('./currencyService');

function buildOpportunity({ request, destination, flight, hotel, groundCost = 0 }) {
  const duration = Math.max(1, Number(request.duration || Math.ceil((new Date(request.returnDate) - new Date(request.departureDate)) / 86400000)));
  const travelers = Math.max(1, Number(request.travelers || 1));
  const currency = normalizeCurrency(request.currency);
  const estimates = estimateCosts(destination.name, duration, travelers, currency);
  const hotelCost = convertCurrency(
    hotel?.estimatedTotal || (hotel?.pricePerNight || 130) * duration,
    hotel?.currency,
    currency
  );
  const flightCost = convertCurrency(flight?.price || 0, flight?.currency, currency);
  const mandatoryCosts = 0;
  const total = flightCost + hotelCost + estimates.food + estimates.transport + estimates.activities + mandatoryCosts + groundCost;
  const budgetTotal = Number(request.budget || 0);
  const componentConfidence = {
    flight: flight?.source === 'LIVE' ? 'LIVE' : flight?.source === 'RECENT' ? 'RECENT' : 'ESTIMATED',
    hotel: hotel?.costSource === 'LIVE' ? 'LIVE' : hotel?.costSource === 'RECENT' ? 'RECENT' : 'ESTIMATED',
    food: 'ESTIMATED', transport: 'ESTIMATED', activities: 'ESTIMATED',
    ground: 'ESTIMATED',
  };
  const longLayovers = Array.isArray(flight?.layovers) ? flight.layovers.filter((stop) => Number(stop.durationHours) >= 20) : [];
  return {
    id: `${destination.code}-${flight?.id || 'estimate'}-${hotel?.id || 'stay'}`,
    destination: destination.name, destinationCode: destination.code,
    country: destination.country,
    origin: request.origin, departureDate: request.departureDate, returnDate: request.returnDate,
    duration, nights: Math.max(1, duration - 1), travelers, budget: budgetTotal, currency,
    flight: { ...flight, longLayovers, transitVisaCheckRequired: longLayovers.length > 0 },
    hotel: { ...hotel, costSource: hotel?.costSource || 'ESTIMATED' },
    estimatedFoodCost: estimates.food, estimatedLocalTransportCost: estimates.transport,
    estimatedActivitiesCost: estimates.activities, mandatoryCosts, totalTripCost: total,
    costPerPerson: Math.round(total / travelers), costPerDay: Math.round(total / duration), remainingBudget: budgetTotal - total,
    overBudget: budgetTotal > 0 && total > budgetTotal,
    costBreakdown: { flight: flightCost, hotel: hotelCost, food: estimates.food, transport: estimates.transport, activities: estimates.activities, ground: groundCost, mandatory: mandatoryCosts },
    confidence: flight?.source === 'LIVE' && hotel?.costSource === 'LIVE' ? 'HIGH' : 'LOW',
    componentConfidence,
    confidenceLabel: flight?.source === 'LIVE' && hotel?.costSource === 'LIVE' ? 'Live provider prices' : 'Planning estimate',
    sources: [flight?.source || 'ESTIMATED', hotel?.costSource || 'ESTIMATED', 'ESTIMATED'],
    preferences: request.preferences || {},
  };
}
module.exports = { buildOpportunity };
