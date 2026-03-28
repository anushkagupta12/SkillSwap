import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { login } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      success('Welcome back!')
      navigate('/browse')
    } catch (err) {
      error(err.response?.data?.message || 'Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-16 bg-canvas">
        <div className="w-full max-w-md animate-fade-up">
          <Link to="/" className="font-display text-2xl text-ink block mb-10">
            Skill<span className="text-sage">Swap</span>
          </Link>

          <h2 className="font-display text-3xl mb-1">Welcome back</h2>
          <p className="text-ink-4 text-sm mb-8">Sign in to continue swapping skills</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Email address</label>
              <input className="input" type="email" name="email"
                placeholder="you@example.com" value={form.email} onChange={onChange} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Password</label>
              <input className="input" type="password" name="password"
                placeholder="••••••••" value={form.password} onChange={onChange} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-dark justify-center py-3 mt-2 text-base rounded-xl">
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-4 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sage font-medium hover:underline">Create one free</Link>
          </p>
        </div>
      </div>

      {/* Aside */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-ink px-12 py-16">
        <div className="max-w-sm">
          <blockquote className="font-display text-2xl italic text-white leading-snug mb-8">
            "In three months of swapping Figma sessions for Python lessons, I went from knowing
            nothing to building my own analytics dashboard."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="avatar-emerald w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">KP</div>
            <div>
              <div className="text-white font-semibold text-sm">Kavya Patel</div>
              <div className="text-white/50 text-xs">Figma ↔ Python swap</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-white/10">
            {[['12k+','Learners'],['340+','Skills'],['89%','Satisfaction']].map(([n,l]) => (
              <div key={l}>
                <div className="font-display text-2xl text-sage-light">{n}</div>
                <div className="text-xs text-white/40 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
