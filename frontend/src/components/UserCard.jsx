import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { useToast } from '../context/ToastContext'
import Avatar from './Avatar'
import SwapButton from './SwapButton'

const scoreColor = (score) => (score >= 70 ? 'text-sage' : score >= 40 ? 'text-amber' : 'text-ink-3')

export default function UserCard({ user, onSwapSent }) {
  const { error } = useToast()
  const [relationship, setRelationship] = useState(user.relationship || 'none')
  const [loading, setLoading] = useState(false)

  const score = user.compatibilityScore || 0

  const sendRequest = async () => {
    if (relationship !== 'none') return
    setLoading(true)
    try {
      await api.post(`/api/users/${user._id}/swap-request`, { message: "Hi! I'd love to swap skills with you." })
      setRelationship('pending_sent')
      onSwapSent?.()
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'already_pending') setRelationship('pending_sent')
      else if (code === 'incoming_pending') setRelationship('pending_received')
      else if (code === 'already_connected') setRelationship('connected')
      else error(errorMessage(err, 'Could not send the request.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className="card card-hover p-5 flex flex-col gap-3.5 animate-fade-up">
      {/* A real link (keyboard + screen reader friendly) instead of a clickable div */}
      <Link
        to={`/user/${user._id}`}
        className="flex flex-col gap-3.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-light"
        aria-label={`View ${user.name}'s profile`}
      >
        <div className="flex items-start gap-3">
          <Avatar user={user} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="font-sans font-semibold text-ink truncate">{user.name}</h3>
            {user.location && <p className="text-xs text-ink-3 mt-0.5">{user.location}</p>}
          </div>
          {score > 0 && (
            <div className="text-right shrink-0">
              <div className={`font-display text-xl leading-none ${scoreColor(score)}`}>{score}%</div>
              <div className="text-[10px] text-ink-3 uppercase tracking-wide mt-0.5">match</div>
            </div>
          )}
        </div>

        {user.bio && <p className="text-xs text-ink-3 leading-relaxed line-clamp-2">{user.bio}</p>}

        <div className="flex flex-col gap-2">
          {user.skillsToTeach?.length > 0 && (
            <div>
              <p className="section-label mb-1">Teaches</p>
              <div className="flex flex-wrap gap-1">
                {user.skillsToTeach.slice(0, 3).map((s) => (
                  <span key={s.name} className="tag-teach">{s.name}</span>
                ))}
                {user.skillsToTeach.length > 3 && <span className="tag-teach">+{user.skillsToTeach.length - 3}</span>}
              </div>
            </div>
          )}
          {user.skillsToLearn?.length > 0 && (
            <div>
              <p className="section-label mb-1">Learning</p>
              <div className="flex flex-wrap gap-1">
                {user.skillsToLearn.slice(0, 3).map((s) => (
                  <span key={s.name} className="tag-learn">{s.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="flex gap-2 pt-1 border-t border-canvas-2 mt-auto">
        <Link to={`/user/${user._id}`} className="btn btn-outline btn-sm flex-1 justify-center">
          View profile
        </Link>
        <SwapButton
          relationship={relationship}
          busy={loading}
          onRequest={sendRequest}
          size="btn-sm"
          className="flex-1"
        />
      </div>
    </article>
  )
}
