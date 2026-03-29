import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useToast } from '../context/ToastContext'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'

export default function UserProfile() {
  const { id }          = useParams()
  const { user: me }    = useAuth()
  const { socket, onlineUsers } = useSocket()
  const { success, error } = useToast()
  const navigate        = useNavigate()

  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [swapping,  setSwapping]  = useState(false)
  const [swapSent,  setSwapSent]  = useState(false)
  const [chatting,  setChatting]  = useState(false)

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(({ data }) => setProfile(data.user))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const requestSwap = async () => {
    if (swapSent || swapping) return
    setSwapping(true)
    try {
      await api.post(`/api/users/${id}/swap-request`, {
        message: `Hi ${profile.name?.split(' ')[0]}! I'd love to swap skills with you.`,
      })
      setSwapSent(true)
      // Real-time notify recipient
      socket?.emit('swap:request:send', { targetUserId: id })
      success('Swap request sent!')
    } catch (e) {
      const msg = e.response?.data?.message || 'Could not send request.'
      if (msg.toLowerCase().includes('already')) setSwapSent(true)
      error(msg)
    } finally {
      setSwapping(false)
    }
  }

  const startChat = async () => {
    setChatting(true)
    try {
      const { data } = await api.post('/chat/conversations', {
        recipientId: id,
        teachSkill: profile.skillsToTeach?.[0]?.name,
        learnSkill: profile.skillsToLearn?.[0]?.name,
      })
      navigate(`/chat/${data.conversation._id}`)
    } catch {
      error('Could not start conversation.')
      setChatting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (!profile) return (
    <div className="text-center py-24">
      <h3 className="font-display text-2xl mb-4">User not found</h3>
      <a href="/browse" className="btn btn-dark">Browse users</a>
    </div>
  )

  const isMe        = me?._id === id
  const score       = profile.compatibilityScore || 0
  const isOnline    = onlineUsers?.[id]
  const scoreColor  = score >= 70 ? 'text-sage' : score >= 40 ? 'text-amber' : 'text-ink-4'

  // Skills overlap for compatibility breakdown
  const theyCanTeachMe = me?.skillsToLearn?.filter(s =>
    profile.skillsToTeach?.some(t => t.name.toLowerCase() === s.name.toLowerCase())
  ) || []
  const iCanTeachThem = me?.skillsToTeach?.filter(s =>
    profile.skillsToLearn?.some(l => l.name.toLowerCase() === s.name.toLowerCase())
  ) || []

  return (
    <div className="min-h-screen bg-canvas py-10 px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.1fr] gap-5 animate-fade-up">

        {/* ── LEFT: Main card ───────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className="card p-6">

            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative shrink-0">
                <Avatar user={profile} size="xl" />
                {isOnline && (
                  <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-sage-light border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl leading-tight">{profile.name}</h1>
                {profile.location && (
                  <p className="text-sm text-ink-4 mt-0.5">📍 {profile.location}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-violet-pale text-violet text-xs font-medium px-2.5 py-1 rounded-full">
                    🔁 {profile.totalSwaps || 0} swaps
                  </span>
                  {profile.avgRating > 0 && (
                    <span className="bg-amber-pale text-amber text-xs font-medium px-2.5 py-1 rounded-full">
                      ⭐ {profile.avgRating}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    isOnline ? 'bg-sage-pale text-sage-dark' : 'bg-canvas-2 text-ink-4'
                  }`}>
                    {isOnline ? '● Online now' : '○ Offline'}
                  </span>
                </div>
              </div>
              {score > 0 && !isMe && (
                <div className="text-center shrink-0">
                  <div className={`font-display text-4xl leading-none ${scoreColor}`}>{score}%</div>
                  <div className="text-[10px] text-ink-4 uppercase tracking-wider mt-1">match</div>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-ink-3 leading-relaxed mb-5">{profile.bio}</p>
            )}

            {/* Action buttons */}
            {!isMe ? (
              <div className="flex gap-3 pt-5 border-t border-canvas-2">
                <button
                  onClick={startChat}
                  disabled={chatting}
                  className="btn btn-outline flex-1 justify-center"
                >
                  {chatting ? <Spinner className="w-4 h-4" /> : '💬 Message'}
                </button>
                <button
                  onClick={requestSwap}
                  disabled={swapping || swapSent}
                  className={`btn flex-1 justify-center transition-all ${
                    swapSent
                      ? 'bg-sage-pale text-sage-dark cursor-default'
                      : 'btn-primary'
                  }`}
                >
                  {swapSent
                    ? '✓ Request sent'
                    : swapping
                    ? <Spinner className="w-4 h-4" />
                    : '🤝 Request Swap'}
                </button>
              </div>
            ) : (
              <a href="/profile" className="btn btn-outline mt-5 self-start">
                ✏️ Edit your profile
              </a>
            )}
          </div>

          {/* Reviews */}
          {profile.ratings?.length > 0 && (
            <div className="card p-5">
              <p className="section-label mb-3">Reviews ({profile.ratings.length})</p>
              <div className="flex flex-col gap-3">
                {profile.ratings.slice(0, 4).map((r, i) => (
                  <div key={i} className="bg-canvas rounded-xl p-3.5">
                    <div className="flex items-center gap-1 mb-1">
                      {'⭐'.repeat(r.score)}
                    </div>
                    {r.comment && (
                      <p className="text-xs text-ink-3 italic">"{r.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Skills + compatibility ─────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Skills they teach */}
          {profile.skillsToTeach?.length > 0 && (
            <div className="card p-5">
              <p className="section-label mb-3">Skills they teach ✦</p>
              <div className="flex flex-col gap-2.5">
                {profile.skillsToTeach.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="tag-teach">{s.name}</span>
                    <span className="text-xs text-ink-4">{s.category}</span>
                    <span className="text-xs text-ink-4 ml-auto capitalize">{s.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills they want to learn */}
          {profile.skillsToLearn?.length > 0 && (
            <div className="card p-5">
              <p className="section-label mb-3">Skills they want to learn →</p>
              <div className="flex flex-col gap-2.5">
                {profile.skillsToLearn.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="tag-learn">{s.name}</span>
                    <span className="text-xs text-ink-4">{s.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compatibility breakdown */}
          {score > 0 && !isMe && (theyCanTeachMe.length > 0 || iCanTeachThem.length > 0) && (
            <div className="card p-5 bg-sage-pale border-sage-pale">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label text-sage-dark">Why you're a {score}% match</p>
                <div className={`font-display text-2xl ${scoreColor}`}>{score}%</div>
              </div>

              {theyCanTeachMe.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-sage-dark mb-2">
                    They can teach you:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {theyCanTeachMe.map((s, i) => (
                      <span key={i} className="tag-teach">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {iCanTeachThem.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sage-dark mb-2">
                    You can teach them:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {iCanTeachThem.map((s, i) => (
                      <span key={i} className="tag-learn">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {!isMe && (
                <button
                  onClick={requestSwap}
                  disabled={swapping || swapSent}
                  className={`btn btn-sm w-full justify-center mt-4 ${
                    swapSent ? 'bg-white/50 text-sage-dark cursor-default' : 'bg-sage text-white hover:bg-sage-dark'
                  }`}
                >
                  {swapSent ? '✓ Request already sent' : '🤝 Start this swap →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
