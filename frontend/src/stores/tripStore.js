import api from '../api'
import { normalizeOpportunity } from './searchStore'

export function normalizeTrip(trip = {}) {
  const normalized = normalizeOpportunity({
    ...trip,
    flight: trip.selectedFlight || trip.flight,
    hotel: trip.selectedHotel || trip.hotel,
  })
  return { ...trip, ...normalized, _id: trip._id, selectedFlight: normalized.flight, selectedHotel: normalized.hotel, costPerDay: Number(trip.costPerDay || normalized.costPerDay) || 0 }
}

export async function listTrips() {
  const { data } = await api.get('/trips')
  return (data.trips || []).map(normalizeTrip)
}

export async function saveTrip(opportunity) {
  const { data } = await api.post('/trips', opportunity)
  return normalizeTrip(data.trip)
}
