const mongoose = require('mongoose');

module.exports = mongoose.models.Alert || mongoose.model('Alert', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  origin: { type: String, required: true, uppercase: true },
  destination: { type: String, default: 'Anywhere' },
  budget: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'USD' },
  travelers: { type: Number, default: 1 },
  enabled: { type: Boolean, default: true },
  lastCheckedAt: Date,
  lastTriggeredAt: Date,
  channel: { type: String, enum: ['in_app', 'email', 'push'], default: 'in_app' },
  lastNotification: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true }));
