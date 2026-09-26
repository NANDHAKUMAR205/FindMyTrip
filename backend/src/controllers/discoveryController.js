const PriceObservation = require('../models/PriceObservation');
const Trip = require('../models/Trip');
const { destinations, getDestination } = require('../providers/catalog');
const { providerSet, MockHotelProvider, MockActivityProvider, MockWeatherProvider } = require('../providers/adapters');
const { normalizeInput, search } = require('../services/searchOrchestrator');
const { convertCurrency, normalizeCurrency } = require('../services/currencyService');
const { airports } = require('../providers/airports');

const detailCache = new Map();
async function cachedProviderResult(key, factory) {
  const now = Date.now();
  const cached = detailCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) detailCache.delete(key);
  const entry = { value: Promise.resolve().then(factory), expiresAt: now + 5 * 60 * 1000 };
  detailCache.set(key, entry);
  while (detailCache.size > 300) detailCache.delete(detailCache.keys().next().value);
  try {
    const value = await entry.value;
    if (detailCache.get(key) === entry) detailCache.set(key, { value, expiresAt: now + 5 * 60 * 1000 });
    return value;
  } catch (error) {
    if (detailCache.get(key) === entry) detailCache.delete(key);
    throw error;
  }
}

exports.search = async (req, res, next) => {
  try {
    const request = normalizeInput(req.body || {});
    const streaming = String(req.headers.accept || '').includes('application/x-ndjson');
    if (streaming) {
      res.status(200).type('application/x-ndjson');
      const write = (event) => { if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(event)}\n`); };
      try {
        const result = await search(request, req.user?._id, write);
        write({ type: 'complete', result: { ...result, normalizedSearch: request } });
        res.end();
      } catch (error) {
        write({ type: 'error', error: error.message || 'Search could not be completed', status: error.status || 500 });
        res.end();
      }
      return;
    }
    const result = await search(request, req.user?._id);
    res.json({ ...result, normalizedSearch: request });
  } catch (error) { next(error); }
};

exports.airports = (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  res.json({ success: true, airports: airports.filter((airport) => `${airport.code} ${airport.name} ${airport.city}`.toLowerCase().includes(query)).slice(0, 12) });
};

exports.destination = async (req, res, next) => {
  try {
    const place = getDestination(req.params.id);
    if (!place) return res.status(404).json({ success: false, error: 'Destination not found' });
    const request = { destination: place.name, currency: normalizeCurrency(req.query.currency), duration: Math.min(30, Math.max(1, Number(req.query.duration || 5))), departureDate: req.query.departureDate };
    const currency = normalizeCurrency(request.currency);
    const cacheKey = `destination:${place.code}:${currency}:${request.duration}:${request.departureDate || ''}`;
    const destination = await cachedProviderResult(cacheKey, async () => {
      const providerStatus = {
        hotel: require('../config/env').liteApiKey ? 'LIVE' : 'MOCK',
        activities: process.env.GOOGLE_MAPS_API_KEY ? 'LIVE' : 'MOCK',
        weather: process.env.OPENWEATHER_API_KEY ? 'LIVE when date permits' : 'MOCK',
      };
      const [stays, attractions, weather] = await Promise.all([
        providerSet.hotel.search(request, place).catch(async (error) => {
          console.warn(`Hotel details unavailable: ${error.message}`);
          providerStatus.hotel = 'UNAVAILABLE · sample stays';
          return new MockHotelProvider().search(request, place);
        }),
        providerSet.activity.search(request, place).catch(async (error) => {
          console.warn(`Attraction provider unavailable: ${error.message}`);
          providerStatus.activities = 'UNAVAILABLE · sample attractions';
          return new MockActivityProvider().search(request, place);
        }),
        providerSet.weather.forecast(request, place).catch(async (error) => {
          console.warn(`Weather provider unavailable: ${error.message}`);
          providerStatus.weather = 'UNAVAILABLE · seasonal estimate';
          return new MockWeatherProvider().forecast(request, place);
        }),
      ]);
      const hotelList = Array.isArray(stays) && stays.length ? stays : await new MockHotelProvider().search(request, place);
      if (!stays?.length && providerStatus.hotel === 'LIVE') providerStatus.hotel = 'MOCK · no live stays returned';
      const normalizedHotels = hotelList.slice(0, 5).map((hotel) => ({
      ...hotel,
      pricePerNight: convertCurrency(hotel.pricePerNight, hotel.currency || currency, currency),
      estimatedTotal: convertCurrency(hotel.estimatedTotal || Number(hotel.pricePerNight || 0) * request.duration, hotel.currency || currency, currency),
      currency,
      }));
      if (!normalizedHotels.some((hotel) => hotel.costSource === 'LIVE') && providerStatus.hotel === 'LIVE') providerStatus.hotel = 'UNAVAILABLE · live prices not returned';
      return { ...place, attractions, hotels: normalizedHotels, weather, providerStatus, providerUnavailable: providerStatus.hotel !== 'LIVE' };
    });
    res.json({ success: true, destination });
  } catch (error) { next(error); }
};

exports.destinations = (_req, res) => res.json({ success: true, destinations: destinations.map(({ code, name, country, region, popularity }) => ({ id: code, code, name, country, region, popularity })) });

exports.places = async (req, res, next) => {
  try {
    const place = getDestination(req.query.destination || req.query.id);
    if (!place) return res.status(400).json({ success: false, error: 'Choose a supported destination.' });
    const places = await cachedProviderResult(`places:${place.code}`, () => providerSet.place.search({ destination: place.name }, place));
    res.json({ success: true, places });
  } catch (error) { next(error); }
};

exports.weather = async (req, res, next) => {
  try {
    const place = getDestination(req.query.destination || req.query.id);
    if (!place) return res.status(400).json({ success: false, error: 'Choose a supported destination.' });
    const weather = await cachedProviderResult(`weather:${place.code}:${req.query.departureDate || ''}`, () => providerSet.weather.forecast(req.query, place));
    res.json({ success: true, weather });
  } catch (error) { next(error); }
};

exports.deals = async (req, res, next) => {
  try {
    const origin = String(req.query.origin || '').trim().toUpperCase();
    const recentCutoff = new Date(Date.now() - 90 * 86400000);
    const records = await PriceObservation.find({ ...(origin ? { origin } : {}), confidence: { $in: ['LIVE', 'RECENT'] }, observedAt: { $gte: recentCutoff } }).sort({ observedAt: -1 }).limit(500).lean();
    const grouped = new Map();
    for (const item of records) {
      const key = `${item.origin}-${item.destinationCode}-${item.currency}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }
    const deals = [];
    for (const [key, prices] of grouped) {
      if (prices.length < 5) continue;
      const sorted = prices.map((item) => item.price).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const current = prices[0].price;
      if (median > 0 && current < median) deals.push({ route: key, currentPrice: current, medianPrice: median, percentBelowMedian: Math.round((1 - current / median) * 100), sampleSize: prices.length, confidence: 'RECENT' });
    }
    res.json({ success: true, deals: deals.slice(0, 20), minimumSampleSize: 5, notice: deals.length ? null : 'Price insights appear after enough recent verified observations; no deal claims are being made yet.' });
  } catch (error) { next(error); }
};

exports.routePrices = async (req, res, next) => {
  try {
    const origin = String(req.params.origin || '').toUpperCase();
    const destinationCode = String(req.params.destination || '').toUpperCase();
    const observations = await PriceObservation.find({ origin, destinationCode, currency: String(req.query.currency || 'USD').toUpperCase() }).sort({ observedAt: -1 }).limit(500).lean();
    const values = observations.map((item) => item.price).sort((a, b) => a - b);
    if (!values.length) return res.json({ success: true, stats: { sampleSize: 0, minimumSampleSize: 5, confidence: 'LOW', min: null, max: null, median: null, p10: null, p90: null }, notice: 'No price observations are available for this route yet.' });
    const percentile = (fraction) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))];
    const stats = { sampleSize: values.length, minimumSampleSize: 5, confidence: values.length >= 5 ? 'RECENT' : 'LOW', min: values[0], max: values[values.length - 1], median: percentile(0.5), p10: percentile(0.1), p90: percentile(0.9) };
    res.json({ success: true, stats, notice: values.length < 5 ? 'A larger sample is needed before comparing this fare to a route median.' : null });
  } catch (error) { next(error); }
};

exports.nearbyAirports = (req, res) => {
  const place = getDestination(req.query.destination);
  if (!place) return res.status(400).json({ success: false, error: 'Choose a supported destination.' });
  const currency = normalizeCurrency(req.query.currency);
  const baselineFare = Number(req.query.fare);
  const hasFare = Number.isFinite(baselineFare) && baselineFare > 0;
  const airports = place.airports.map((code, index) => {
    const groundTravelCost = convertCurrency(index ? 24 + index * 9 : 0, 'USD', currency);
    const fare = hasFare
      ? convertCurrency(baselineFare * (1 - index * 0.06), currency, currency)
      : convertCurrency(place.flight * (1 - index * 0.06), 'USD', currency);
    return {
      code, groundTravelCost, groundTravelMinutes: index ? 35 + index * 20 : 0,
      estimatedAirfare: fare, totalCost: fare + groundTravelCost, currency,
      explanation: index ? 'Estimated transfer from the city center' : 'Primary airport',
    };
  }).sort((a, b) => a.totalCost - b.totalCost);
  res.json({ success: true, airports });
};

exports.bookingClick = async (req, res, next) => {
  try {
    const { tripId, offerId } = req.body || {};
    if (tripId) {
      if (!req.user) return res.status(401).json({ success: false, error: 'Sign in to check a saved trip offer.' });
      const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    }
    res.json({ success: true, offerId: offerId || null, priceChanged: null, state: 'price_unverified', message: 'Fare and availability have not been revalidated. The price may have changed; confirm directly with the travel provider. FindMyTrip does not process reservations or payments.', bookingUrl: null });
  } catch (error) { next(error); }
};
