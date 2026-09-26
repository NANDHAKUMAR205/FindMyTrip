const destinations = [
  { name: 'New York', code: 'JFK', country: 'United States', countryCode: 'US', region: 'North America', popularity: 96, bestMonths: [4, 5, 8, 9], daily: [72, 26, 48], hotel: 185, flight: 460, airports: ['JFK', 'EWR', 'LGA'], interests: ['food', 'culture', 'city'] },
  { name: 'London', code: 'LHR', country: 'United Kingdom', countryCode: 'GB', region: 'Europe', popularity: 95, bestMonths: [4, 5, 6, 8, 9], daily: [68, 24, 42], hotel: 172, flight: 510, airports: ['LHR', 'LGW', 'STN'], interests: ['history', 'culture', 'city'] },
  { name: 'Paris', code: 'CDG', country: 'France', countryCode: 'FR', region: 'Europe', popularity: 98, bestMonths: [3, 4, 8, 9], daily: [64, 21, 44], hotel: 168, flight: 490, airports: ['CDG', 'ORY', 'BVA'], interests: ['food', 'culture', 'romance'] },
  { name: 'Tokyo', code: 'NRT', country: 'Japan', countryCode: 'JP', region: 'Asia', popularity: 97, bestMonths: [2, 3, 9, 10], daily: [58, 18, 38], hotel: 142, flight: 760, airports: ['NRT', 'HND'], interests: ['food', 'culture', 'city'] },
  { name: 'Dubai', code: 'DXB', country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', popularity: 88, bestMonths: [10, 11, 0, 1, 2], daily: [60, 28, 54], hotel: 155, flight: 520, airports: ['DXB', 'DWC'], interests: ['beach', 'shopping', 'city'] },
  { name: 'Singapore', code: 'SIN', country: 'Singapore', countryCode: 'SG', region: 'Asia', popularity: 85, bestMonths: [0, 1, 6, 7], daily: [62, 17, 45], hotel: 162, flight: 720, airports: ['SIN'], interests: ['food', 'nature', 'city'] },
  { name: 'Bali', code: 'DPS', country: 'Indonesia', countryCode: 'ID', region: 'Asia', popularity: 91, bestMonths: [3, 4, 5, 6, 7, 8], daily: [38, 15, 35], hotel: 92, flight: 800, airports: ['DPS'], interests: ['beach', 'nature', 'wellness'] },
  { name: 'Rome', code: 'FCO', country: 'Italy', countryCode: 'IT', region: 'Europe', popularity: 93, bestMonths: [3, 4, 8, 9], daily: [61, 19, 39], hotel: 145, flight: 475, airports: ['FCO', 'CIA'], interests: ['history', 'food', 'culture'] },
  { name: 'Lisbon', code: 'LIS', country: 'Portugal', countryCode: 'PT', region: 'Europe', popularity: 87, bestMonths: [2, 3, 4, 8, 9], daily: [48, 15, 30], hotel: 118, flight: 455, airports: ['LIS'], interests: ['food', 'culture', 'beach'] },
  { name: 'Bangkok', code: 'BKK', country: 'Thailand', countryCode: 'TH', region: 'Asia', popularity: 90, bestMonths: [10, 11, 0, 1, 2], daily: [36, 12, 28], hotel: 82, flight: 680, airports: ['BKK', 'DMK'], interests: ['food', 'culture', 'city'] },
  { name: 'Barcelona', code: 'BCN', country: 'Spain', countryCode: 'ES', region: 'Europe', popularity: 89, bestMonths: [3, 4, 5, 8, 9], daily: [57, 18, 36], hotel: 139, flight: 485, airports: ['BCN'], interests: ['beach', 'food', 'culture'] },
  { name: 'Reykjavik', code: 'KEF', country: 'Iceland', countryCode: 'IS', region: 'Europe', popularity: 76, bestMonths: [5, 6, 7, 8], daily: [78, 22, 62], hotel: 198, flight: 520, airports: ['KEF'], interests: ['nature', 'adventure'] },
];

const hotels = (place) => [
  { id: `${place.code}-h1`, name: `${place.name} Central House`, pricePerNight: place.hotel, rating: 4.6, category: 'Boutique hotel', source: 'MOCK', amenities: ['Wi-Fi', 'Breakfast option', 'Central location'] },
  { id: `${place.code}-h2`, name: `${place.name} City Stay`, pricePerNight: Math.round(place.hotel * 0.76), rating: 4.3, category: 'Guesthouse', source: 'MOCK', amenities: ['Wi-Fi', 'Transit nearby'] },
  { id: `${place.code}-h3`, name: `${place.name} Riverside Suites`, pricePerNight: Math.round(place.hotel * 1.28), rating: 4.8, category: 'Apartment', source: 'MOCK', amenities: ['Kitchen', 'Wi-Fi', 'Family rooms'] },
];

const attractions = {
  JFK: ['Central Park walk', 'Metropolitan Museum of Art', 'Brooklyn Bridge and DUMBO'],
  LHR: ['British Museum', 'South Bank and Tate Modern', 'Covent Garden'],
  CDG: ['Louvre area and Tuileries', 'Montmartre walk', 'Musée d’Orsay'],
  NRT: ['Asakusa and Senso-ji', 'Shibuya crossing', 'teamLab Planets'],
  DXB: ['Al Fahidi historic district', 'Dubai Creek', 'Dubai Frame'],
  SIN: ['Gardens by the Bay', 'Kampong Glam', 'Southern Ridges'],
  DPS: ['Ubud rice terraces', 'Uluwatu Temple', 'Sanur beachfront'],
  FCO: ['Colosseum and Forum', 'Trastevere walk', 'Villa Borghese'],
  LIS: ['Belém waterfront', 'Alfama neighborhood', 'LX Factory'],
  BKK: ['Grand Palace', 'Wat Pho', 'Chao Phraya river ferry'],
  BCN: ['Sagrada Família', 'Gothic Quarter', 'Barceloneta beach'],
  KEF: ['Hallgrímskirkja', 'Harpa waterfront', 'Golden Circle day trip'],
};

function getDestination(codeOrName) {
  const value = String(codeOrName || '').trim().toLowerCase();
  return destinations.find((place) => place.code.toLowerCase() === value || place.name.toLowerCase() === value);
}

module.exports = { destinations, hotels, attractions, getDestination };
