const mongoose = require('mongoose');

module.exports = mongoose.models.PriceObservation || mongoose.model('PriceObservation', new mongoose.Schema({
  origin: { type: String, required: true, uppercase: true, index: true },
  destinationCode: { type: String, required: true, uppercase: true, index: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  confidence: { type: String, enum: ['LIVE', 'RECENT', 'ESTIMATED', 'USER_INPUT'], default: 'ESTIMATED' },
  observedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true }));
