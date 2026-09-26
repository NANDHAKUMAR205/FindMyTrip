const airports = [
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'United States' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'New York', country: 'United States' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', country: 'United States' },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom' },
  { code: 'LGW', name: 'Gatwick', city: 'London', country: 'United Kingdom' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'ORY', name: 'Orly', city: 'Paris', country: 'France' },
  { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan' },
  { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE' },
  { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'DPS', name: 'Ngurah Rai International', city: 'Bali', country: 'Indonesia' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy' },
  { code: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal' },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { code: 'BCN', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain' },
  { code: 'KEF', name: 'Keflavík International', city: 'Reykjavik', country: 'Iceland' },
];

function resolveAirport(value) {
  const query = String(value || '').trim().toLowerCase();
  return airports.find((airport) => airport.code.toLowerCase() === query)
    || airports.find((airport) => airport.city.toLowerCase() === query)
    || airports.find((airport) => airport.name.toLowerCase() === query);
}

module.exports = { airports, resolveAirport };
