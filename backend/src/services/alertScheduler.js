const axios = require('axios');
const Alert = require('../models/Alert');
const { destinations } = require('../providers/catalog');
const { convertCurrency } = require('./currencyService');

async function refreshAlerts() {
  const alerts = await Alert.find({ enabled: true }).sort({ lastCheckedAt: 1 }).limit(50);
  for (const alert of alerts) {
    const candidates = destinations.filter((place) => alert.destination === 'Anywhere' || place.code === alert.destination || place.name.toLowerCase() === alert.destination.toLowerCase());
    const estimatedUsd = candidates.reduce((best, place) => Math.min(best, (place.flight + place.hotel * 4) * alert.travelers + place.daily.reduce((sum, cost) => sum + cost, 0) * 4 * alert.travelers), Infinity);
    const estimatedTotal = convertCurrency(estimatedUsd, 'USD', alert.currency);
    const triggered = estimatedTotal <= alert.budget;
    alert.lastCheckedAt = new Date();
    if (triggered) {
      alert.lastTriggeredAt = new Date();
      const notification = { type: alert.channel, message: `An estimated trip may fit your ${alert.currency} ${alert.budget} alert. Verify current prices before booking.`, createdAt: new Date() };
      if (['email', 'push'].includes(alert.channel) && process.env.ALERT_WEBHOOK_URL) {
        try {
          await axios.post(process.env.ALERT_WEBHOOK_URL, { alertId: String(alert._id), userId: String(alert.userId), estimatedTotal, currency: alert.currency, ...notification }, { timeout: 4000 });
        } catch (error) {
          console.warn(`Scheduled alert delivery failed: ${error.message}`);
          notification.delivery = 'unavailable';
        }
      } else if (['email', 'push'].includes(alert.channel)) notification.delivery = 'not_configured';
      alert.lastNotification = notification;
    }
    await alert.save();
  }
}

function startAlertScheduler() {
  const timer = setInterval(() => {
    refreshAlerts().catch((error) => console.error('Scheduled alert refresh failed:', error.message));
  }, 30 * 60 * 1000);
  timer.unref();
  refreshAlerts().catch((error) => console.error('Initial alert refresh failed:', error.message));
}

module.exports = { refreshAlerts, startAlertScheduler };
