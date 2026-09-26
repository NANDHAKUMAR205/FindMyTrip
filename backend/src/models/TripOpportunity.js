const mongoose = require('mongoose');

module.exports = mongoose.models.TripOpportunity || mongoose.model('TripOpportunity', new mongoose.Schema({
  searchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Search', index: true },
  destinationCode: { type: String, index: true },
  totalTripCost: Number,
  costBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  confidence: String,
  opportunity: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true }));
