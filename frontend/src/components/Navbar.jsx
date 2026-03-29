import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useToast } from '../context/ToastContext'
import { api } from '../context/AuthContext'
import Avatar from './Avatar'

function BellIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function NotifRow({ req, onRespond }) {
  const { socket } = useSocket()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  const respond = async (e, status) => {
    e.stopPropagation()
    setLoading(status)
    try {
      await api.put(`/api/users/requests/${req._id}`, { status })
      socket?.emit('swap:request:respond', { targetUserId: req.from._id, status })
      success(status === 'accepted'
        ? `Connected with ${req.from.name?.split(' ')[0]}! 🎉`
        : 'Request declined.')
      onRespond(req._id, status)
    } catch (err) {
      error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  const isPending = req.status === 'pending'

  return (
    <div
      onClick={() => navigate(`/user/${req.from._id}`)}
      className={`flex flex-col gap-3 px-4 py-3.5 border-b border-canvas-2/60 last:border-0 cursor-pointer hover:bg-canvas transition-colors ${!isPending ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar user={req.from} size="sm" />
          {isPending && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-light border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{req.from.name}</p>
          <p className="text-xs text-ink-4 mt-0.5">
            {isPending
              ? 'wants to swap skills with you'
              : req.status === 'accepted' ? '✓ Accepted' : 'Declined'}
          </p>
        </div>
        {!isPending && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            req.status === 'accepted' ? 'bg-sage-pale text-sage-dark' : 'bg-canvas-3 text-ink-4'
          }`}>
            {req.status}
          </span>
        )}
      </div>

      {isPending && (
        <div className="flex flex-wrap gap-1 pl-12">
          {req.from.skillsToTeach?.slice(0, 2).map((s, i) => (
            <span key={i} className="tag-teach text-[10px] py-0.5 px-2">{s.name}</span>
          ))}
          {req.from.skillsToLearn?.slice(0, 1).map((s, i) => (
            <span key={i} className="tag-learn text-[10px] py-0.5 px-2">{s.name}</span>
          ))}
        </div>
      )}

      {isPending && (
        <div className="flex gap-2 pl-12" onClick={e => e.stopPropagation()}>
          <button
            disabled={!!loading}
            onClick={e => respond(e, 'declined')}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-canvas-3 text-ink-3 hover:bg-canvas-2 transition-colors disabled:opacity-50"
          >
            {loading === 'declined' ? '…' : 'Decline'}
          </button>
          <button
            disabled={!!loading}
            onClick={e => respond(e, 'accepted')}
            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-sage-light text-white hover:bg-sage transition-colors disabled:opacity-50"
          >
            {loading === 'accepted' ? '…' : '✓ Accept'}
          </button>
        </div>
      )}
    </div>
  )
}

function NotificationDropdown({ open, onClose, requests, loading, onRespond }) {
  const navigate = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

const safeRequests = Array.isArray(requests) ? requests : [];

const pending = safeRequests.filter(r => r.status === 'pending');
const past    = safeRequests.filter(r => r.status !== 'pending');
  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-lift border border-canvas-3 overflow-hidden z-50 animate-fade-up"
      style={{ maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-canvas-2 bg-canvas">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-ink">Swap Requests</h3>
          {pending.length > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-rose-light text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pending.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {safeRequests.length > 0 && (
            <button
              onClick={() => { navigate('/profile'); onClose() }}
              className="text-xs text-sage font-medium hover:underline"
            >
              View all
            </button>
          )}
          <button onClick={onClose} className="text-ink-4 hover:text-ink transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
        {(loading || safeRequests === null) ? (
  <div className="flex items-center justify-center py-12 gap-3">
    <div className="w-5 h-5 border-2 border-canvas-3 border-t-sage-light rounded-full animate-spin" />
    <span className="text-sm text-ink-4">Loading…</span>
  </div>
) : safeRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-canvas-2 flex items-center justify-center mb-3">
              <BellIcon className="w-5 h-5 text-ink-4" />
            </div>
            <p className="text-sm font-medium text-ink-3">No requests yet</p>
            <p className="text-xs text-ink-4 mt-1">When someone wants to swap skills, you'll see it here</p>
          </div>
        ) : (
          <>
            {(safeRequests?.length ?? 0) > 0 && (
              <div>
                <div className="px-4 py-2 bg-canvas-2/50 border-b border-canvas-2">
                  <p className="text-[10px] font-bold text-ink-4 uppercase tracking-widest">
                    Pending · {pending.length}
                  </p>
                </div>
                {pending.map(r => (
                  <NotifRow key={r._id} req={r} onRespond={onRespond} />
                ))}
              </div>
            )}
            {past.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-canvas-2/50 border-b border-canvas-2">
                  <p className="text-[10px] font-bold text-ink-4 uppercase tracking-widest">
                    Past · {past.length}
                  </p>
                </div>
                {past.map(r => (
                  <NotifRow key={r._id} req={r} onRespond={onRespond} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Navbar() {
  const { user, logout }                     = useAuth()
  const { swapNotifs, dismissSwapNotif }     = useSocket() || {}
  const { pathname }                         = useLocation()
  const navigate                             = useNavigate()
  const [dropdownOpen, setDropdownOpen]      = useState(false)
  const [requests, setRequests] = useState(null)
  const [loadingReqs, setLoadingReqs]        = useState(false)
  const [hasLoaded, setHasLoaded]            = useState(false)

  const nav = [
    { to: '/browse',  label: 'Browse' },
    { to: '/matches', label: 'Matches' },
    { to: '/chat',    label: 'Messages' },
  ]

  const isActive = to => pathname.startsWith(to)
    ? 'text-white border-b border-sage-light pb-0.5'
    : 'text-white/50 hover:text-white/80'

  const loadRequests = useCallback(async () => {
  setLoadingReqs(true)
  try {
    const { data } = await api.get('/api/users/requests/inbox')
    setRequests(data.requests || [])
    setHasLoaded(true)
  } catch (e) {
    console.error('Failed to load requests:', e)
  } finally {
    setLoadingReqs(false)
  }
}, [])

  // Load once when user signs in
useEffect(() => {
  if (user) loadRequests()
}, [user]) // eslint-disable-line react-hooks/exhaustive-deps

// Re-fetch when a new real-time swap request arrives
useEffect(() => {
  if (swapNotifs?.some(n => n.type === 'received')) {
    loadRequests()
  }
}, [swapNotifs]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = (requests || []).filter(r => r.status === 'pending').length
  const handleBellClick = () => {
  const isOpening = !dropdownOpen
  setDropdownOpen(v => !v)
  if (isOpening) loadRequests() // always refresh when opening
}

  const handleRespond = (reqId, status) => {
  setRequests(prev => (prev || []).map(r => r._id === reqId ? { ...r, status } : r))
  swapNotifs?.forEach(n => {
    const matched = (requests || []).find(r => r._id === reqId)
    if (matched && n.from?._id === matched.from?._id) dismissSwapNotif?.(n.id)
  })
}

  return (
    <nav className="sticky top-0 z-50 bg-ink border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        <Link to="/" className="font-display text-xl text-white shrink-0">
          Skill<span className="text-sage-light">Swap</span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-6">
            {nav.map(n => (
              <Link key={n.to} to={n.to} className={`text-sm transition-all ${isActive(n.to)}`}>
                {n.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          {user ? (
            <>
              {/* Bell icon with dropdown */}
              <div className="relative">
                <button
                  onClick={handleBellClick}
                  aria-label="Swap requests"
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all
                    ${dropdownOpen
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <BellIcon className="w-5 h-5" />
                  {pendingCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-rose-light text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none border border-ink">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown
                  open={dropdownOpen}
                  onClose={() => setDropdownOpen(false)}
                  requests={requests}
                  loading={loadingReqs}
                  onRespond={handleRespond}
                />
              </div>

              {/* Avatar */}
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar user={user} size="sm" />
                <span className="hidden sm:block text-sm text-white font-medium">
                  {user.name?.split(' ')[0]}
                </span>
              </Link>

              <button
                onClick={() => { logout(); navigate('/') }}
                className="btn btn-ghost btn-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}