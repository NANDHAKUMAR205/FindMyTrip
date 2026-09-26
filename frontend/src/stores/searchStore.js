import api from '../api'

const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0

export function normalizeOpportunity(item = {}) {
  const flight = item.flight || item.selectedFlight || {}
  const hotel = item.hotel || item.selectedHotel || {}
  const breakdown = item.costBreakdown || {}
  const totalTripCost = asNumber(item.totalTripCost)
  const budget = asNumber(item.budget)
  const remainingBudget = item.remainingBudget == null ? budget - totalTripCost : asNumber(item.remainingBudget)
  return {
    ...item,
    destination: String(item.destination || ''),
    destinationCode: String(item.destinationCode || ''),
    travelers: Math.max(1, asNumber(item.travelers) || 1),
    duration: Math.max(1, asNumber(item.duration) || 1),
    totalTripCost,
    budget,
    remainingBudget,
    overBudget: item.overBudget == null ? budget > 0 && totalTripCost > budget : Boolean(item.overBudget),
    currency: item.currency || 'USD',
    costPerPerson: asNumber(item.costPerPerson),
    costPerDay: asNumber(item.costPerDay),
    flight: { ...flight, price: asNumber(flight.price), source: flight.source || 'ESTIMATED' },
    hotel: { ...hotel, estimatedTotal: asNumber(hotel.estimatedTotal), costSource: hotel.costSource || 'ESTIMATED' },
    costBreakdown: Object.fromEntries(['flight', 'hotel', 'food', 'transport', 'activities', 'ground', 'mandatory'].map((key) => [key, asNumber(breakdown[key])])),
    estimatedFoodCost: asNumber(item.estimatedFoodCost),
    estimatedLocalTransportCost: asNumber(item.estimatedLocalTransportCost),
    estimatedActivitiesCost: asNumber(item.estimatedActivitiesCost),
    confidence: item.confidence || 'LOW',
    componentConfidence: item.componentConfidence || {},
  }
}

export async function runSearch(search, onProgress = () => {}) {
  const url = `${String(api.defaults.baseURL).replace(/\/$/, '')}/search`
  const token = localStorage.getItem('findmytrip_token')
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(search),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || `Search failed (${response.status})`)
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Progressive search is not supported by this browser.')
  const decoder = new TextDecoder()
  let pending = ''
  let result
  const consume = (line) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'opportunity') onProgress({ ...event, opportunity: normalizeOpportunity(event.opportunity) })
    else if (event.type === 'complete') result = {
      ...event.result,
      opportunities: (event.result.opportunities || []).map(normalizeOpportunity),
      providerStatus: event.result.providerStatus || {},
    }
    else if (event.type === 'error') throw new Error(event.error || 'Search could not be completed')
    else onProgress(event)
  }
  while (true) {
    const { done, value } = await reader.read()
    pending += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = pending.split('\n')
    pending = lines.pop() || ''
    lines.forEach(consume)
    if (done) break
  }
  if (pending) consume(pending)
  if (!result) throw new Error('Search ended before results were complete.')
  return result
}

export function normalizeDestination(item = {}) {
  return { ...item, id: String(item.id || item.code || ''), code: String(item.code || ''), hotels: Array.isArray(item.hotels) ? item.hotels : [], attractions: Array.isArray(item.attractions) ? item.attractions : [], weather: item.weather || null, providerStatus: item.providerStatus || {}, providerUnavailable: Boolean(item.providerUnavailable) }
}
