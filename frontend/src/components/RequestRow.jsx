import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { useToast } from '../context/ToastContext'
import Avatar from './Avatar'

/** One incoming swap request with accept / decline. Shared by the bell dropdown and the Requests page. */
export default function RequestRow({ req, onResponded, compact = false }) {
  const { success, error } = useToast()
  const [busy, setBusy] = useState(null)
  const sender = req.from
  if (!sender?._id) return null // sender account no longer exists

  const isPending = req.status === 'pending'

  const respond = async (status) => {
    setBusy(status)
    try {
      await api.put(`/api/users/requests/${req._id}`, { status })
      success(status === 'accepted' ? `Connected with ${sender.name?.split(' ')[0]}!` : 'Request declined.')
      onResponded?.(req._id, status)
    } catch (err) {
      error(errorMessage(err))
      // Someone (another tab) already handled it: reflect the real state.
      if (err.response?.data?.code === 'already_responded') onResponded?.(req._id, null)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`flex flex-col gap-3 px-4 py-3.5 border-b border-canvas-2/60 last:border-0 ${!isPending ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar user={sender} size="sm" />
        <div className="flex-1 min-w-0">
          <Link to={`/user/${sender._id}`} className="text-sm font-semibold text-ink truncate block hover:underline">
            {sender.name}
          </Link>
          <p className="text-xs text-ink-3 mt-0.5">
            {isPending ? 'wants to swap skills with you' : req.status === 'accepted' ? 'Accepted' : 'Declined'}
          </p>
        </div>
        {!isPending && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              req.status === 'accepted' ? 'bg-sage-pale text-sage-dark' : 'bg-canvas-3 text-ink-3'
            }`}
          >
            {req.status}
          </span>
        )}
      </div>

      {!compact && req.message && isPending && (
        <p className="text-sm text-ink-3 bg-canvas rounded-xl px-3.5 py-2.5 ml-12">“{req.message}”</p>
      )}

      {isPending && (
        <div className="flex flex-wrap gap-1 pl-12">
          {sender.skillsToTeach?.slice(0, 2).map((s) => (
            <span key={s.name} className="tag-teach text-[10px] py-0.5 px-2">{s.name}</span>
          ))}
          {sender.skillsToLearn?.slice(0, 1).map((s) => (
            <span key={s.name} className="tag-learn text-[10px] py-0.5 px-2">{s.name}</span>
          ))}
        </div>
      )}

      {isPending && (
        <div className="flex gap-2 pl-12">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => respond('declined')}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-canvas-3 text-ink-3 hover:bg-canvas-2 transition-colors disabled:opacity-50"
          >
            {busy === 'declined' ? '…' : 'Decline'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => respond('accepted')}
            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-sage text-white hover:bg-sage-dark transition-colors disabled:opacity-50"
          >
            {busy === 'accepted' ? '…' : 'Accept'}
          </button>
        </div>
      )}
    </div>
  )
}
