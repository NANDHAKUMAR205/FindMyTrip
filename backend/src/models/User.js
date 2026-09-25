const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  currency: { type: String, default: 'USD' },
  travelStyle: { type: String, default: 'balanced' },
  preferredCabin: { type: String, default: 'economy' },
  interests: { type: [String], default: [] },
}, { _id: false });

module.exports = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  preferences: { type: preferenceSchema, default: () => ({}) },
}, { timestamps: true }));
