import { useState } from 'react'

import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errorMessage } from '../lib/api'
import AuthAside from '../components/AuthAside'
import PasswordInput from '../components/PasswordInput'
import OAuthButtons from '../components/OAuthButtons'

// Codes the API puts in ?oauth_error= when a provider sign-in fails. Unknown codes get the generic text.
const OAUTH_ERRORS = {
  access_denied: 'Sign-in was cancelled.',
  email_unverified: 'That provider account has no verified email address, so we cannot sign you in with it.',
  account_conflict: 'That email is already linked to a different account.',
  unavailable: 'That sign-in method is not available right now.',
  rate_limited: 'Too many attempts. Please try again in a few minutes.',
  failed: 'Sign-in failed. Please try again.',
}

export default function Login() {
  const { login } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const oauthCode = params.get('oauth_error')
  const [formError, setFormError] = useState(
    oauthCode ? OAUTH_ERRORS[oauthCode] || OAUTH_ERRORS.failed : '',
  )

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setFormError('')
    try {
      await login(form.email, form.password)
      success('Welcome back!')
      navigate('/', { replace: true }) // homepage
    } catch (err) {
      setFormError(errorMessage(err, 'Login failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16 bg-canvas">
        <div className="w-full max-w-md animate-fade-up">
          <Link to="/" className="font-display text-2xl text-ink block mb-10">
            Skill<span className="text-sage">Swap</span>
          </Link>

          <h1 className="font-display text-3xl mb-1">Welcome back</h1>
          <p className="text-ink-3 text-sm mb-8">Sign in to continue swapping skills</p>

          {formError && (
            <div role="alert" className="bg-rose-pale text-rose text-sm rounded-xl px-4 py-3 mb-4">
              {formError}
            </div>
          )}

          <OAuthButtons verb="Continue" />

          <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="section-label">Email address</label>
              <input
                id="email" className="input" type="email" name="email" autoComplete="email"
                placeholder="you@example.com" value={form.email} onChange={onChange} required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="section-label">Password</label>
                <Link to="/forgot-password" className="text-xs text-sage hover:underline">Forgot password?</Link>
              </div>
              <PasswordInput
                id="password" name="password" autoComplete="current-password"
                placeholder="••••••••" value={form.password} onChange={onChange} required
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-dark justify-center py-3 mt-2 text-base rounded-xl">
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-3 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sage font-medium hover:underline">Create one free</Link>
          </p>
        </div>
      </div>

      <AuthAside
        headline="Trade what you know for what you want to learn."
        body="Pick up where you left off: your matches, requests and conversations are waiting."
      />
    </div>
  )
}
