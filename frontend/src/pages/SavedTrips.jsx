import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { listTrips } from '../stores/tripStore'

const money = (value, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0)

export default function SavedTrips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    listTrips().then(setTrips).catch((err) => setError(err.response?.data?.error || 'Could not load saved trips')).finally(() => setLoading(false))
  }, [])
  const remove = async (event, tripId) => {
    event.preventDefault()
    try {
      await api.delete(`/trips/${tripId}`)
      setTrips((current) => current.filter((trip) => trip._id !== tripId))
    } catch (err) { setError(err.response?.data?.error || 'Could not remove this trip') }
  }
  return <section className="page"><div className="page-heading"><span className="eyebrow">YOUR COLLECTION</span><h1>Saved trips.</h1><p>Ideas you decided are worth keeping close.</p></div>{loading ? <div className="loading">Loading saved trips…</div> : error && !trips.length ? <div role="alert" className="error">{error}</div> : trips.length ? <div className="saved-list">{trips.map((trip) => <article className="saved-card" key={trip._id}><Link to={`/trips/${trip._id}`} className="saved-card-main"><span className="eyebrow">{trip.destination} · {trip.confidenceLabel || `${trip.confidence || 'LOW'} confidence`}</span><h2>{trip.departureDate?.slice(0, 10)} → {trip.returnDate?.slice(0, 10)}</h2><p>{trip.duration} days · {trip.travelers} travelers</p></Link><strong>{money(trip.totalTripCost, trip.currency)}</strong><button className="text-button" onClick={(event) => remove(event, trip._id)}>Remove</button></article>)}</div> : <div className="empty"><h2>No saved trips yet.</h2><p>Search for an escape and save the ones that feel right.</p><Link to="/search" className="button">Explore trips</Link></div>}{error && trips.length > 0 && <div role="alert" className="error">{error}</div>}</section>
}
