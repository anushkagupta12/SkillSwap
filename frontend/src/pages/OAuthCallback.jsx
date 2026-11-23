import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

/**
 * Where the API sends the browser after a successful provider sign-in. The session is
 * already in an httpOnly cookie; AuthProvider's startup refresh turns it into a user.
 */
export default function OAuthCallback() {
  const { user, loading, bootError, retryBoot } = useAuth()
  const navigate = useNavigate()
  const failed = useRef(false)

  // The cookie was set but the session couldn't be restored (server asleep, blocked cookie...).
  useEffect(() => {
    if (!loading && !user && !bootError && !failed.current) {
      failed.current = true
      navigate('/login?oauth_error=failed', { replace: true })
    }
  }, [loading, user, bootError, navigate])

  if (user) return <Navigate to="/" replace />

  if (!loading && bootError) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-4 h-[60vh] text-center px-6">
        <h1 className="font-display text-2xl">Can't reach the server</h1>
        <p className="text-ink-3">You're signed in with the provider. Check your connection and try again.</p>
        <button type="button" className="btn btn-dark" onClick={retryBoot}>Try again</button>
      </div>
    )
  }

  return (
    <div role="status" className="flex flex-col items-center justify-center gap-4 h-[60vh]">
      <Spinner />
      <p className="text-ink-3 text-sm">Signing you in…</p>
    </div>
  )
}
