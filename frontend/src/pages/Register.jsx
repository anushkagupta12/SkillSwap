import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errorMessage } from '../lib/api'
import SkillInput from '../components/SkillInput'
import AuthAside from '../components/AuthAside'
import PasswordInput from '../components/PasswordInput'
import OAuthButtons from '../components/OAuthButtons'

export default function Register() {
  const { register } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [verifyNotice, setVerifyNotice] = useState('')
  const [confirm, setConfirm] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', location: '', bio: '',
    skillsToTeach: [], skillsToLearn: [],
  })

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  // Only flag a mismatch once the user has started typing the confirmation.
  const mismatch = confirm.length > 0 && confirm !== form.password

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (step === 1) {
      if (form.password !== confirm) {
        setFormError('Passwords do not match.')
        return
      }
      setStep(2)
      return
    }
    setLoading(true)
    try {
      // The confirmation is a client-side check only; it is never sent to the server.
      const data = await register(form)
      if (data.requiresVerification) {
        setVerifyNotice(data.message)
        return
      }
      success('Account created! Welcome to SkillSwap')
      navigate('/', { replace: true }) // homepage
    } catch (err) {
      setFormError(errorMessage(err, 'Registration failed.'))
      // The problem is in step 1 (email taken, weak password...): take the user back to it.
      const field = err.response?.data?.errors?.[0]?.field
      if (['name', 'email', 'password', 'location'].includes(field) || err.response?.data?.code === 'email_taken') setStep(1)
    } finally {
      setLoading(false)
    }
  }

  if (verifyNotice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-canvas">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl mb-3">Check your inbox</h1>
          <p className="text-ink-3 mb-6">{verifyNotice}</p>
          <Link to="/login" className="btn btn-dark">Go to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16 bg-canvas">
        <div className="w-full max-w-lg animate-fade-up">
          <Link to="/" className="font-display text-2xl text-ink block mb-8">
            Skill<span className="text-sage">Swap</span>
          </Link>

          <ol className="flex items-center gap-3 mb-8" aria-label="Progress">
            {[1, 2].map((s) => (
              <li key={s} className="flex items-center gap-3" aria-current={step === s ? 'step' : undefined}>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step >= s ? 'bg-sage text-white' : 'bg-canvas-3 text-ink-3'
                  }`}
                >
                  {s}
                </span>
                {s < 2 && <span className={`h-px w-8 transition-colors ${step > s ? 'bg-sage' : 'bg-canvas-3'}`} />}
              </li>
            ))}
            <li className="text-sm text-ink-3 ml-2 list-none">{step === 1 ? 'Account details' : 'Your skills'}</li>
          </ol>

          <h1 className="font-display text-3xl mb-1">{step === 1 ? 'Create your account' : 'Add your skills'}</h1>
          <p className="text-ink-3 text-sm mb-7">
            {step === 1 ? 'Join the skill exchange community' : 'Tell us what you teach and want to learn'}
          </p>

          {/* Step 1 only: choosing a provider replaces the whole form. A new provider account is created
              straight away; skills and bio can be added afterwards on the profile page. */}
          {step === 1 && <div className="mb-4"><OAuthButtons verb="Sign up" /></div>}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {formError && (
              <div role="alert" className="bg-rose-pale text-rose text-sm rounded-xl px-4 py-3">{formError}</div>
            )}
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="name" className="section-label">Full name</label>
                    <input id="name" className="input" name="name" autoComplete="name" placeholder="Kavya Patel"
                      maxLength={60} value={form.name} onChange={onChange} required />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label htmlFor="location" className="section-label">Location</label>
                    <input id="location" className="input" name="location" placeholder="Mumbai, India"
                      maxLength={100} value={form.location} onChange={onChange} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="section-label">Email address</label>
                  <input id="email" className="input" type="email" name="email" autoComplete="email"
                    placeholder="you@example.com" value={form.email} onChange={onChange} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="section-label">Password</label>
                  <PasswordInput id="password" name="password" autoComplete="new-password"
                    placeholder="At least 8 characters" value={form.password} onChange={onChange}
                    required minLength={8} maxLength={72} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirmPassword" className="section-label">Confirm password</label>
                  <PasswordInput id="confirmPassword" label="confirm password" autoComplete="new-password"
                    placeholder="Re-enter your password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required minLength={8} maxLength={72}
                    aria-invalid={mismatch} aria-describedby={mismatch ? 'confirm-error' : undefined}
                    className={mismatch ? 'border-rose focus:border-rose focus:ring-rose/20' : ''} />
                  {mismatch && (
                    <p id="confirm-error" role="alert" className="text-xs text-rose">Passwords do not match.</p>
                  )}
                </div>
                <button type="submit" className="btn btn-dark justify-center py-3 mt-2 text-base rounded-xl">
                  Continue →
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bio" className="section-label">Short bio (optional)</label>
                  <textarea id="bio" className="input resize-none" name="bio" rows={3} maxLength={300}
                    placeholder="Tell others about yourself and your experience…"
                    value={form.bio} onChange={onChange} />
                </div>
                <SkillInput
                  label="Skills you can teach"
                  skills={form.skillsToTeach}
                  onChange={(v) => setForm((p) => ({ ...p, skillsToTeach: v }))}
                  variant="teach"
                />
                <SkillInput
                  label="Skills you want to learn"
                  skills={form.skillsToLearn}
                  onChange={(v) => setForm((p) => ({ ...p, skillsToLearn: v }))}
                  variant="learn"
                />
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn btn-outline px-6">← Back</button>
                  <button type="submit" disabled={loading} className="btn btn-dark flex-1 justify-center py-3 text-base rounded-xl">
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-ink-3 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sage font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      <AuthAside
        headline="Teach one thing. Learn another."
        body="Add what you can teach and what you want to learn. We rank other members by how well your skills complement each other."
      />
    </div>
  )
}
