import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { normalizeDestination, normalizeOpportunity } from '../stores/searchStore'
import { saveTrip } from '../stores/tripStore'

const money = (value, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0)

export default function TripDetails() {
  const { state } = useLocation()
  const { id, destinationCode } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(state?.opportunity ? normalizeOpportunity(state.opportunity) : null)
  const [destination, setDestination] = useState(null)
  const [nearbyAirports, setNearbyAirports] = useState([])
  const [savedTripId, setSavedTripId] = useState(destinationCode ? null : id || null)
  const [saved, setSaved] = useState(Boolean(id))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [optimizer, setOptimizer] = useState([])
  const [message, setMessage] = useState('')
  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    if (id && !destinationCode) {
      api.get(`/trips/${id}`).then(({ data }) => setItem(normalizeOpportunity({ ...data.trip, flight: data.trip.selectedFlight, hotel: data.trip.selectedHotel }))).catch((err) => setError(err.response?.data?.error || 'Could not load this trip'))
    }
  }, [id, destinationCode])
  useEffect(() => {
    if (!item?.destinationCode) return undefined
    let active = true
    api.get(`/destinations/${item.destinationCode}`, { params: { currency: item.currency, duration: item.duration, departureDate: item.departureDate } })
      .then(({ data }) => { if (active) setDestination(normalizeDestination(data.destination)) })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Destination details are temporarily unavailable') })
    return () => { active = false }
  }, [item?.destinationCode, item?.currency, item?.duration, item?.departureDate])
  useEffect(() => {
    if (!item?.destinationCode) return undefined
    let active = true
    api.get('/nearby-airports', { params: { destination: item.destinationCode, currency: item.currency, fare: item.costBreakdown.flight } })
      .then(({ data }) => {
        if (active) setNearbyAirports((data.airports || []).map((airport) => ({ ...airport, groundTravelCost: Number(airport.groundTravelCost) || 0, estimatedAirfare: Number(airport.estimatedAirfare) || 0, groundTravelMinutes: Number(airport.groundTravelMinutes) || 0, totalCost: Number(airport.totalCost) || 0 })))
      })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Nearby airport information is unavailable') })
    return () => { active = false }
  }, [item?.destinationCode, item?.currency, item?.costBreakdown?.flight])

  const hotels = destination?.hotels || []
  const recalculate = (trip) => {
    const totalTripCost = Object.values(trip.costBreakdown || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
    return {
      ...trip,
      totalTripCost,
      costPerPerson: Math.round(totalTripCost / trip.travelers),
      costPerDay: Math.round(totalTripCost / trip.duration),
      remainingBudget: trip.budget - totalTripCost,
      overBudget: trip.budget > 0 && totalTripCost > trip.budget,
    }
  }
  const updateHotel = (hotel) => {
    const total = Number(hotel.estimatedTotal || hotel.pricePerNight * Math.max(1, item.duration))
    setItem(recalculate({ ...item, hotel: { ...hotel, estimatedTotal: total }, costBreakdown: { ...item.costBreakdown, hotel: total } }))
  }
  const selectAirport = (airport) => {
    setItem(recalculate({ ...item, arrivalAirport: airport.code, flight: { ...item.flight, price: airport.estimatedAirfare, arrivalAirport: airport.code }, costBreakdown: { ...item.costBreakdown, flight: airport.estimatedAirfare, ground: airport.groundTravelCost } }))
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      let currentId = savedTripId
      if (currentId) await api.put(`/trips/${currentId}`, item)
      else {
        const trip = await saveTrip(item)
        currentId = trip._id
        setSavedTripId(currentId)
        setSaved(true)
      }
      setMessage('Trip saved to your collection.')
      return currentId
    } catch (err) { setError(err.response?.status === 401 ? 'Sign in to save this trip.' : (err.response?.data?.error || 'Could not save trip')) }
    finally { setBusy(false) }
  }

  const loadOptimizer = async () => {
    const tripId = savedTripId || await save()
    if (!tripId) return
    try {
      const { data } = await api.post(`/trips/${tripId}/optimize`, { type: 'all' })
      setOptimizer(data.suggestions || [])
    } catch (err) { setError(err.response?.data?.error || 'Could not create suggestions') }
  }

  const applySuggestion = async (suggestion) => {
    let next = { ...item }
    if (suggestion.changes?.hotel === 'budget' && hotels[1]) {
      const chosen = hotels[1]
      const totalHotel = chosen.pricePerNight * item.duration
      next = recalculate({ ...next, hotel: { ...chosen, estimatedTotal: totalHotel }, costBreakdown: { ...item.costBreakdown, hotel: totalHotel } })
    } else if (suggestion.changes?.durationReduction) {
      const days = Math.max(1, item.duration - 1)
      const hotelReduction = Math.min(item.costBreakdown.hotel, Number(item.hotel.pricePerNight || 0))
      const foodReduction = Math.round(item.costBreakdown.food / item.duration)
      const transportReduction = Math.round(item.costBreakdown.transport / item.duration)
      const activityReduction = Math.round(item.costBreakdown.activities / item.duration)
      next = recalculate({
        ...next,
        duration: days,
        returnDate: new Date(new Date(item.departureDate).getTime() + days * 86400000).toISOString().slice(0, 10),
        hotel: { ...item.hotel, estimatedTotal: item.costBreakdown.hotel - hotelReduction },
        estimatedFoodCost: item.estimatedFoodCost - foodReduction,
        estimatedLocalTransportCost: item.estimatedLocalTransportCost - transportReduction,
        estimatedActivitiesCost: item.estimatedActivitiesCost - activityReduction,
        costBreakdown: { ...item.costBreakdown, hotel: item.costBreakdown.hotel - hotelReduction, food: item.costBreakdown.food - foodReduction, transport: item.costBreakdown.transport - transportReduction, activities: item.costBreakdown.activities - activityReduction },
      })
    } else if (suggestion.changes?.dateShiftDays) {
      const shift = Number(suggestion.changes.dateShiftDays)
      const departure = new Date(new Date(item.departureDate).getTime() + shift * 86400000)
      const returning = new Date(new Date(item.returnDate).getTime() + shift * 86400000)
      const fareSavings = Math.min(item.costBreakdown.flight, suggestion.savings)
      const flightPrice = item.costBreakdown.flight - fareSavings
      next = recalculate({ ...next, departureDate: departure.toISOString().slice(0, 10), returnDate: returning.toISOString().slice(0, 10), flight: { ...item.flight, price: flightPrice }, costBreakdown: { ...item.costBreakdown, flight: flightPrice } })
    }
    setItem(next)
    try {
      await api.put(`/trips/${savedTripId}`, next)
      setMessage(`Applied: ${suggestion.title}. Review updated estimate before booking.`)
    } catch (err) { setError(err.response?.data?.error || 'Could not apply suggestion') }
  }

  const costRows = useMemo(() => Object.entries(item?.costBreakdown || {}).filter(([, value]) => Number(value) > 0), [item])
  if (!item) return <section className="page empty"><h2>Trip not found</h2><p>Choose a destination from your search results to explore stays, things to do and local conditions.</p><button className="button" onClick={() => navigate('/search')}>Search again</button></section>

  const checkBooking = async () => {
    try {
      await api.post('/booking/click', { ...(savedTripId ? { tripId: savedTripId } : {}), offerId: item.flight.id })
      setClicked(true)
    } catch (err) { setError(err.response?.data?.error || 'Could not open provider information') }
  }

  return <section className="page">
    <Link className="back" to="/search">← New search</Link>
    <div className="detail-heading"><div><span className="eyebrow">{item.confidenceLabel || 'Planning estimate'} · {item.destinationCode}</span><h1>{item.destination}</h1><p>{item.departureDate} → {item.returnDate} · {item.duration} days · {item.travelers} travelers</p></div><button className="button" onClick={save} disabled={busy}>{saved ? '✓ Update saved trip' : 'Save this trip'}</button></div>
    {item.confidence === 'LOW' && <div className="notice"><b>Planning estimate, not a live quote.</b> Confirm fare and room availability with providers before making plans.</div>}
    <div className="detail-grid"><div className="detail-main">
      <div className="detail-card"><h2>Getting there</h2><p className="big-price">{money(item.costBreakdown.flight, item.currency)} <small>round trip · {item.flight.source || 'ESTIMATED'}</small></p><p>{item.flight.airline || 'Sample Airways'} · {item.flight.stops === 0 ? 'Nonstop' : `${item.flight.stops || 1} stop`} · {item.flight.departureTime || 'Times to be confirmed'}</p><button className="button secondary" onClick={checkBooking}>Check provider options</button>{clicked && <p className="notice">Fare not revalidated—the price may have changed. Confirm directly with a provider. FindMyTrip does not process bookings.</p>}</div>
      {item.flight.transitVisaCheckRequired && <div className="notice"><b>Long stopover:</b> One or more layovers are at least 20 hours. Check transit and visa rules with official authorities before choosing this itinerary.</div>}
      <div className="detail-card"><h2>Nearby airports · full arrival cost</h2><p>Choose by estimated airfare plus ground transfer and time, not airfare alone.</p><div className="attraction-list">{nearbyAirports.map((airport) => <div key={airport.code}><span><b>{airport.code}{item.arrivalAirport === airport.code ? ' · selected' : ''}</b><small>{airport.explanation} · {airport.groundTravelMinutes} min ground transfer · airfare {money(airport.estimatedAirfare, item.currency)}</small></span><span><strong>{money(airport.totalCost, item.currency)}</strong><button className="text-button" onClick={() => selectAirport(airport)}>Choose</button></span></div>)}</div></div>
      <div className="detail-card"><h2>Choose your accommodation</h2>{destination?.providerUnavailable && <p className="notice">Live hotel offers are unavailable; showing clearly labeled sample options.</p>}{hotels.length ? <div className="stay-options">{hotels.map((hotel) => <label className={`stay-option ${item.hotel?.id === hotel.id ? 'selected' : ''}`} key={hotel.id}><input type="radio" name="hotel" checked={item.hotel?.id === hotel.id} onChange={() => updateHotel(hotel)} /><span><b>{hotel.name}</b><small>{hotel.category || 'Stay'} · {hotel.rating ? `${hotel.rating}/5` : 'Rating not available'} · {hotel.costSource || hotel.source || 'ESTIMATED'}</small><small>{(hotel.amenities || []).join(' · ')}</small></span><strong>{money(hotel.pricePerNight, item.currency)}<small>/night</small></strong></label>)}</div> : <p>Loading accommodation options…</p>}</div>
      <div className="detail-card"><h2>Local attractions</h2><p>Explore and choose what interests you. Activity prices are estimates and optional.</p><div className="attraction-list">{(destination?.attractions || []).map((activity) => <div key={activity.id}><span><b>{activity.name}</b><small>{activity.category} · {activity.source || 'ESTIMATED'}</small></span><strong>{activity.price == null ? 'Price varies' : activity.price ? money(activity.price, activity.currency || 'USD') : 'Free'}</strong></div>)}</div></div>
      <div className="detail-card"><h2>Weather outlook</h2><p>{destination?.weather?.summary || 'Loading typical conditions…'}</p>{destination?.weather?.temperatureC && <p>Typical range: {destination.weather.temperatureC[0]}–{destination.weather.temperatureC[1]}°C · {destination.weather.source}</p>}{destination?.providerStatus && <small className="source-note">Weather: {destination.providerStatus.weather} · Attractions: {destination.providerStatus.activities}</small>}</div>
      <div className="detail-card"><h2>Make this trip work better</h2><p>Suggestions are ranked by estimated savings and disruption. Flexible date changes need fare revalidation.</p><button className="button secondary" onClick={loadOptimizer}>Show optimizer suggestions</button>{optimizer.length > 0 && <div className="suggestion-list">{optimizer.map((suggestion) => <article key={suggestion.id}><div><b>{suggestion.title}</b><p>{suggestion.description}</p><small>Save about {money(suggestion.savings, item.currency)} · {suggestion.disruption} disruption</small></div><button className="button secondary" onClick={() => applySuggestion(suggestion)}>Apply</button></article>)}</div>}</div>
    </div><aside className="cost-card"><span className="eyebrow">COMPLETE ESTIMATE</span><h2>{money(item.totalTripCost, item.currency)}</h2>{costRows.map(([key, value]) => <div className="cost-line" key={key}><span>{key}</span><b>{money(value, item.currency)}</b></div>)}<hr /><div className="cost-line"><span>Per person</span><b>{money(item.costPerPerson, item.currency)}</b></div><div className="cost-line"><span>Per day</span><b>{money(item.costPerDay, item.currency)}</b></div>{item.budget > 0 && <p className={item.overBudget ? 'over-text' : 'good-text'}>{item.overBudget ? `${money(Math.abs(item.remainingBudget), item.currency)} over your budget` : `${money(item.remainingBudget, item.currency)} remaining`}</p>}</aside></div>
    {message && <div role="status" className="success">{message}</div>}{error && <div role="alert" className="error">{error} {error.includes('Sign in') && <Link to="/login">Log in</Link>}</div>}
  </section>
}
