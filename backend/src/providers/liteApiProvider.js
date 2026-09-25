const axios = require('axios');
const envConfig = require('../config/env');
const { convertCurrency, normalizeCurrency } = require('../services/currencyService');

const liteApiKey =
  envConfig.liteApiKey ||
  process.env.LITEAPI_API_KEY ||
  process.env.LITEAPI_KEY;

const destinations = [
  { name: 'New York', code: 'JFK', countryCode: 'US' },
  { name: 'London', code: 'LHR', countryCode: 'GB' },
  { name: 'Paris', code: 'CDG', countryCode: 'FR' },
  { name: 'Tokyo', code: 'NRT', countryCode: 'JP' },
  { name: 'Dubai', code: 'DXB', countryCode: 'AE' },
  { name: 'Singapore', code: 'SIN', countryCode: 'SG' },
  { name: 'Bali', code: 'DPS', countryCode: 'ID' },
  { name: 'Rome', code: 'FCO', countryCode: 'IT' },
];

const getHeaders = () => ({
  accept: 'application/json',
  'X-API-Key': liteApiKey ? liteApiKey.trim() : '',
});

function fallbackFlight(request, destination) {
  const distanceFactor = Math.max(1, destination.code.length);

  return {
    airline: 'Representative fare',
    stops: 1,
    departureTime: `${request.departureDate}T09:00:00`,
    arrivalTime: `${request.departureDate}T18:00:00`,
    price: 450 + distanceFactor * 35,
    currency: 'USD',
    source: 'ESTIMATED',
    roundTrip: true,
  };
}

async function searchFlights(request, destination) {
  if (!liteApiKey) {
    return fallbackFlight(request, destination);
  }

  try {
    const legs = [
      {
        origin: request.origin.toUpperCase(),
        destination: destination.code,
        date: request.departureDate,
      },
    ];

    if (request.returnDate) {
      legs.push({
        origin: destination.code,
        destination: request.origin.toUpperCase(),
        date: request.returnDate,
      });
    }

    /*
     * NOTE:
     * This is your flight endpoint.
     * Your current Postman test only proves the HOTEL endpoint.
     */
    const response = await axios.post(
      'https://api.liteapi.travel/v3.0/flights/search',
      {
        legs,
        adults: Number(request.travelers || 1),
        currency: normalizeCurrency(request.currency),
      },
      {
        headers: getHeaders(),
        timeout: 12000,
      }
    );

    const offer =
      response.data?.data?.[0] ||
      response.data?.offers?.[0] ||
      response.data?.[0];

    if (!offer) {
      return fallbackFlight(request, destination);
    }

    return {
      airline:
        offer.airline ||
        offer.validatingAirline ||
        'Multiple airlines',

      stops: offer.stops || 0,

      departureTime: offer.departureTime,

      arrivalTime: offer.arrivalTime,

      price: Number(
        offer.price ||
        offer.totalAmount ||
        0
      ),

      currency: offer.currency || 'USD',

      source: 'LIVE',

      roundTrip: Boolean(request.returnDate),

      rawId: offer.id,
    };
  } catch (error) {
    console.warn(
      'LiteAPI flights unavailable:',
      error.response?.data || error.message
    );

    return fallbackFlight(request, destination);
  }
}

async function searchHotel(request, destination) {
  if (!liteApiKey) {
    return Array.from({ length: 5 }, (_, index) => ({
      name: `${destination.name} ${index === 0 ? 'central stay' : `stay option ${index + 1}`}`,
      pricePerNight: 130 + index * 25,
      estimatedTotal: (130 + index * 25) * request.duration,
      currency: 'USD',
      costSource: 'ESTIMATED',
    }));
  }

  try {
    /*
     * THIS IS THE IMPORTANT FIX
     */
    const hotelUrl =
      'https://api.liteapi.travel/v3.0/data/hotels';

    const response = await axios.get(hotelUrl, {
      params: {
        countryCode: destination.countryCode,
        cityName: destination.name,
      },

      headers: getHeaders(),

      timeout: 12000,
    });

    console.log(
      `LiteAPI returned ${response.data?.data?.length || 0} hotels for ${destination.name}`
    );

    const hotels = response.data?.data || response.data || [];

    if (!hotels.length) {
      throw new Error('No hotel data returned from LiteAPI');
    }

    return hotels.slice(0, 5).map((hotel, index) => {
      const sourceCurrency = normalizeCurrency(hotel.currency);
      const providerPrice = Number(hotel.price || hotel.minPrice);
      const hasProviderPrice = Number.isFinite(providerPrice) && providerPrice > 0;
      const nightly = hasProviderPrice ? providerPrice : 130 + index * 35;
      const priceCurrency = hasProviderPrice ? sourceCurrency : 'USD';
      return {
        id: hotel.id,
        name: hotel.name || `${destination.name} recommended hotel`,
        address: hotel.address,
        stars: hotel.stars,
        rating: hotel.rating,
        reviewCount: hotel.reviewCount,
        image: hotel.main_photo || hotel.thumbnail,
        pricePerNight: convertCurrency(nightly, priceCurrency, request.currency),
        estimatedTotal: convertCurrency(nightly * Number(request.duration || 1), priceCurrency, request.currency),
        currency: normalizeCurrency(request.currency),
        costSource: hasProviderPrice ? 'LIVE' : 'ESTIMATED',
      };
    });
  } catch (error) {
    console.warn(
      'LiteAPI hotels unavailable:',
      error.response?.data || error.message
    );

    return Array.from({ length: 5 }, (_, index) => ({
      name: `${destination.name} ${index === 0 ? 'central stay' : `stay option ${index + 1}`}`,
      pricePerNight: convertCurrency(130 + index * 25, 'USD', request.currency),
      estimatedTotal: convertCurrency((130 + index * 25) * Number(request.duration || 1), 'USD', request.currency),
      currency: normalizeCurrency(request.currency),
      costSource: 'ESTIMATED',
    }));
  }
}

async function search(request, destination) {
  const [flight, hotel] = await Promise.all([
    searchFlights(request, destination),
    searchHotel(request, destination),
  ]);

  return { flight, hotels: Array.isArray(hotel) ? hotel : [hotel] };
}

module.exports = {
  destinations,
  search,
};