import { useEffect, useState } from 'react'
import api from '../api'
import { listAlerts, normalizeAlert } from '../stores/alertStore'

const places = ['Anywhere', 'New York', 'London', 'Paris', 'Tokyo', 'Dubai', 'Singapore', 'Bali', 'Rome']

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ origin: '', destination: 'Anywhere', budget: '', currency: 'USD', travelers: 1, channel: 'in_app' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    listAlerts().then((data) => { if (active) setAlerts(data) }).catch((err) => { if (active) setError(err.response?.data?.error || 'Could not load alerts') })
    return () => { active = false }
  }, [])
  const create = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/alerts', { ...form, budget: Number(form.budget), travelers: Number(form.travelers) })
      setAlerts((current) => [normalizeAlert(data.alert), ...current])
      setForm({ ...form, budget: '' })
      setMessage('Alert created. It will be checked on a scheduled refresh; sample prices remain estimates.')
    } catch (err) { setError(err.response?.data?.error || 'Could not create alert') }
    finally { setBusy(false) }
  }
  const refresh = async (id) => {
    try {
      const { data } = await api.post(`/alerts/${id}/refresh`)
      setAlerts((current) => current.map((alert) => alert._id === id ? normalizeAlert(data.alert) : alert))
      setMessage(data.triggered ? data.notification?.message : 'No matching price found during this refresh.')
    } catch (err) { setError(err.response?.data?.error || 'Could not refresh this alert') }
  }
  const toggle = async (alert) => {
    try {
      const { data } = await api.put(`/alerts/${alert._id}`, { enabled: !alert.enabled })
      setAlerts((current) => current.map((entry) => entry._id === alert._id ? normalizeAlert(data.alert) : entry))
    } catch (err) { setError(err.response?.data?.error || 'Could not update alert') }
  }
  const remove = async (id) => {
    try {
      await api.delete(`/alerts/${id}`)
      setAlerts((current) => current.filter((alert) => alert._id !== id))
    } catch (err) { setError(err.response?.data?.error || 'Could not delete alert') }
  }
  return <section className="page"><div className="page-heading"><span className="eyebrow">PRICE WATCH</span><h1>Know when a trip fits.</h1><p>Create an alert for a route and budget. Scheduled checks compare estimated trip costs; sample prices are not live fare guarantees.</p></div>
    <form className="search-form alert-form" onSubmit={create}><div className="form-row"><label>From airport<input required maxLength="3" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value.toUpperCase() })} placeholder="JFK" /></label><label>Destination<select value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })}>{places.map((place) => <option key={place}>{place}</option>)}</select></label><label>Maximum trip budget<input required type="number" min="1" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></label></div><div className="form-row"><label>Currency<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>{['USD', 'EUR', 'GBP', 'INR'].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label>Travelers<input min="1" max="9" type="number" value={form.travelers} onChange={(event) => setForm({ ...form, travelers: event.target.value })} /></label><label>Notification<select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}><option value="in_app">In app</option><option value="email">Email (webhook required)</option><option value="push">Push (webhook required)</option></select></label></div>{error && <div role="alert" className="error">{error}</div>}<button className="button" disabled={busy}>{busy ? 'Saving…' : 'Create alert'}</button></form>
    {message && <p role="status" className="success alert-message">{message}</p>}
    <div className="alert-list">{alerts.map((alert) => <article className="alert-card" key={alert._id}><div><span className="eyebrow">{alert.origin} → {alert.destination}</span><h2>{alert.currency} {alert.budget.toLocaleString()} trip budget</h2><p>{alert.enabled ? 'Active' : 'Paused'} · {alert.travelers} travelers · {alert.channel} notification</p><small>Last checked: {alert.lastCheckedAt ? new Date(alert.lastCheckedAt).toLocaleString() : 'Waiting for scheduled refresh'}</small>{alert.lastNotification && <p className="success">{alert.lastNotification.message}</p>}</div><div className="alert-actions"><button className="button secondary" onClick={() => refresh(alert._id)}>Check now</button><button className="button secondary" onClick={() => toggle(alert)}>{alert.enabled ? 'Pause' : 'Resume'}</button><button className="text-button" onClick={() => remove(alert._id)}>Delete</button></div></article>)}</div>
  </section>
}
