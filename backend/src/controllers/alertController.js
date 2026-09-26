const axios = require('axios');
const Alert = require('../models/Alert');
const { resolveAirport } = require('../providers/airports');
const { getDestination } = require('../providers/catalog');
const { convertCurrency, normalizeCurrency } = require('../services/currencyService');

exports.list = async (req, res, next) => {
  try { res.json({ success: true, alerts: await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 }) }); }
  catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const origin = resolveAirport(req.body.origin)?.code;
    const destination = String(req.body.destination || 'Anywhere').trim();
    const budget = Number(req.body.budget);
    if (!origin || !Number.isFinite(budget) || budget <= 0) return res.status(400).json({ success: false, error: 'Choose a supported origin airport and enter a positive budget.' });
    if (destination.toLowerCase() !== 'anywhere' && !getDestination(destination)) return res.status(400).json({ success: false, error: 'Choose a supported destination.' });
    const channel = ['email', 'push'].includes(req.body.channel) ? req.body.channel : 'in_app';
    const currency = normalizeCurrency(req.body.currency);
    const alert = await Alert.create({ userId: req.user._id, origin, destination: destination.toLowerCase() === 'anywhere' ? 'Anywhere' : getDestination(destination).name, budget, currency, travelers: Math.min(9, Math.max(1, Number(req.body.travelers || 1))), channel });
    res.status(201).json({ success: true, alert });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.enabled === 'boolean') update.enabled = req.body.enabled;
    if (req.body.budget != null && Number(req.body.budget) > 0) update.budget = Number(req.body.budget);
    if (['email', 'in_app', 'push'].includes(req.body.channel)) update.channel = req.body.channel;
    const alert = await Alert.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: update }, { new: true, runValidators: true });
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true });
  } catch (error) { next(error); }
};

exports.refresh = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.id, userId: req.user._id });
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    alert.lastCheckedAt = new Date();
    const { destinations } = require('../providers/catalog');
    const matches = destinations.filter((place) => alert.destination === 'Anywhere' || place.code === alert.destination || place.name.toLowerCase() === alert.destination.toLowerCase());
    const cheapestUsd = matches.reduce((best, place) => Math.min(best, (place.flight + place.hotel * 4) * alert.travelers + place.daily.reduce((a, b) => a + b, 0) * 4 * alert.travelers), Infinity);
    const cheapest = convertCurrency(cheapestUsd, 'USD', alert.currency);
    const triggered = cheapest <= alert.budget;
    let notification = null;
    if (triggered) {
      alert.lastTriggeredAt = new Date();
      notification = { type: alert.channel, message: `An estimated trip may fit your ${alert.currency} ${alert.budget} alert. Prices are estimates and should be checked before booking.` };
      if (['email', 'push'].includes(alert.channel) && process.env.ALERT_WEBHOOK_URL) {
        try { await axios.post(process.env.ALERT_WEBHOOK_URL, { userId: String(req.user._id), alertId: String(alert._id), ...notification }, { timeout: 4000 }); }
        catch (error) { console.warn(`Alert notification delivery failed: ${error.message}`); notification.delivery = 'unavailable'; }
      } else if (['email', 'push'].includes(alert.channel)) notification.delivery = 'not_configured';
      alert.lastNotification = { ...notification, createdAt: new Date() };
    }
    await alert.save();
    res.json({ success: true, alert, triggered, notification });
  } catch (error) { next(error); }
};
