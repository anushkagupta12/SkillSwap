import { useEffect, useState } from 'react'
import { api } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import UserCard from '../components/UserCard'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'

export default function Matches() {
  const { user } = useAuth()
  const { info } = useToast()
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/api/users/matches')
      .then(({ data }) => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const hasSkills = user?.skillsToTeach?.length > 0 || user?.skillsToLearn?.length > 0
  const top = matches[0]
  const rest = matches.slice(1)

  const scoreColor = s => s >= 70 ? 'text-sage' : s >= 40 ? 'text-amber' : 'text-ink-4'

  return (
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <div className="bg-ink px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl text-white">Your Skill Matches</h1>
          <p className="text-white/40 text-sm mt-1">People whose skills complement yours most — sorted by compatibility</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* No skills notice */}
        {!hasSkills && (
          <div className="flex items-center gap-3 bg-amber-pale border border-amber-light/40 text-amber rounded-xl px-5 py-3.5 mb-6 text-sm">
            <span>💡</span>
            <span>Add skills to your profile to get better match recommendations.</span>
            <a href="/profile" className="btn btn-sm bg-amber text-white hover:bg-amber/90 ml-auto shrink-0">Update Profile</a>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <Spinner />
            <p className="text-ink-4 text-sm">Finding your best matches…</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🤝</div>
            <h3 className="font-display text-2xl mb-2">No matches yet</h3>
            <p className="text-ink-4 mb-6">Add skills to your profile — matches improve as more users join.</p>
            <a href="/profile" className="btn btn-dark">Complete your profile →</a>
          </div>
        ) : (
          <>
            {/* Top match hero card */}
            {top && (
              <div className="card p-6 md:p-8 mb-6">
                <div className="inline-flex items-center gap-1.5 bg-amber-pale text-amber text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
                  🏆 Your best match
                </div>
                <div className="grid md:grid-cols-[1fr_1.4fr_auto] gap-6 md:gap-10 items-start">

                  {/* User info */}
                  <div className="flex items-start gap-4">
                    <Avatar user={top} size="lg" />
                    <div>
                      <h2 className="font-display text-2xl">{top.name}</h2>
                      {top.location && <p className="text-sm text-ink-4 mt-0.5">📍 {top.location}</p>}
                      {top.bio && <p className="text-sm text-ink-3 mt-2 leading-relaxed">{top.bio}</p>}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-col gap-4">
                    {top.skillsToTeach?.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Teaches</p>
                        <div className="flex flex-wrap gap-1.5">
                          {top.skillsToTeach.map((s, i) => <span key={i} className="tag-teach">{s.name}</span>)}
                        </div>
                      </div>
                    )}
                    {top.skillsToLearn?.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Learning</p>
                        <div className="flex flex-wrap gap-1.5">
                          {top.skillsToLearn.map((s, i) => <span key={i} className="tag-learn">{s.name}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center gap-3">
                    <div className={`font-display text-5xl leading-none ${scoreColor(top.compatibilityScore)}`}>
                      {top.compatibilityScore}%
                    </div>
                    <div className="text-xs text-ink-4 uppercase tracking-wider">compatibility</div>
                    <a href={`/user/${top._id}`} className="btn btn-dark btn-sm mt-1">View profile →</a>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of matches */}
            {rest.length > 0 && (
              <>
                <h3 className="font-sans font-semibold text-ink mb-4">More great matches</h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {rest.map(u => (
                    <UserCard key={u._id} user={u} onSwapSent={() => info('Swap request sent!')} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
