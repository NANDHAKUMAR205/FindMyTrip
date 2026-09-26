const axios = require('axios');
const env = require('../config/env');
const { destinations, hotels, attractions } = require('./catalog');
const { convertCurrency } = require('../services/currencyService');

class FlightProvider {
  async search() { throw new Error('FlightProvider.search must be implemented'); }
}
class HotelProvider {
  async search() { throw new Error('HotelProvider.search must be implemented'); }
}
class ActivityProvider {
  async search() { throw new Error('ActivityProvider.search must be implemented'); }
}
class PlaceProvider {
  async search() { throw new Error('PlaceProvider.search must be implemented'); }
}
class WeatherProvider {
  async forecast() { throw new Error('WeatherProvider.forecast must be implemented'); }
}

class RemoteFlightProvider extends FlightProvider {
  constructor(endpoint) { super(); this.endpoint = endpoint; }
  async search(request) {
    const response = await axios.post(this.endpoint, request, { timeout: 8000 });
    const offers = response.data?.offers || response.data?.data || [];
    return Array.isArray(offers) ? offers.slice(0, 2).map((offer, index) => ({
      id: String(offer.id || `remote-${index}`),
      airline: offer.airline || offer.validatingAirline || 'Multiple airlines',
      stops: Number(offer.stops || 0),
      price: Number(offer.price || offer.totalAmount || 0),
      currency: offer.currency || request.currency,
      source: 'LIVE',
      provider: 'remote-flight-provider',
      departureTime: offer.departureTime,
      arrivalTime: offer.arrivalTime,
      layovers: Array.isArray(offer.layovers) ? offer.layovers.map((stop) => ({ airport: stop.airport || stop.iataCode, durationHours: Number(stop.durationHours || stop.duration || 0) })) : [],
      roundTrip: true,
    })).filter((offer) => offer.price > 0) : [];
  }
}

class LiteApiFlightProvider extends FlightProvider {
  async search(request, place) {
    const legs = [{ origin: request.origin, destination: place.code, date: request.departureDate }];
    if (request.returnDate) legs.push({ origin: place.code, destination: request.origin, date: request.returnDate });
    const response = await axios.post('https://api.liteapi.travel/v3.0/flights/search', {
      legs, adults: Number(request.travelers || 1), currency: request.currency,
    }, {
      headers: { accept: 'application/json', 'X-API-Key': env.liteApiKey },
      timeout: 8000,
    });
    const offers = response.data?.data || response.data?.offers || [];
    return Array.isArray(offers) ? offers.slice(0, 2).map((offer, index) => ({
      id: String(offer.id || `liteapi-${index}`),
      airline: offer.airline || offer.validatingAirline || 'Multiple airlines',
      stops: Number(offer.stops || 0),
      price: Number(offer.price || offer.totalAmount || 0),
      currency: offer.currency || request.currency,
      source: 'LIVE',
      provider: 'LiteAPI',
      departureTime: offer.departureTime,
      arrivalTime: offer.arrivalTime,
      layovers: Array.isArray(offer.layovers) ? offer.layovers.map((stop) => ({ airport: stop.airport || stop.iataCode, durationHours: Number(stop.durationHours || stop.duration || 0) })) : [],
      roundTrip: Boolean(request.returnDate),
    })).filter((offer) => offer.price > 0) : [];
  }
}

class MockFlightProvider extends FlightProvider {
  async search(request, place) {
    const hash = [...`${request.origin}${place.code}${request.departureDate || ''}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const price = convertCurrency(Math.round(place.flight * (0.9 + (hash % 21) / 100) * Math.max(1, request.travelers)), 'USD', request.currency);
    const stops = hash % 3 === 0 ? 0 : 1;
    return [{ id: `mock-${request.origin}-${place.code}-${hash}`, airline: 'Sample Airways', stops, layovers: stops ? [{ airport: 'Sample hub', durationHours: 2.5 }] : [], price, currency: request.currency, source: 'ESTIMATED', provider: 'mock', departureTime: '09:10', arrivalTime: '17:35', roundTrip: true }];
  }
}

class MockHotelProvider extends HotelProvider {
  async search(request, place) {
    return hotels(place).map((hotel) => ({
      ...hotel,
      pricePerNight: convertCurrency(hotel.pricePerNight, 'USD', request.currency),
      currency: request.currency,
      estimatedTotal: convertCurrency(hotel.pricePerNight * request.duration, 'USD', request.currency),
      costSource: 'ESTIMATED',
    }));
  }
}

class MockActivityProvider extends ActivityProvider {
  async search(request, place) {
    return (attractions[place.code] || []).map((name, index) => ({ id: `${place.code}-a${index + 1}`, name, category: ['Culture', 'Outdoors', 'Local favorite'][index], price: convertCurrency([0, 18, 32][index], 'USD', request.currency || 'USD'), currency: request.currency || 'USD', source: 'MOCK' }));
  }
}

class MockPlaceProvider extends PlaceProvider {
  async search(_request, place) {
    return [{ name: `${place.name} visitor information`, category: 'Visitor information', source: 'MOCK' }, ...(attractions[place.code] || []).map((name) => ({ name, category: 'Attraction', source: 'MOCK' }))];
  }
}

class MockWeatherProvider extends WeatherProvider {
  async forecast(request) {
    const month = new Date(request.departureDate || Date.now()).getMonth();
    const season = month >= 5 && month <= 8 ? 'Warm season' : month <= 1 || month >= 10 ? 'Cool season' : 'Mild season';
    return { summary: `Typical ${season.toLowerCase()} conditions; check a forecast closer to departure.`, temperatureC: month >= 5 && month <= 8 ? [19, 28] : [8, 19], source: 'ESTIMATED', forecastAvailable: false };
  }
}

class LiteApiHotelProvider extends HotelProvider {
  async search(request, place) {
    const response = await axios.get('https://api.liteapi.travel/v3.0/data/hotels', {
      params: { countryCode: place.countryCode, cityName: place.name },
      headers: { accept: 'application/json', 'X-API-Key': env.liteApiKey },
      timeout: 8000,
    });
    const list = response.data?.data || [];
    return list.slice(0, 5).map((hotel, index) => {
      const nightly = Number(hotel.minPrice || hotel.price);
      return { id: hotel.id || `${place.code}-live-${index}`, name: hotel.name || `${place.name} hotel`, pricePerNight: nightly || place.hotel, estimatedTotal: (nightly || place.hotel) * request.duration, currency: hotel.currency || request.currency, rating: Number(hotel.rating || 0), costSource: nightly ? 'LIVE' : 'ESTIMATED', source: 'LiteAPI' };
    });
  }
}

class GooglePlacesProvider extends PlaceProvider {
  async search(_request, place) {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: { query: `top things to do and attractions in ${place.name}`, key: process.env.GOOGLE_MAPS_API_KEY },
      timeout: 7000,
    });
    if (response.data?.status !== 'OK' && response.data?.status !== 'ZERO_RESULTS') throw new Error(`Google Places returned ${response.data?.status || 'an invalid response'}`);
    return (response.data.results || []).slice(0, 8).map((item) => ({ id: item.place_id, name: item.name, category: item.types?.[0] || 'Attraction', rating: Number(item.rating || 0), address: item.formatted_address, source: 'LIVE' }));
  }
}

class GoogleActivityProvider extends ActivityProvider {
  async search(request, place) {
    const places = await new GooglePlacesProvider().search(request, place);
    return places.map((item) => ({ ...item, price: null, currency: request.currency || 'USD' }));
  }
}

class OpenWeatherProvider extends WeatherProvider {
  async forecast(request, place) {
    const departure = new Date(request.departureDate || Date.now());
    const daysAway = (departure - new Date()) / 86400000;
    if (daysAway > 5 || daysAway < -1) return new MockWeatherProvider().forecast(request, place);
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: { q: `${place.name},${place.countryCode}`, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' },
      timeout: 7000,
    });
    const entries = response.data?.list || [];
    const forecast = entries.reduce((closest, entry) => {
      if (!closest) return entry;
      return Math.abs(new Date(entry.dt_txt) - departure) < Math.abs(new Date(closest.dt_txt) - departure) ? entry : closest;
    }, null);
    if (!forecast) throw new Error('OpenWeather returned no forecast');
    return { summary: forecast.weather?.[0]?.description || 'Forecast available', temperatureC: [Math.round(forecast.main.temp_min), Math.round(forecast.main.temp_max)], source: 'LIVE', forecastAvailable: true, validAt: forecast.dt_txt };
  }
}

const providerSet = {
  flight: process.env.FLIGHT_PROVIDER_URL ? new RemoteFlightProvider(process.env.FLIGHT_PROVIDER_URL) : (env.liteApiKey ? new LiteApiFlightProvider() : new MockFlightProvider()),
  hotel: env.liteApiKey ? new LiteApiHotelProvider() : new MockHotelProvider(),
  activity: process.env.GOOGLE_MAPS_API_KEY ? new GoogleActivityProvider() : new MockActivityProvider(),
  place: process.env.GOOGLE_MAPS_API_KEY ? new GooglePlacesProvider() : new MockPlaceProvider(),
  weather: process.env.OPENWEATHER_API_KEY ? new OpenWeatherProvider() : new MockWeatherProvider(),
};

module.exports = {
  FlightProvider, HotelProvider, ActivityProvider, PlaceProvider, WeatherProvider,
  MockFlightProvider, MockHotelProvider, MockActivityProvider, MockPlaceProvider, MockWeatherProvider,
  LiteApiFlightProvider, LiteApiHotelProvider, GooglePlacesProvider, OpenWeatherProvider,
  providerSet, destinations,
};
