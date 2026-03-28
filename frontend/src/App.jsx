import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider, useSocket } from './context/SocketContext'
import { ToastProvider, useToast } from './context/ToastContext'
import Navbar   from './components/Navbar'
import Avatar   from './components/Avatar'
import Spinner  from './components/Spinner'
import Home        from './pages/Home'
import Login       from './pages/Login'
import Register    from './pages/Register'
import Browse      from './pages/Browse'
import Matches     from './pages/Matches'
import Chat        from './pages/Chat'
import UserProfile from './pages/UserProfile'
import Profile     from './pages/Profile'

// ── Route guards ─────────────────────────────────────────────────────────────
function Private({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <Spinner />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function Public({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/browse" replace /> : children
}

// ── Real-time swap notification toasts ───────────────────────────────────────
function SwapNotifOverlay() {
  const { swapNotifs, dismissSwapNotif } = useSocket() || {}
  const navigate = useNavigate()

  if (!swapNotifs?.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {swapNotifs.map(notif => (
        <div
          key={notif.id}
          className="bg-ink border border-white/10 rounded-2xl shadow-lift p-4 flex items-start gap-3 animate-slide-in"
        >
          <Avatar user={notif.from} size="sm" />
          <div className="flex-1 min-w-0">
            {notif.type === 'received' ? (
              <>
                <p className="text-sm font-semibold text-white">
                  New swap request 🤝
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  <span className="text-white/90">{notif.from?.name}</span> wants to swap skills with you
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">
                  {notif.status === 'accepted' ? 'Request accepted! 🎉' : 'Request declined'}
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  <span className="text-white/90">{notif.from?.name}</span>{' '}
                  {notif.status === 'accepted' ? 'accepted your swap request' : 'declined your swap request'}
                </p>
              </>
            )}
            <div className="flex gap-2 mt-2.5">
              {notif.type === 'received' && (
                <button
                  onClick={() => { navigate('/profile'); dismissSwapNotif(notif.id) }}
                  className="text-[11px] font-semibold text-sage-light hover:text-sage-light/80 transition-colors"
                >
                  View request →
                </button>
              )}
              {notif.type === 'response' && notif.status === 'accepted' && (
                <button
                  onClick={() => { navigate(`/user/${notif.from?._id}`); dismissSwapNotif(notif.id) }}
                  className="text-[11px] font-semibold text-sage-light hover:text-sage-light/80 transition-colors"
                >
                  View profile →
                </button>
              )}
              <button
                onClick={() => dismissSwapNotif(notif.id)}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── App routes ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/login"    element={<Public><Login /></Public>} />
        <Route path="/register" element={<Public><Register /></Public>} />
        <Route path="/browse"   element={<Private><Browse /></Private>} />
        <Route path="/matches"  element={<Private><Matches /></Private>} />
        <Route path="/chat"                 element={<Private><Chat /></Private>} />
        <Route path="/chat/:conversationId" element={<Private><Chat /></Private>} />
        <Route path="/user/:id" element={<Private><UserProfile /></Private>} />
        <Route path="/profile"  element={<Private><Profile /></Private>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
      <SwapNotifOverlay />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
