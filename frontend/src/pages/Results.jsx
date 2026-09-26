import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import OpportunityCard from '../components/OpportunityCard'
export default function Results() {
  const { state } = useLocation()
  const items = state?.opportunities || []
  const resultKey = state?.searchId || JSON.stringify(state?.search || {})
  const [visibility, setVisibility] = useState({ key: '', count: 0 })
  const visible = visibility.key === resultKey ? visibility.count : 0
  useEffect(() => {
    if (!items.length) return undefined
    const timer = window.setInterval(() => setVisibility((current) => {
      const count = current.key === resultKey ? current.count : 0
      return { key: resultKey, count: Math.min(items.length, count + 3) }
    }), 140)
    return () => window.clearInterval(timer)
  }, [items.length, resultKey])
  return <section className="page">
    <div className="results-heading"><div><span className="eyebrow">YOUR SHORTLIST</span><h1>{items.length ? `${items.length} trips worth considering.` : 'Your next trip starts here.'}</h1><p>Ranked by complete trip cost. Price estimates are clearly labeled.</p></div><Link to="/search" className="button secondary">Edit search</Link></div>
    {state?.providerStatus && <div className="provider-status">Providers · Flights: {state.providerStatus.flights || 'MOCK'} · Stays: {state.providerStatus.hotels || 'MOCK'} · Activities: {state.providerStatus.activities || 'MOCK'}</div>}
    {items.length ? <div className="results-list">{items.slice(0, visible).map((item) => <OpportunityCard item={item} key={item.id || `${item.destination}-${item.totalTripCost}`} />)}</div> : <div className="empty"><h2>{state?.notice || 'No results to show yet.'}</h2><p>Try a wider date window, a different origin, or a higher trip budget.</p><Link to="/search" className="button">Start a search</Link></div>}
    {!items.length && state?.search && <div className="results-tools"><Link className="button secondary" to="/alerts">Create a price alert</Link></div>}
  </section>
}
