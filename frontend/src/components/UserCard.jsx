// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { api } from '../context/AuthContext'
// import Avatar from './Avatar'

// export default function UserCard({ user, onSwapSent }) {
//   const navigate    = useNavigate()
//   const [sent, setSent]       = useState(false)
//   const [loading, setLoading] = useState(false)

//   const score = user.compatibilityScore || 0
//   const scoreColor = score >= 70 ? 'text-sage'
//     : score >= 40 ? 'text-amber'
//     : 'text-ink-4'

//   const sendRequest = async (e) => {
//     e.stopPropagation()
//     setLoading(true)
//     try {
//       await api.post(`/users/${user._id}/swap-request`, { message: "Hi! I'd love to swap skills with you." })
//       setSent(true)
//       onSwapSent?.()
//     } catch { /* already requested */ }
//     finally { setLoading(false) }
//   }

//   return (
//     <div
//       onClick={() => navigate(`/user/${user._id}`)}
//       className="card card-hover p-5 flex flex-col gap-3.5 cursor-pointer animate-fade-up">

//       {/* Header */}
//       <div className="flex items-start gap-3">
//         <Avatar user={user} size="md" />
//         <div className="flex-1 min-w-0">
//           <h3 className="font-semibold text-ink truncate">{user.name}</h3>
//           {user.location && (
//             <p className="text-xs text-ink-4 mt-0.5">📍 {user.location}</p>
//           )}
//         </div>
//         {score > 0 && (
//           <div className="text-right shrink-0">
//             <div className={`font-display text-xl leading-none ${scoreColor}`}>{score}%</div>
//             <div className="text-[10px] text-ink-4 uppercase tracking-wide mt-0.5">match</div>
//           </div>
//         )}
//       </div>

//       {/* Bio */}
//       {user.bio && (
//         <p className="text-xs text-ink-3 leading-relaxed line-clamp-2">{user.bio}</p>
//       )}

//       {/* Skills */}
//       <div className="flex flex-col gap-2">
//         {user.skillsToTeach?.length > 0 && (
//           <div>
//             <p className="section-label mb-1">Teaches</p>
//             <div className="flex flex-wrap gap-1">
//               {user.skillsToTeach.slice(0, 3).map((s, i) => (
//                 <span key={i} className="tag-teach">{s.name}</span>
//               ))}
//               {user.skillsToTeach.length > 3 && (
//                 <span className="tag-teach">+{user.skillsToTeach.length - 3}</span>
//               )}
//             </div>
//           </div>
//         )}
//         {user.skillsToLearn?.length > 0 && (
//           <div>
//             <p className="section-label mb-1">Learning</p>
//             <div className="flex flex-wrap gap-1">
//               {user.skillsToLearn.slice(0, 3).map((s, i) => (
//                 <span key={i} className="tag-learn">{s.name}</span>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Footer */}
//       <div
//         className="flex gap-2 pt-1 border-t border-canvas-2 mt-auto"
//         onClick={e => e.stopPropagation()}>
//         <button
//           onClick={() => navigate(`/user/${user._id}`)}
//           className="btn btn-outline btn-sm flex-1 justify-center">
//           View profile
//         </button>
//         <button
//           onClick={sendRequest}
//           disabled={loading || sent}
//           className="btn btn-dark btn-sm flex-1 justify-center">
//           {sent ? '✓ Requested' : loading ? 'Sending…' : 'Request swap →'}
//         </button>
//       </div>
//     </div>
//   )
// }

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../context/AuthContext'
import Avatar from './Avatar'

export default function UserCard({ user, onSwapSent }) {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // ✅ Get current logged-in user
  const currentUser = JSON.parse(localStorage.getItem("user"))
  const currentUserId = currentUser?._id

  // ✅ Check from backend data if already requested
  const alreadySent = useMemo(() => {
    return user?.swapRequests?.some(
      (r) =>
        (r.from?._id || r.from)?.toString() === currentUserId &&
        r.status === 'pending'
    )
  }, [user, currentUserId])

  const isRequested = sent || alreadySent

  const score = user.compatibilityScore || 0
  const scoreColor =
    score >= 70 ? 'text-sage'
      : score >= 40 ? 'text-amber'
      : 'text-ink-4'

  const sendRequest = async (e) => {
    e.stopPropagation()
    if (isRequested) return

    setLoading(true)
    try {
      await api.post(`/api/users/${user._id}/swap-request`, {
        message: "Hi! I'd love to swap skills with you."
      })
      setSent(true)
      onSwapSent?.()
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={() => navigate(`/user/${user._id}`)}
      className="card card-hover p-5 flex flex-col gap-3.5 cursor-pointer animate-fade-up"
    >

      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar user={user} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink truncate">{user.name}</h3>
          {user.location && (
            <p className="text-xs text-ink-4 mt-0.5">📍 {user.location}</p>
          )}
        </div>

        {score > 0 && (
          <div className="text-right shrink-0">
            <div className={`font-display text-xl leading-none ${scoreColor}`}>
              {score}%
            </div>
            <div className="text-[10px] text-ink-4 uppercase tracking-wide mt-0.5">
              match
            </div>
          </div>
        )}
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-xs text-ink-3 leading-relaxed line-clamp-2">
          {user.bio}
        </p>
      )}

      {/* Skills */}
      <div className="flex flex-col gap-2">
        {user.skillsToTeach?.length > 0 && (
          <div>
            <p className="section-label mb-1">Teaches</p>
            <div className="flex flex-wrap gap-1">
              {user.skillsToTeach.slice(0, 3).map((s, i) => (
                <span key={i} className="tag-teach">{s.name}</span>
              ))}
              {user.skillsToTeach.length > 3 && (
                <span className="tag-teach">
                  +{user.skillsToTeach.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {user.skillsToLearn?.length > 0 && (
          <div>
            <p className="section-label mb-1">Learning</p>
            <div className="flex flex-wrap gap-1">
              {user.skillsToLearn.slice(0, 3).map((s, i) => (
                <span key={i} className="tag-learn">{s.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex gap-2 pt-1 border-t border-canvas-2 mt-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(`/user/${user._id}`)}
          className="btn btn-outline btn-sm flex-1 justify-center"
        >
          View profile
        </button>

        <button
          onClick={sendRequest}
          disabled={loading || isRequested}
          className="btn btn-dark btn-sm flex-1 justify-center"
        >
          {isRequested
            ? '✓ Requested'
            : loading
              ? 'Sending…'
              : 'Request swap →'}
        </button>
      </div>
    </div>
  )
}

