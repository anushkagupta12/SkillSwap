import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import UserCard from '../components/UserCard'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'

const scoreColor = (s) => (s >= 70 ? 'text-sage' : s >= 40 ? 'text-amber' : 'text-ink-3')

export default function Matches() {
  const { user } = useAuth()
  const { info } = useToast()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/api/users/matches', { signal: controller.signal })
      .then(({ data }) => setMatches(data.matches))
      .catch((err) => {
        if (!controller.signal.aborted) setFailed(true)
        return err
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const hasSkills = user?.skillsToTeach?.length > 0 || user?.skillsToLearn?.length > 0
  const [top, ...rest] = matches

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-ink px-4 sm:px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl text-white">Your skill matches</h1>
          <p className="text-white/70 text-sm mt-1">People whose skills complement yours, sorted by compatibility</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!hasSkills && (
          <div className="flex flex-wrap items-center gap-3 bg-amber-pale border border-amber-light/40 text-amber rounded-xl px-5 py-3.5 mb-6 text-sm">
            <span>Add skills to your profile to get match recommendations.</span>
            <Link to="/profile" className="btn btn-sm bg-amber text-white hover:bg-amber/90 ml-auto shrink-0">Update profile</Link>
          </div>
        )}

        {failed ? (
          <p role="alert" className="text-center py-24 text-ink-3">Couldn't load your matches. Please try again later.</p>
        ) : loading ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <Spinner />
            <p className="text-ink-3 text-sm">Finding your best matches…</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="font-display text-2xl mb-2">No matches yet</h2>
            <p className="text-ink-3 mb-6">Add skills to your profile. Matches improve as more people join.</p>
            <Link to="/profile" className="btn btn-dark">Complete your profile →</Link>
          </div>
        ) : (
          <>
            {top && (
              <section className="card p-6 md:p-8 mb-6" aria-label="Your best match">
                <p className="inline-flex items-center gap-1.5 bg-amber-pale text-amber text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
                  Your best match
                </p>
                <div className="grid md:grid-cols-[1fr_1.4fr_auto] gap-6 md:gap-10 items-start">
                  <div className="flex items-start gap-4">
                    <Avatar user={top} size="lg" />
                    <div>
                      <h2 className="font-display text-2xl">{top.name}</h2>
                      {top.location && <p className="text-sm text-ink-3 mt-0.5">{top.location}</p>}
                      {top.bio && <p className="text-sm text-ink-3 mt-2 leading-relaxed">{top.bio}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {top.skillsToTeach?.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Teaches</p>
                        <div className="flex flex-wrap gap-1.5">
                          {top.skillsToTeach.map((s) => <span key={s.name} className="tag-teach">{s.name}</span>)}
                        </div>
                      </div>
                    )}
                    {top.skillsToLearn?.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Learning</p>
                        <div className="flex flex-wrap gap-1.5">
                          {top.skillsToLearn.map((s) => <span key={s.name} className="tag-learn">{s.name}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <div className={`font-display text-5xl leading-none ${scoreColor(top.compatibilityScore)}`}>
                      {top.compatibilityScore}%
                    </div>
                    <div className="text-xs text-ink-3 uppercase tracking-wider">compatibility</div>
                    <Link to={`/user/${top._id}`} className="btn btn-dark btn-sm mt-1">View profile →</Link>
                  </div>
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <>
                <h2 className="font-sans font-semibold text-ink mb-4">More great matches</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {rest.map((u) => (
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
