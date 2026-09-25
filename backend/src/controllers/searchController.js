const { destinations, search } = require('../providers/liteApiProvider');
const { buildOpportunity } = require('../services/costEngine');
exports.search = async (req, res, next) => { try {
  const input = req.body;
  if (!input.origin || !input.departureDate || !input.returnDate || Number(input.travelers) < 1) return res.status(400).json({ success: false, error: 'Origin, dates and at least one traveler are required' });
  if (new Date(input.returnDate) < new Date(input.departureDate)) return res.status(400).json({ success: false, error: 'Return date must be after departure date' });
  const selected = input.destination && input.destination !== 'Anywhere' ? destinations.filter((d) => d.name.toLowerCase() === input.destination.toLowerCase()) : destinations.slice(0, 6);
  if (!selected.length) return res.status(400).json({ success: false, error: 'Destination is not supported yet' });
  const duration = Math.max(1, Math.ceil((new Date(input.returnDate) - new Date(input.departureDate)) / 86400000));
  const request = { ...input, travelers: Number(input.travelers), duration };
  const opportunities = (await Promise.all(selected.map(async (destination) => {
    const { flight, hotels } = await search(request, destination);
    return hotels.map((hotel) => buildOpportunity({ request, destination, flight, hotel }));
  }))).flat().sort((a, b) => a.totalTripCost - b.totalTripCost).slice(0, 5);
  res.json({ success: true, opportunities });
} catch (e) { next(e); } };
