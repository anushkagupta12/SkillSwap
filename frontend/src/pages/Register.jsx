import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SkillInput from '../components/SkillInput'

export default function Register() {
  const { register } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', location: '', bio: '',
    skillsToTeach: [], skillsToLearn: [],
  })

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async e => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setLoading(true)
    try {
      await register(form)
      success('Account created! Welcome to SkillSwap 🎉')
      navigate('/browse')
    } catch (err) {
      error(err.response?.data?.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-16 bg-canvas">
        <div className="w-full max-w-lg animate-fade-up">
          <Link to="/" className="font-display text-2xl text-ink block mb-8">
            Skill<span className="text-sage">Swap</span>
          </Link>

          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${step >= s ? 'bg-sage-light text-white' : 'bg-canvas-3 text-ink-4'}`}>
                  {s}
                </div>
                {s < 2 && <div className={`h-px w-8 transition-colors ${step > s ? 'bg-sage-light' : 'bg-canvas-3'}`} />}
              </div>
            ))}
            <span className="text-sm text-ink-4 ml-2">
              {step === 1 ? 'Account details' : 'Your skills'}
            </span>
          </div>

          <h2 className="font-display text-3xl mb-1">
            {step === 1 ? 'Create your account' : 'Add your skills'}
          </h2>
          <p className="text-ink-4 text-sm mb-7">
            {step === 1 ? 'Join the skill exchange community' : 'Tell us what you teach and want to learn'}
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="section-label">Full name</label>
                    <input className="input" name="name" placeholder="Kavya Patel"
                      value={form.name} onChange={onChange} required />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="section-label">Location</label>
                    <input className="input" name="location" placeholder="Mumbai, India"
                      value={form.location} onChange={onChange} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="section-label">Email address</label>
                  <input className="input" type="email" name="email" placeholder="you@example.com"
                    value={form.email} onChange={onChange} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="section-label">Password</label>
                  <input className="input" type="password" name="password" placeholder="Min. 6 characters"
                    value={form.password} onChange={onChange} required minLength={6} />
                </div>
                <button type="submit" className="btn btn-dark justify-center py-3 mt-2 text-base rounded-xl">
                  Continue →
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="section-label">Short bio (optional)</label>
                  <textarea className="input resize-none" name="bio" rows={3}
                    placeholder="Tell others about yourself and your experience…"
                    value={form.bio} onChange={onChange} />
                </div>
                <SkillInput
                  label="Skills you can teach ✦"
                  skills={form.skillsToTeach}
                  onChange={v => setForm(p => ({ ...p, skillsToTeach: v }))}
                  variant="teach"
                />
                <SkillInput
                  label="Skills you want to learn →"
                  skills={form.skillsToLearn}
                  onChange={v => setForm(p => ({ ...p, skillsToLearn: v }))}
                  variant="learn"
                />
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn btn-outline px-6">← Back</button>
                  <button type="submit" disabled={loading} className="btn btn-dark flex-1 justify-center py-3 text-base rounded-xl">
                    {loading ? 'Creating account…' : 'Create account 🎉'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-ink-4 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sage font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Aside */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-ink px-12 py-16">
        <div className="max-w-sm">
          <div className="grid grid-cols-3 gap-6 mb-12">
            {[['12k+','Active learners'],['340+','Skills listed'],['89%','Satisfaction']].map(([n,l]) => (
              <div key={l}>
                <div className="font-display text-3xl text-sage-light">{n}</div>
                <div className="text-xs text-white/40 mt-1">{l}</div>
              </div>
            ))}
          </div>
          <blockquote className="font-display text-xl italic text-white leading-snug mb-8">
            "The matching algorithm is scarily good. It found me a partner whose skills were
            exactly what I needed, and what I had was exactly what they were looking for."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="avatar-violet w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">AR</div>
            <div>
              <div className="text-white font-semibold text-sm">Arjun Rao</div>
              <div className="text-white/50 text-xs">Python ↔ UI Design swap</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
