const crypto = require('crypto');
const Search = require('../models/Search');
const FlightOffer = require('../models/FlightOffer');
const PriceObservation = require('../models/PriceObservation');
const TripOpportunity = require('../models/TripOpportunity');
const { destinations, getDestination } = require('../providers/catalog');
const { providerSet, MockFlightProvider, MockHotelProvider } = require('../providers/adapters');
const env = require('../config/env');
const { buildOpportunity } = require('./costEngine');
const { resolveAirport } = require('../providers/airports');

const cache = new Map();
const inFlight = new Map();
const CACHE_MS = 60_000;
const MAX_DESTINATIONS = 8;
const MAX_DATE_OPTIONS = 3;
const MAX_CACHE_ENTRIES = 1000;

function normalizeInput(body) {
  const resolvedOrigin = resolveAirport(body.origin);
  const origin = resolvedOrigin?.code || String(body.origin || '').trim().toUpperCase();
  const requestedDestination = String(body.destination || 'Anywhere').trim();
  const travelers = Number(body.travelers || 1);
  const currency = String(body.currency || 'USD').toUpperCase();
  let duration = Math.min(30, Math.max(1, Number(body.duration || 5)));
  const departureSource = body.flexible === false ? body.departureDate : (body.earliestDate || body.departureDate);
  const departureDate = departureSource ? new Date(departureSource) : new Date(Date.now() + 45 * 86400000);
  const latestDate = body.flexible === false ? (body.departureDate || departureDate.toISOString().slice(0, 10)) : (body.latestDate || departureDate.toISOString().slice(0, 10));
  const returnDate = body.returnDate ? new Date(body.returnDate) : new Date(departureDate.getTime() + duration * 86400000);
  if (body.flexible === false && body.returnDate) duration = Math.ceil((returnDate - departureDate) / 86400000);
  if (!resolvedOrigin) throw Object.assign(new Error('Choose a supported origin airport from the suggestions.'), { status: 400 });
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 9) throw Object.assign(new Error('Travelers must be between 1 and 9.'), { status: 400 });
  if (!['USD', 'EUR', 'GBP', 'INR'].includes(currency)) throw Object.assign(new Error('Currency must be USD, EUR, GBP or INR.'), { status: 400 });
  if (Number.isNaN(departureDate.valueOf()) || Number.isNaN(returnDate.valueOf()) || returnDate <= departureDate) throw Object.assign(new Error('Select a valid travel window and return date.'), { status: 400 });
  if (!Number.isInteger(duration) || duration < 1 || duration > 30) throw Object.assign(new Error('Trip duration must be between 1 and 30 days.'), { status: 400 });
  if (body.budget != null && body.budget !== '' && (!Number.isFinite(Number(body.budget)) || Number(body.budget) <= 0)) throw Object.assign(new Error('Budget must be a positive amount.'), { status: 400 });
  const destination = requestedDestination.toLowerCase() === 'anywhere' ? 'Anywhere' : (getDestination(requestedDestination)?.name || null);
  if (!destination) throw Object.assign(new Error('Choose a destination from the supported list.'), { status: 400 });
  const latest = new Date(latestDate);
  if (Number.isNaN(latest.valueOf()) || latest < departureDate || (latest - departureDate) / 86400000 > 180) throw Object.assign(new Error('Latest departure must be within 180 days of the earliest date.'), { status: 400 });
  return {
    ...body, origin, destination, travelers, currency, duration,
    departureDate: departureDate.toISOString().slice(0, 10),
    returnDate: returnDate.toISOString().slice(0, 10),
    earliestDate: departureDate.toISOString().slice(0, 10),
    latestDate: latest.toISOString().slice(0, 10),
    flexible: body.flexible !== false,
    budget: body.budget == null || body.budget === '' ? 0 : Number(body.budget),
  };
}

async function withFallback(provider, fallback, request, place) {
  try {
    const value = await provider.search(request, place);
    if (Array.isArray(value) && value.length) return value;
    return fallback.search(request, place);
  } catch (error) {
    console.warn(`${provider.constructor.name} unavailable; using the sample provider: ${error.message}`);
    return fallback.search(request, place);
  }
}

async function search(request, userId, onProgress) {
  const key = crypto.createHash('sha1').update(JSON.stringify({ ...request, userId: String(userId || 'guest') })).digest('hex');
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    if (onProgress) cached.result.opportunities.forEach((opportunity) => onProgress({ type: 'opportunity', opportunity }));
    return { ...cached.result, cached: true };
  }
  if (cached) cache.delete(key);
  if (inFlight.has(key)) {
    const result = await inFlight.get(key);
    if (onProgress) result.opportunities.forEach((opportunity) => onProgress({ type: 'opportunity', opportunity }));
    return result;
  }
  const work = (async () => {
    const places = request.destination === 'Anywhere'
      ? destinations.filter((place) => place.code !== request.origin).sort((a, b) => b.popularity - a.popularity).slice(0, MAX_DESTINATIONS)
      : [getDestination(request.destination)];
    const firstDay = new Date(request.earliestDate);
    const lastDay = new Date(request.latestDate);
    const daySpan = Math.round((lastDay - firstDay) / 86400000);
    const offsets = request.flexible && daySpan > 0
      ? [...new Set([0, Math.floor(daySpan / 2), daySpan])].slice(0, MAX_DATE_OPTIONS)
      : [0];
    const dateOptions = offsets.map((offset) => {
      const departure = new Date(firstDay.getTime() + offset * 86400000);
      const returning = new Date(departure.getTime() + request.duration * 86400000);
      return { ...request, departureDate: departure.toISOString().slice(0, 10), returnDate: returning.toISOString().slice(0, 10) };
    });
    const searchRecord = await Search.create({
      userId: userId || undefined, origin: request.origin, destination: request.destination,
      dates: { departureDate: request.departureDate, returnDate: request.returnDate, earliestDate: request.earliestDate, latestDate: request.latestDate, flexible: request.flexible },
      budget: request.budget, travelers: request.travelers, currency: request.currency,
    });
    const options = [];
    for (let start = 0; start < places.length; start += 3) {
      const batch = places.slice(start, start + 3);
      const batchResults = await Promise.all(batch.map(async (place) => {
        const stays = await withFallback(providerSet.hotel, new MockHotelProvider(), request, place);
        const variants = await Promise.all(dateOptions.map(async (dateRequest) => {
          const flights = await withFallback(providerSet.flight, new MockFlightProvider(), dateRequest, place);
          return flights.slice(0, 2).flatMap((flight) => stays.slice(0, 3).map((hotel) => buildOpportunity({ request: dateRequest, destination: place, flight, hotel })));
        }));
        const bestPerStay = new Map();
        for (const item of variants.flat()) {
          const stayKey = item.hotel?.id || 'stay';
          if (!bestPerStay.has(stayKey) || bestPerStay.get(stayKey).totalTripCost > item.totalTripCost) bestPerStay.set(stayKey, item);
        }
        return { place, items: [...bestPerStay.values()] };
      }));
      for (const [batchIndex, { place, items }] of batchResults.entries()) {
        options.push(...items);
        if (onProgress) {
          items.forEach((opportunity) => onProgress({ type: 'opportunity', opportunity }));
          onProgress({ type: 'progress', destination: place.name, completed: start + batchIndex + 1, total: places.length });
        }
      }
    }
    const unique = new Map();
    for (const item of options.flat().filter((option) => option.totalTripCost > 0)) {
      const dedupeKey = `${item.destinationCode}:${item.hotel?.id}`;
      if (!unique.has(dedupeKey) || unique.get(dedupeKey).totalTripCost > item.totalTripCost) unique.set(dedupeKey, item);
    }
    const month = new Date(request.earliestDate).getMonth();
    const opportunities = [...unique.values()].sort((a, b) => {
      if (request.budget && (a.totalTripCost <= request.budget) !== (b.totalTripCost <= request.budget)) return a.totalTripCost <= request.budget ? -1 : 1;
      const placeA = places.find((place) => place.code === a.destinationCode);
      const placeB = places.find((place) => place.code === b.destinationCode);
      const scoreA = a.totalTripCost - (placeA?.popularity || 0) * 2 - (placeA?.bestMonths?.includes(month) ? 20 : 0);
      const scoreB = b.totalTripCost - (placeB?.popularity || 0) * 2 - (placeB?.bestMonths?.includes(month) ? 20 : 0);
      return scoreA - scoreB;
    }).slice(0, 12);
    const observedRoutes = new Set();
    await Promise.all(opportunities.map(async (item) => {
      const offer = await FlightOffer.create({ searchId: searchRecord._id, destinationCode: item.destinationCode, provider: item.flight.provider || 'mock', price: item.flight.price, currency: item.currency, offer: item.flight });
      const routeKey = `${item.origin}:${item.destinationCode}`;
      if (!observedRoutes.has(routeKey)) {
        observedRoutes.add(routeKey);
        await PriceObservation.create({ origin: item.origin, destinationCode: item.destinationCode, price: item.flight.price, currency: item.currency, confidence: item.flight.source === 'LIVE' ? 'LIVE' : 'ESTIMATED' });
      }
      await TripOpportunity.create({ searchId: searchRecord._id, destinationCode: item.destinationCode, totalTripCost: item.totalTripCost, costBreakdown: item.costBreakdown, confidence: item.confidence, opportunity: { ...item, flightOfferId: offer._id } });
    }));
    const result = {
      success: true, searchId: searchRecord._id, opportunities,
      providerStatus: {
        flights: opportunities.some((item) => item.flight.source === 'LIVE') ? 'LIVE' : (providerSet.flight.constructor.name === 'MockFlightProvider' ? 'MOCK' : 'UNAVAILABLE · using sample fares'),
        hotels: opportunities.some((item) => item.hotel.costSource === 'LIVE') ? 'LIVE' : (providerSet.hotel.constructor.name === 'MockHotelProvider' ? 'MOCK' : 'UNAVAILABLE · using sample stays'),
        activities: process.env.GOOGLE_MAPS_API_KEY ? 'LIVE when destination details load' : 'MOCK',
        weather: process.env.OPENWEATHER_API_KEY ? 'LIVE when forecast window allows' : 'MOCK',
      },
      budgetMatched: Boolean(request.budget && opportunities.some((item) => !item.overBudget)),
      notice: opportunities.length ? null : 'No matching options are available for these dates.',
    };
    cache.set(key, { expiresAt: Date.now() + CACHE_MS, result });
    while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    return result;
  })();
  inFlight.set(key, work);
  try { return await work; } finally { inFlight.delete(key); }
}

module.exports = { normalizeInput, search };
