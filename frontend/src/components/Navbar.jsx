import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import useSwapInbox from '../lib/useSwapInbox'
import Avatar from './Avatar'
import RequestRow from './RequestRow'

function BellIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function NotificationDropdown({ open, onClose, requests, loading, onResponded }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const pending = requests.filter((r) => r.status === 'pending')
  const past = requests.filter((r) => r.status !== 'pending').slice(0, 5)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Swap requests"
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-lift border border-canvas-3 overflow-hidden z-50 animate-fade-up"
      style={{ maxHeight: '80vh' }}
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-canvas-2 bg-canvas">
        <div className="flex items-center gap-2">
          <h2 className="font-sans font-semibold text-sm text-ink">Swap requests</h2>
          {pending.length > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-rose text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pending.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/requests" onClick={onClose} className="text-xs text-sage font-medium hover:underline">
            View all
          </Link>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border-2 border-canvas-3 border-t-sage-light rounded-full animate-spin" />
            <span className="text-sm text-ink-3">Loading…</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-canvas-2 flex items-center justify-center mb-3">
              <BellIcon className="w-5 h-5 text-ink-3" />
            </div>
            <p className="text-sm font-medium text-ink-3">No requests yet</p>
            <p className="text-xs text-ink-3 mt-1">When someone wants to swap skills, you'll see it here</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section aria-label="Pending requests">
                <p className="px-4 py-2 bg-canvas-2/50 border-b border-canvas-2 text-[10px] font-bold text-ink-3 uppercase tracking-widest">
                  Pending · {pending.length}
                </p>
                {pending.map((r) => (
                  <RequestRow key={r._id} req={r} compact onResponded={onResponded} />
                ))}
              </section>
            )}
            {past.length > 0 && (
              <section aria-label="Past requests">
                <p className="px-4 py-2 bg-canvas-2/50 border-b border-canvas-2 text-[10px] font-bold text-ink-3 uppercase tracking-widest">
                  Recent
                </p>
                {past.map((r) => (
                  <RequestRow key={r._id} req={r} compact onResponded={onResponded} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { receivedTick, totalUnread } = useSocket() || {}
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Fetch on sign-in and when a NEW request arrives (receivedTick) - not when a toast is dismissed.
  const { requests, loading, reload, markResponded } = useSwapInbox(!!user, receivedTick)
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const nav = [
    { to: '/browse', label: 'Browse' },
    { to: '/matches', label: 'Matches' },
    { to: '/chat', label: 'Messages', badge: totalUnread },
    { to: '/requests', label: 'Requests', badge: pendingCount },
  ]

  const linkCls = ({ isActive }) =>
    `relative text-sm transition-all ${
      isActive ? 'text-white border-b border-sage-light pb-0.5' : 'text-white/70 hover:text-white'
    }`

  const handleBell = () => {
    const opening = !open
    setOpen(opening)
    if (opening) reload()
  }

  const handleResponded = (id, status) => {
    if (status) markResponded(id, status)
    else reload()
  }

  const Badge = ({ n }) =>
    n > 0 ? (
      <span
        className="ml-1.5 inline-flex min-w-[16px] h-4 px-1 bg-rose text-white text-[9px] font-bold rounded-full items-center justify-center leading-none"
        aria-label={`${n} new`}
      >
        {n > 9 ? '9+' : n}
      </span>
    ) : null

  return (
    <nav className="sticky top-0 z-50 bg-ink border-b border-white/5" aria-label="Main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="font-display text-xl text-white shrink-0">
          Skill<span className="text-sage-light">Swap</span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-6">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkCls}>
                {n.label}
                <Badge n={n.badge} />
              </NavLink>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          {user ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleBell}
                  aria-label={pendingCount ? `Swap requests, ${pendingCount} pending` : 'Swap requests'}
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    open ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <BellIcon className="w-5 h-5" />
                  {pendingCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none border border-ink">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown
                  open={open}
                  onClose={() => setOpen(false)}
                  requests={requests}
                  loading={loading}
                  onResponded={handleResponded}
                />
              </div>

              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Your profile">
                <Avatar user={user} size="sm" />
                <span className="hidden sm:block text-sm text-white font-medium">{user.name?.split(' ')[0]}</span>
              </Link>

              <button
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
                className="btn btn-ghost btn-sm hidden sm:inline-flex"
              >
                Sign out
              </button>

              <button
                type="button"
                className="md:hidden w-9 h-9 rounded-full text-white/80 hover:bg-white/10 flex items-center justify-center"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>

      {user && menuOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-3 bg-ink">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls} onClick={() => setMenuOpen(false)}>
              {n.label}
              <Badge n={n.badge} />
            </NavLink>
          ))}
          <button
            type="button"
            className="text-left text-sm text-white/70 hover:text-white"
            onClick={async () => {
              setMenuOpen(false)
              await logout()
              navigate('/')
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
