import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useSocket } from '../context/SocketContext'
import useSwapInbox from '../lib/useSwapInbox'
import RequestRow from '../components/RequestRow'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'

const STATUS_STYLE = {
  pending: 'bg-amber-pale text-amber',
  accepted: 'bg-sage-pale text-sage-dark',
  declined: 'bg-canvas-3 text-ink-3',
}

export default function Requests() {
  const { receivedTick } = useSocket() || {}
  const [tab, setTab] = useState('received')
  const inbox = useSwapInbox(true, receivedTick)
  const [sent, setSent] = useState({ items: [], loading: true, error: false })

  useEffect(() => {
    if (tab !== 'sent') return undefined
    const controller = new AbortController()
    setSent((s) => ({ ...s, loading: true, error: false }))
    api
      .get('/api/users/requests/sent', { signal: controller.signal })
      .then(({ data }) => setSent({ items: data.requests.filter((r) => r.to?._id), loading: false, error: false }))
      .catch((err) => {
        if (!controller.signal.aborted) setSent({ items: [], loading: false, error: true })
        return err
      })
    return () => controller.abort()
  }, [tab])

  const pending = inbox.requests.filter((r) => r.status === 'pending')
  const history = inbox.requests.filter((r) => r.status !== 'pending')

  const onResponded = (id, status) => (status ? inbox.markResponded(id, status) : inbox.reload())

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-ink px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl text-white">Swap requests</h1>
          <p className="text-white/70 text-sm mt-1">Accept the swaps you'd like to start, and track the ones you sent.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div role="tablist" aria-label="Request type" className="flex gap-2 mb-6">
          {[
            ['received', `Received${pending.length ? ` (${pending.length})` : ''}`],
            ['sent', 'Sent'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`btn btn-sm ${tab === key ? 'btn-dark' : 'btn-outline'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'received' ? (
          inbox.error ? (
            <p role="alert" className="text-center py-16 text-ink-3">
              Couldn't load your requests.{' '}
              <button type="button" className="text-sage underline" onClick={inbox.reload}>Retry</button>
            </p>
          ) : inbox.loading && inbox.requests.length === 0 ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : inbox.requests.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="font-display text-2xl mb-2">No requests yet</h2>
              <p className="text-ink-3 mb-6">When someone asks to swap skills with you, it shows up here.</p>
              <Link to="/matches" className="btn btn-dark">See your matches</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {pending.length > 0 && (
                <section className="card overflow-hidden" aria-label="Pending requests">
                  <h2 className="px-4 py-3 border-b border-canvas-2 bg-canvas text-sm font-semibold">Pending ({pending.length})</h2>
                  {pending.map((r) => <RequestRow key={r._id} req={r} onResponded={onResponded} />)}
                </section>
              )}
              {history.length > 0 && (
                <section className="card overflow-hidden" aria-label="Past requests">
                  <h2 className="px-4 py-3 border-b border-canvas-2 bg-canvas text-sm font-semibold">History</h2>
                  {history.map((r) => <RequestRow key={r._id} req={r} onResponded={onResponded} />)}
                </section>
              )}
            </div>
          )
        ) : sent.error ? (
          <p role="alert" className="text-center py-16 text-ink-3">Couldn't load your sent requests.</p>
        ) : sent.loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : sent.items.length === 0 ? (
          <p className="text-center py-16 text-ink-3">You haven't sent any requests yet.</p>
        ) : (
          <ul className="card overflow-hidden">
            {sent.items.map((r) => (
              <li key={r._id} className="flex items-center gap-3 px-4 py-3.5 border-b border-canvas-2/60 last:border-0">
                <Avatar user={r.to} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link to={`/user/${r.to._id}`} className="text-sm font-semibold text-ink hover:underline truncate block">{r.to.name}</Link>
                  <p className="text-xs text-ink-3">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
