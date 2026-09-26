import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import OpportunityCard from '../components/OpportunityCard'
import { runSearch } from '../stores/searchStore'

const destinationOptions = ['Anywhere', 'New York', 'London', 'Paris', 'Tokyo', 'Dubai', 'Singapore', 'Bali', 'Rome', 'Lisbon', 'Bangkok', 'Barcelona', 'Reykjavik']
const defaultStart = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10)
const defaultEnd = new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10)

export default function Search() {
  const [form, setForm] = useState({
    origin: '', destination: 'Anywhere', departureDate: defaultStart, returnDate: '',
    earliestDate: defaultStart, latestDate: defaultEnd, duration: 5, flexible: true,
    travelers: 1, budget: '', currency: 'USD', preferences: { travelStyle: 'balanced' },
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [airports, setAirports] = useState([])
  const [progressItems, setProgressItems] = useState([])
  const [progressLabel, setProgressLabel] = useState('')
  const navigate = useNavigate()
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.get('/airports', { params: { q: form.origin } }).then(({ data }) => setAirports((data.airports || []).map((airport) => ({ code: String(airport.code), label: `${airport.city} — ${airport.name}` })))).catch(() => setAirports([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [form.origin])
  const setFlexibility = (flexible) => setForm((current) => ({ ...current, flexible, returnDate: flexible ? '' : current.returnDate }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setStage(0)
    setProgressItems([])
    setProgressLabel('')
    setError('')
    const interval = window.setInterval(() => setStage((current) => Math.min(current + 1, 3)), 850)
    try {
      const data = await runSearch({ ...form, budget: form.budget || undefined, duration: Number(form.duration), travelers: Number(form.travelers) }, (event) => {
        if (event.type === 'opportunity') setProgressItems((current) => current.some((item) => item.id === event.opportunity.id) ? current : [...current, event.opportunity])
        if (event.type === 'progress') setProgressLabel(`${event.destination} checked · ${event.completed} of ${event.total} destinations`)
      })
      navigate('/results', { state: { opportunities: data.opportunities, search: form, searchId: data.searchId, providerStatus: data.providerStatus, notice: data.notice } })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'We could not find trips right now.')
    } finally {
      window.clearInterval(interval)
      setBusy(false)
    }
  }

  return <section className="page">
    <div className="page-heading"><span className="eyebrow">DISCOVER YOUR NEXT ESCAPE</span><h1>Start with a place—or a budget.</h1><p>Pick a destination first to explore stays, sights and weather, or search everywhere to find a trip that fits.</p></div>
    <form className="search-form" onSubmit={submit}>
      <label className="primary-destination">Where would you like to go?
        <select value={form.destination} onChange={(event) => change('destination', event.target.value)}>{destinationOptions.map((destination) => <option key={destination}>{destination}</option>)}</select>
      </label>
      <div className="form-row"><label>Flying from<input required maxLength="3" list="airport-options" value={form.origin} onChange={(event) => change('origin', event.target.value.toUpperCase())} placeholder="Airport code (e.g. JFK)" /><datalist id="airport-options">{airports.map((airport) => <option key={airport.code} value={airport.code}>{airport.label}</option>)}</datalist></label><label>Travelers<input required min="1" max="9" type="number" value={form.travelers} onChange={(event) => change('travelers', event.target.value)} /></label><label>Total trip budget<input type="number" min="1" value={form.budget} onChange={(event) => change('budget', event.target.value)} placeholder="Optional" /></label></div>
      <div className="form-row"><label>Currency<select value={form.currency} onChange={(event) => change('currency', event.target.value)}>{['USD', 'EUR', 'GBP', 'INR'].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label>Travel style<select value={form.preferences.travelStyle} onChange={(event) => setForm({ ...form, preferences: { ...form.preferences, travelStyle: event.target.value } })}><option value="balanced">Balanced</option><option value="budget">Budget smart</option><option value="comfort">Comfort</option></select></label></div>
      <fieldset className="date-choice"><legend>When would you like to travel?</legend><label><input type="radio" checked={form.flexible} onChange={() => setFlexibility(true)} /> Flexible dates</label><label><input type="radio" checked={!form.flexible} onChange={() => setFlexibility(false)} /> Exact dates</label></fieldset>
      {form.flexible ? <div className="form-row"><label>Earliest departure<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.earliestDate} onChange={(event) => change('earliestDate', event.target.value)} /></label><label>Latest departure<input required type="date" min={form.earliestDate} value={form.latestDate} onChange={(event) => change('latestDate', event.target.value)} /></label><label>Trip length<select value={form.duration} onChange={(event) => change('duration', event.target.value)}><option value="3">Long weekend · 3 nights</option><option value="5">5 nights</option><option value="7">1 week</option><option value="10">10 nights</option><option value="14">2 weeks</option></select></label></div> : <div className="form-row"><label>Going<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.departureDate} onChange={(event) => change('departureDate', event.target.value)} /></label><label>Returning<input required type="date" min={form.departureDate} value={form.returnDate} onChange={(event) => change('returnDate', event.target.value)} /></label><label>Travel style<select value={form.preferences.travelStyle} onChange={(event) => setForm({ ...form, preferences: { ...form.preferences, travelStyle: event.target.value } })}><option value="balanced">Balanced</option><option value="budget">Budget smart</option><option value="comfort">Comfort</option></select></label></div>}
      {error && <div role="alert" className="error">{error}</div>}
      {busy && <div className="search-progress" aria-live="polite"><b>{['Checking destinations and seasons…', 'Scanning sample fares and stays…', 'Adding local costs and attractions…', 'Ranking trips against your budget…'][stage]}</b><div><span style={{ width: `${Math.min((stage + 1) * 25, 100)}%` }} /></div></div>}
      {busy && progressLabel && <p className="source-note">{progressLabel}</p>}
      {busy && progressItems.length > 0 && <div className="progress-results"><h2>Early matches</h2>{progressItems.slice(0, 3).map((item) => <OpportunityCard key={item.id} item={item} />)}</div>}
      <button className="button" disabled={busy}>{busy ? 'Finding your options…' : 'Find my trips →'}</button>
    </form>
    <p className="source-note">Mock provider data is clearly labeled as estimates; live prices appear only when a provider is configured. FindMyTrip does not book or charge for travel.</p>
  </section>
}
