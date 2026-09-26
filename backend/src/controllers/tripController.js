const Trip = require('../models/Trip');
const toTrip = (body, userId) => ({
  userId, origin: body.origin, destination: body.destination,
  departureDate: body.departureDate, returnDate: body.returnDate,
  duration: body.duration, travelers: body.travelers, budget: body.budget,
  currency: body.currency, preferences: body.preferences || {},
  selectedFlight: body.flight || body.selectedFlight,
  selectedHotel: body.hotel || body.selectedHotel,
  estimatedFoodCost: body.estimatedFoodCost,
  estimatedLocalTransportCost: body.estimatedLocalTransportCost,
  estimatedActivitiesCost: body.estimatedActivitiesCost,
  mandatoryCosts: body.mandatoryCosts || 0, totalTripCost: body.totalTripCost,
  costPerPerson: body.costPerPerson, costPerDay: body.costPerDay, costBreakdown: body.costBreakdown || {},
  confidence: body.confidence, sources: body.sources || [],
  itinerary: body.itinerary || {},
});
exports.create = async (req, res, next) => { try {
  if (!req.body.destination || !req.body.departureDate || !req.body.returnDate) return res.status(400).json({ success: false, error: 'Destination and travel dates are required.' });
  const trip = await Trip.create(toTrip(req.body, req.user._id)); res.status(201).json({ success: true, trip });
} catch (e) { next(e); } };
exports.list = async (req, res, next) => { try { res.json({ success: true, trips: await Trip.find({ userId: req.user._id }).sort({ createdAt: -1 }) }); } catch (e) { next(e); } };
exports.get = async (req, res, next) => { try { const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id }); if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' }); res.json({ success: true, trip }); } catch (e) { next(e); } };
exports.update = async (req, res, next) => { try {
  const trip = await Trip.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: toTrip({ ...req.body, itinerary: req.body.itinerary }, req.user._id) }, { new: true, runValidators: true });
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  res.json({ success: true, trip });
} catch (e) { next(e); } };
exports.remove = async (req, res, next) => { try {
  const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  res.json({ success: true });
} catch (e) { next(e); } };
exports.itinerary = async (req, res, next) => { try {
  const trip = await Trip.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { itinerary: req.body.itinerary || req.body }, { new: true });
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  res.json({ success: true, trip });
} catch (e) { next(e); } };
exports.getItinerary = async (req, res, next) => { try {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id }).select('itinerary');
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  res.json({ success: true, itinerary: trip.itinerary || {} });
} catch (e) { next(e); } };
exports.optimize = async (req, res, next) => { try {
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  const baseline = Number(trip.totalTripCost || 0);
  const suggestions = [
    { id: 'stay-budget', type: 'budget', title: 'Choose a lower-cost stay', description: 'Compare the same trip with a budget-friendly accommodation option.', savings: Math.round((trip.costBreakdown?.hotel || 0) * 0.22), disruption: 'LOW', changes: { hotel: 'budget' } },
    { id: 'shift-dates', type: 'dates', title: 'Shift dates by two days', description: 'Flexible dates can expose lower fares; availability is not guaranteed.', savings: Math.round((trip.costBreakdown?.flight || 0) * 0.12), disruption: 'MEDIUM', changes: { dateShiftDays: 2 } },
    ...(Number(trip.duration) > 1 ? [{ id: 'shorter-stay', type: 'budget', title: 'Try one fewer night', description: 'Reduce accommodation and daily spending while keeping the destination.', savings: Math.round((Number(trip.costPerDay) || 0) * 0.8), disruption: 'HIGH', changes: { durationReduction: 1 } }] : []),
  ].filter((suggestion) => suggestion.savings > 0).map((suggestion) => {
    const disruptionWeight = suggestion.disruption === 'LOW' ? 1 : suggestion.disruption === 'MEDIUM' ? 1.5 : 2;
    return { ...suggestion, newTotal: Math.max(0, baseline - suggestion.savings), rankScore: Math.round((suggestion.savings / disruptionWeight) * 100) / 100 };
  }).sort((a, b) => b.rankScore - a.rankScore);
  res.json({ success: true, baseline, suggestions, notice: 'Savings are planning estimates. Confirm fare and schedule changes with providers.' });
} catch (e) { next(e); } };
