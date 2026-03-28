import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SkillInput from '../components/SkillInput'
import Avatar from '../components/Avatar'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { success, error } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:          user?.name          || '',
    bio:           user?.bio           || '',
    location:      user?.location      || '',
    skillsToTeach: user?.skillsToTeach || [],
    skillsToLearn: user?.skillsToLearn || [],
  })

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const onSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(form)
      success('Profile updated!')
    } catch (e) { error(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-canvas py-10 px-6">
      <div className="max-w-2xl mx-auto animate-fade-up">

        {/* Profile header card */}
        <div className="card p-6 flex items-center gap-5 mb-5">
          <Avatar user={user} size="xl" />
          <div>
            <h2 className="font-display text-2xl">{user?.name}</h2>
            <p className="text-sm text-ink-4">{user?.email}</p>
            <div className="flex gap-2 mt-2">
              <span className="tag-teach">{user?.skillsToTeach?.length || 0} teaching</span>
              <span className="tag-learn">{user?.skillsToLearn?.length || 0} learning</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="flex flex-col gap-4">

          {/* Basic info */}
          <div className="card p-6">
            <h3 className="font-sans font-semibold text-ink mb-4">Basic Information</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="section-label">Full name</label>
                <input className="input" name="name" value={form.name} onChange={onChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="section-label">Location</label>
                <input className="input" name="location" placeholder="City, Country" value={form.location} onChange={onChange} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Bio</label>
              <textarea
                className="input resize-none"
                name="bio" rows={4}
                placeholder="Tell the community about yourself, your background, and what you're passionate about…"
                value={form.bio} onChange={onChange}
              />
            </div>
          </div>

          {/* Skills to teach */}
          <div className="card p-6">
            <h3 className="font-sans font-semibold text-ink mb-1">Skills I Can Teach</h3>
            <p className="text-xs text-ink-4 mb-4">Add skills and knowledge you're confident teaching to others.</p>
            <SkillInput
              skills={form.skillsToTeach}
              onChange={v => setForm(p => ({ ...p, skillsToTeach: v }))}
              variant="teach"
            />
          </div>

          {/* Skills to learn */}
          <div className="card p-6">
            <h3 className="font-sans font-semibold text-ink mb-1">Skills I Want to Learn</h3>
            <p className="text-xs text-ink-4 mb-4">Add the skills you're eager to pick up through skill exchanges.</p>
            <SkillInput
              skills={form.skillsToLearn}
              onChange={v => setForm(p => ({ ...p, skillsToLearn: v }))}
              variant="learn"
            />
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
