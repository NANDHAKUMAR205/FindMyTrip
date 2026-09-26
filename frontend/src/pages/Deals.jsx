import { useEffect, useState } from 'react'
import api from '../api'

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/deals').then(({ data }) => {
      const entries = Array.isArray(data.deals) ? data.deals.map((deal) => ({ ...deal, sampleSize: Number(deal.sampleSize) || 0, percentBelowMedian: Number(deal.percentBelowMedian) || 0 })) : []
      setDeals(entries)
      setNotice(data.notice || '')
    }).catch((err) => setError(err.response?.data?.error || 'Price insights are unavailable right now')).finally(() => setLoading(false))
  }, [])
  return <section className="page"><div className="page-heading"><span className="eyebrow">PRICE INTELLIGENCE</span><h1>Evidence before excitement.</h1><p>We only call something a deal when recent route observations meet the minimum sample threshold. No unverifiable “best price” claims.</p></div>{loading ? <div className="loading">Checking observed prices…</div> : error ? <div role="alert" className="error">{error}</div> : deals.length ? <div className="deal-list">{deals.map((deal) => <article className="deal-card" key={deal.route}><div><span className="eyebrow">{deal.route}</span><h2>{deal.percentBelowMedian}% below observed median</h2><p>{deal.sampleSize} recent observations · {deal.confidence}</p></div><strong>{deal.currentPrice} {deal.route.split('-').at(-1)}</strong></article>)}</div> : <div className="notice">{notice || 'There are not enough recent observations to make a deal claim yet.'}</div>}</section>
}
