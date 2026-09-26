import api from '../api'

export function normalizeAlert(alert = {}) {
  return { ...alert, budget: Number(alert.budget) || 0, travelers: Math.max(1, Number(alert.travelers) || 1), enabled: alert.enabled !== false, currency: alert.currency || 'USD' }
}

export async function listAlerts() {
  const { data } = await api.get('/alerts')
  return (data.alerts || []).map(normalizeAlert)
}
