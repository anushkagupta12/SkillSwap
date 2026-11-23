import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useToast } from '../context/ToastContext'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'
import SwapButton from '../components/SwapButton'
import RatingForm from '../components/RatingForm'

const scoreColor = (s) => (s >= 70 ? 'text-sage' : s >= 40 ? 'text-amber' : 'text-ink-3')

export default function UserProfile() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const { onlineUsers } = useSocket() || {}
  const { success, error } = useToast()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [chatting, setChatting] = useState(false)

  const load = useCallback(
    (signal) =>
      api
        .get(`/api/users/${id}`, { signal })
        .then(({ data }) => {
          setProfile(data.user)
          setNotFound(false)
        })
        .catch((err) => {
          if (signal?.aborted) return
          setProfile(null)
          setNotFound(true)
          return err
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false)
        }),
    [id],
  )

  // Reset on every id change so the previous person's profile never lingers while the next one loads.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setProfile(null)
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const requestSwap = async () => {
    if (!profile || swapping) return
    setSwapping(true)
    try {
      await api.post(`/api/users/${id}/swap-request`, {
        message: `Hi ${profile.name?.split(' ')[0]}! I'd love to swap skills with you.`,
      })
      setProfile((p) => ({ ...p, relationship: 'pending_sent' }))
      success('Swap request sent!')
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'already_pending') setProfile((p) => ({ ...p, relationship: 'pending_sent' }))
      else if (code === 'incoming_pending') setProfile((p) => ({ ...p, relationship: 'pending_received' }))
      else if (code === 'already_connected') setProfile((p) => ({ ...p, relationship: 'connected' }))
      error(errorMessage(err, 'Could not send request.'))
    } finally {
      setSwapping(false)
    }
  }

  const startChat = async () => {
    setChatting(true)
    try {
      const { data } = await api.post('/api/chat/conversations', {
        recipientId: id,
        teachSkill: profile.overlap?.theyCanTeachMe?.[0]?.name || profile.skillsToTeach?.[0]?.name,
        learnSkill: profile.overlap?.iCanTeachThem?.[0]?.name || profile.skillsToLearn?.[0]?.name,
      })
      navigate(`/chat/${data.conversation._id}`)
    } catch (err) {
      error(errorMessage(err, 'Could not start conversation.'))
      setChatting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (notFound || !profile) {
    return (
      <div className="text-center py-24">
        <h1 className="font-display text-2xl mb-4">User not found</h1>
        <Link to="/browse" className="btn btn-dark">Browse members</Link>
      </div>
    )
  }

  const isMe = me?._id === profile._id
  const score = profile.compatibilityScore || 0
  // Live presence when known, else the value the API returned.
  const isOnline = onlineUsers && profile._id in onlineUsers ? onlineUsers[profile._id] : profile.isOnline
  const { theyCanTeachMe = [], iCanTeachThem = [] } = profile.overlap || {}
  const relationship = profile.relationship

  return (
    <div className="min-h-screen bg-canvas py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.1fr] gap-5 animate-fade-up">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="relative shrink-0">
                <Avatar user={profile} size="xl" />
                {isOnline && <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-sage-light border-2 border-white" aria-hidden="true" />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl leading-tight">{profile.name}</h1>
                {profile.location && <p className="text-sm text-ink-3 mt-0.5">{profile.location}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-violet-pale text-violet text-xs font-medium px-2.5 py-1 rounded-full">
                    {profile.connectionsCount || 0} {profile.connectionsCount === 1 ? 'connection' : 'connections'}
                  </span>
                  {profile.ratingCount > 0 && (
                    <span className="bg-amber-pale text-amber text-xs font-medium px-2.5 py-1 rounded-full">
                      ★ {profile.ratingAvg} ({profile.ratingCount})
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isOnline ? 'bg-sage-pale text-sage-dark' : 'bg-canvas-2 text-ink-3'}`}>
                    {isOnline ? 'Online now' : 'Offline'}
                  </span>
                </div>
              </div>
              {score > 0 && !isMe && (
                <div className="text-center shrink-0">
                  <div className={`font-display text-4xl leading-none ${scoreColor(score)}`}>{score}%</div>
                  <div className="text-[10px] text-ink-3 uppercase tracking-wider mt-1">match</div>
                </div>
              )}
            </div>

            {profile.bio && <p className="text-sm text-ink-3 leading-relaxed mb-5">{profile.bio}</p>}

            {!isMe ? (
              <div className="flex gap-3 pt-5 border-t border-canvas-2">
                <button type="button" onClick={startChat} disabled={chatting} className="btn btn-outline flex-1 justify-center">
                  {chatting ? <Spinner className="w-4 h-4" /> : 'Message'}
                </button>
                <SwapButton relationship={relationship} busy={swapping} onRequest={requestSwap} className="flex-1" />
              </div>
            ) : (
              <Link to="/profile" className="btn btn-outline mt-5 self-start">Edit your profile</Link>
            )}
          </div>

          {relationship === 'connected' && !isMe && (
            <RatingForm userId={profile._id} firstName={profile.name?.split(' ')[0]} onRated={() => load()} />
          )}

          {profile.reviews?.length > 0 && (
            <section className="card p-5" aria-label="Reviews">
              <h2 className="section-label mb-3">Reviews ({profile.ratingCount})</h2>
              <ul className="flex flex-col gap-3">
                {profile.reviews.slice(0, 5).map((r, i) => (
                  <li key={i} className="bg-canvas rounded-xl p-3.5">
                    <p className="text-amber-light" aria-label={`${r.score} out of 5 stars`}>
                      {'★'.repeat(r.score)}<span className="text-canvas-3">{'★'.repeat(5 - r.score)}</span>
                    </p>
                    {r.comment && <p className="text-xs text-ink-3 italic mt-1">“{r.comment}”</p>}
                    <p className="text-[11px] text-ink-3 mt-1">— {r.from?.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">
          {profile.skillsToTeach?.length > 0 && (
            <section className="card p-5" aria-label="Skills they teach">
              <h2 className="section-label mb-3">Skills they teach</h2>
              <ul className="flex flex-col gap-2.5">
                {profile.skillsToTeach.map((s) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span className="tag-teach">{s.name}</span>
                    <span className="text-xs text-ink-3">{s.category}</span>
                    <span className="text-xs text-ink-3 ml-auto capitalize">{s.level}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.skillsToLearn?.length > 0 && (
            <section className="card p-5" aria-label="Skills they want to learn">
              <h2 className="section-label mb-3">Skills they want to learn</h2>
              <ul className="flex flex-col gap-2.5">
                {profile.skillsToLearn.map((s) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span className="tag-learn">{s.name}</span>
                    <span className="text-xs text-ink-3">{s.category}</span>
                    <span className="text-xs text-ink-3 ml-auto capitalize">{s.level}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The overlap is computed by the server - the client no longer re-implements matching. */}
          {score > 0 && !isMe && (theyCanTeachMe.length > 0 || iCanTeachThem.length > 0) && (
            <section className="card p-5 bg-sage-pale border-sage-pale" aria-label="Why you match">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-label text-sage-dark">Why you're a {score}% match</h2>
                <span className={`font-display text-2xl ${scoreColor(score)}`}>{score}%</span>
              </div>
              {theyCanTeachMe.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-sage-dark mb-2">They can teach you:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {theyCanTeachMe.map((s) => <span key={s.name} className="tag-teach">{s.name}</span>)}
                  </div>
                </div>
              )}
              {iCanTeachThem.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-dark mb-2">You can teach them:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {iCanTeachThem.map((s) => <span key={s.name} className="tag-learn">{s.name}</span>)}
                  </div>
                </div>
              )}
              <SwapButton relationship={relationship} busy={swapping} onRequest={requestSwap} size="btn-sm" className="w-full mt-4" />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
