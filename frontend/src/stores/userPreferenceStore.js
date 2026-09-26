import api from '../api'

export function normalizeUser(user = {}) {
  return { ...user, preferences: { currency: 'USD', travelStyle: 'balanced', interests: [], ...(user.preferences || {}) } }
}

export async function savePreferences(preferences) {
  const { data } = await api.put('/users/preferences', preferences)
  return normalizeUser(data.user)
}
