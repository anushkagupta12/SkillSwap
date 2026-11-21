import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errorMessage } from '../lib/api'
import SkillInput from '../components/SkillInput'
import Avatar from '../components/Avatar'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { success, error } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    skillsToTeach: user?.skillsToTeach || [],
    skillsToLearn: user?.skillsToLearn || [],
  })

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(form)
      success('Profile updated!')
    } catch (err) {
      error(errorMessage(err, 'Save failed.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto animate-fade-up">
        <div className="card p-6 flex flex-wrap items-center gap-5 mb-5">
          <Avatar user={user} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl">{user?.name}</h1>
            <p className="text-sm text-ink-3 break-all">{user?.email}</p>
            <div className="flex gap-2 mt-2">
              <span className="tag-teach">{user?.skillsToTeach?.length || 0} teaching</span>
              <span className="tag-learn">{user?.skillsToLearn?.length || 0} learning</span>
            </div>
          </div>
          <Link to="/requests" className="btn btn-outline btn-sm">Swap requests</Link>
        </div>

        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="card p-6">
            <h2 className="font-sans font-semibold text-ink mb-4">Basic information</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-name" className="section-label">Full name</label>
                <input id="p-name" className="input" name="name" maxLength={60} value={form.name} onChange={onChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-location" className="section-label">Location</label>
                <input id="p-location" className="input" name="location" maxLength={100} placeholder="City, Country" value={form.location} onChange={onChange} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-bio" className="section-label">Bio</label>
              <textarea
                id="p-bio" className="input resize-none" name="bio" rows={4} maxLength={300}
                placeholder="Tell the community about yourself and what you're passionate about…"
                value={form.bio} onChange={onChange}
              />
              <span className="text-[11px] text-ink-3 self-end">{form.bio.length}/300</span>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-sans font-semibold text-ink mb-1">Skills I can teach</h2>
            <p className="text-xs text-ink-3 mb-4">Skills you're confident teaching to others.</p>
            <SkillInput skills={form.skillsToTeach} onChange={(v) => setForm((p) => ({ ...p, skillsToTeach: v }))} variant="teach" />
          </div>

          <div className="card p-6">
            <h2 className="font-sans font-semibold text-ink mb-1">Skills I want to learn</h2>
            <p className="text-xs text-ink-3 mb-4">Skills you're eager to pick up through swaps.</p>
            <SkillInput skills={form.skillsToLearn} onChange={(v) => setForm((p) => ({ ...p, skillsToLearn: v }))} variant="learn" />
          </div>

          <div className="flex justify-end pb-4">
            <button type="submit" disabled={saving} className="btn btn-dark px-8 py-3 text-base rounded-xl">
              {saving ? 'Saving…' : 'Save changes →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
