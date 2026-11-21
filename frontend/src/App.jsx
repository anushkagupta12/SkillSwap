import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider, useSocket } from './context/SocketContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Avatar from './components/Avatar'
import Spinner from './components/Spinner'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Browse from './pages/Browse'
import Matches from './pages/Matches'
import Chat from './pages/Chat'
import UserProfile from './pages/UserProfile'
import Profile from './pages/Profile'
import Requests from './pages/Requests'
import OAuthCallback from './pages/OAuthCallback'
import { ForgotPassword, ResetPassword, VerifyEmail } from './pages/AccountLinks'

// ── Route guards ─────────────────────────────────────────────────────────────
function Private({ children }) {
  const { user, loading, bootError, retryBoot } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Spinner />
      </div>
    )
  }
  // A network/server failure while restoring the session must not look like being signed out.
  if (!user && bootError) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-4 h-[60vh] text-center px-6">
        <h1 className="font-display text-2xl">Can't reach the server</h1>
        <p className="text-ink-3">Check your connection. The first request after a quiet period can take a few seconds.</p>
        <button type="button" className="btn btn-dark" onClick={retryBoot}>Try again</button>
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

function Public({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

// ── Real-time swap notifications (server-originated; auto-dismiss in the provider) ──
function SwapNotifOverlay() {
  const { swapNotifs, dismissSwapNotif } = useSocket() || {}
  const navigate = useNavigate()

  if (!swapNotifs?.length) return null

  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-3 max-w-sm w-[calc(100%-2rem)]">
      {swapNotifs.map((n) => (
        <div key={n.id} className="bg-ink border border-white/10 rounded-2xl shadow-lift p-4 flex items-start gap-3 animate-slide-in">
          <Avatar user={n.from} size="sm" />
          <div className="flex-1 min-w-0">
            {n.type === 'received' ? (
              <>
                <p className="text-sm font-semibold text-white">New swap request</p>
                <p className="text-xs text-white/70 mt-0.5">
                  <span className="text-white">{n.from?.name}</span> wants to swap skills with you
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">{n.status === 'accepted' ? 'Request accepted' : 'Request declined'}</p>
                <p className="text-xs text-white/70 mt-0.5">
                  <span className="text-white">{n.from?.name}</span> {n.status === 'accepted' ? 'accepted' : 'declined'} your swap request
                </p>
              </>
            )}
            <div className="flex gap-3 mt-2.5">
              {n.type === 'received' && (
                <button type="button" onClick={() => { navigate('/requests'); dismissSwapNotif(n.id) }} className="text-[11px] font-semibold text-sage-light hover:underline">
                  View request →
                </button>
              )}
              {n.type === 'response' && n.status === 'accepted' && (
                <button type="button" onClick={() => { navigate(`/user/${n.from?._id}`); dismissSwapNotif(n.id) }} className="text-[11px] font-semibold text-sage-light hover:underline">
                  View profile →
                </button>
              )}
              <button type="button" onClick={() => dismissSwapNotif(n.id)} className="text-[11px] text-white/60 hover:text-white ml-auto">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NotFound() {
  return (
    <div className="text-center py-24 px-6">
      <h1 className="font-display text-3xl mb-3">Page not found</h1>
      <p className="text-ink-3 mb-6">That page doesn't exist.</p>
      <a href="/" className="btn btn-dark">Go to home page</a>
    </div>
  )
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/register" element={<Public><Register /></Public>} />
          <Route path="/forgot-password" element={<Public><ForgotPassword /></Public>} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/browse" element={<Private><Browse /></Private>} />
          <Route path="/matches" element={<Private><Matches /></Private>} />
          <Route path="/requests" element={<Private><Requests /></Private>} />
          <Route path="/chat" element={<Private><Chat /></Private>} />
          <Route path="/chat/:conversationId" element={<Private><Chat /></Private>} />
          <Route path="/user/:id" element={<Private><UserProfile /></Private>} />
          <Route path="/profile" element={<Private><Profile /></Private>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
      <SwapNotifOverlay />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
