const mongoose = require('mongoose');

module.exports = mongoose.models.Search || mongoose.model('Search', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  origin: { type: String, required: true, uppercase: true },
  destination: { type: String, default: 'Anywhere' },
  dates: { type: mongoose.Schema.Types.Mixed, default: {} },
  budget: Number,
  travelers: { type: Number, default: 1 },
  currency: { type: String, default: 'USD' },
}, { timestamps: true }));
