const mongoose = require('mongoose');

module.exports = mongoose.models.Destination || mongoose.model('Destination', new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  country: String,
  countryCode: String,
  region: String,
  popularity: { type: Number, default: 50 },
  seasonality: { type: mongoose.Schema.Types.Mixed, default: {} },
  airports: { type: [String], default: [] },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true }));
