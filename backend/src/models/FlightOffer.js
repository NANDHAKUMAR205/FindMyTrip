const mongoose = require('mongoose');

module.exports = mongoose.models.FlightOffer || mongoose.model('FlightOffer', new mongoose.Schema({
  searchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Search', index: true },
  destinationCode: { type: String, index: true },
  provider: String,
  price: Number,
  currency: String,
  offer: { type: mongoose.Schema.Types.Mixed, default: {} },
  observedAt: { type: Date, default: Date.now },
}, { timestamps: true }));
