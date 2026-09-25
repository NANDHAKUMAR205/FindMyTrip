const mongoose = require('mongoose');

module.exports = mongoose.model('Trip', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  origin: String, destination: { type: String, required: true },
  departureDate: Date, returnDate: Date, duration: Number, travelers: { type: Number, default: 1 },
  budget: Number, currency: { type: String, default: 'USD' },
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  selectedFlight: { type: mongoose.Schema.Types.Mixed, default: null },
  selectedHotel: { type: mongoose.Schema.Types.Mixed, default: null },
  estimatedFoodCost: Number, estimatedLocalTransportCost: Number, estimatedActivitiesCost: Number,
  mandatoryCosts: { type: Number, default: 0 },
  totalTripCost: Number, costPerPerson: Number,
  costBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  confidence: String, sources: { type: [String], default: [] },
  itinerary: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true }));
