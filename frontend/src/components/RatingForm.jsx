import { useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { useToast } from '../context/ToastContext'

/** Star rating for a connected user (1 whole star minimum, comment up to 300 characters). */
export default function RatingForm({ userId, firstName, onRated }) {
  const { success, error } = useToast()
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!score) return
    setBusy(true)
    try {
      await api.post(`/api/users/${userId}/rate`, { score, comment })
      success('Thanks for your rating!')
      onRated?.()
    } catch (err) {
      error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 flex flex-col gap-3">
      <fieldset>
        <legend className="section-label mb-2">Rate your swap with {firstName}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
              onClick={() => setScore(n)}
              className={`text-2xl leading-none p-1 rounded transition-colors ${n <= score ? 'text-amber-light' : 'text-canvas-3 hover:text-amber-light/60'}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="rating-comment" className="sr-only">Comment (optional)</label>
      <textarea
        id="rating-comment"
        className="input resize-none text-sm"
        rows={2}
        maxLength={300}
        placeholder="Add a short comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-3">{comment.length}/300</span>
        <button type="submit" disabled={!score || busy} className="btn btn-dark btn-sm">
          {busy ? 'Saving…' : 'Submit rating'}
        </button>
      </div>
    </form>
  )
}
