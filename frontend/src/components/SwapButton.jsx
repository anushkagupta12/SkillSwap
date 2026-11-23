import { Link } from 'react-router-dom'
import Spinner from './Spinner'

/**
 * One place that renders the right swap call-to-action for a server-provided `relationship`:
 * none | pending_sent | pending_received | connected | self
 */
export default function SwapButton({ relationship, busy, onRequest, className = '', size = '' }) {
  const base = `btn ${size} justify-center ${className}`

  if (relationship === 'connected') {
    return (
      <span className={`${base} bg-sage-pale text-sage-dark cursor-default`}>✓ Connected</span>
    )
  }
  if (relationship === 'pending_sent') {
    return (
      <button type="button" disabled className={`${base} bg-sage-pale text-sage-dark`}>
        ✓ Requested
      </button>
    )
  }
  if (relationship === 'pending_received') {
    return (
      <Link to="/requests" className={`${base} bg-amber-pale text-amber`}>
        Respond to request →
      </Link>
    )
  }
  return (
    <button type="button" onClick={onRequest} disabled={busy} className={`${base} btn-dark`}>
      {busy ? <Spinner className="w-4 h-4" /> : 'Request swap →'}
    </button>
  )
}
