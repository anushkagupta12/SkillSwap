import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'

function Shell({ title, children }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16 bg-canvas">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl text-ink block mb-8">
          Skill<span className="text-sage">Swap</span>
        </Link>
        <h1 className="font-display text-3xl mb-4">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ busy: false, done: false, error: '' })

  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, done: false, error: '' })
    try {
      await api.post('/api/auth/forgot-password', { email })
      setState({ busy: false, done: true, error: '' })
    } catch (err) {
      setState({ busy: false, done: false, error: errorMessage(err) })
    }
  }

  return (
    <Shell title="Forgot your password?">
      {state.done ? (
        <p className="text-ink-3">If that email is registered, a reset link is on its way. It expires in one hour.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-ink-3 text-sm">Enter your email and we'll send you a link to choose a new password.</p>
          {state.error && <div role="alert" className="bg-rose-pale text-rose text-sm rounded-xl px-4 py-3">{state.error}</div>}
          <label htmlFor="fp-email" className="section-label">Email address</label>
          <input id="fp-email" className="input" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn btn-dark justify-center py-3" disabled={state.busy}>
            {state.busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="text-sm text-ink-3 mt-6"><Link to="/login" className="text-sage hover:underline">Back to sign in</Link></p>
    </Shell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ busy: false, error: '' })
  const token = params.get('token') || ''

  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, error: '' })
    try {
      await api.post('/api/auth/reset-password', { token, password })
      navigate('/login', { replace: true })
    } catch (err) {
      setState({ busy: false, error: errorMessage(err) })
    }
  }

  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {state.error && <div role="alert" className="bg-rose-pale text-rose text-sm rounded-xl px-4 py-3">{state.error}</div>}
        <label htmlFor="rp-password" className="section-label">New password</label>
        <input id="rp-password" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72}
          placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn btn-dark justify-center py-3" disabled={state.busy || !token}>
          {state.busy ? 'Saving…' : 'Update password'}
        </button>
        {!token && <p className="text-sm text-rose">This link is missing its token. Request a new one.</p>}
      </form>
    </Shell>
  )
}

export function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState({ state: 'working', message: '' })

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus({ state: 'error', message: 'This link is missing its token.' })
      return
    }
    api.post('/api/auth/verify-email', { token })
      .then(() => setStatus({ state: 'ok', message: '' }))
      .catch((err) => setStatus({ state: 'error', message: errorMessage(err) }))
  }, [params])

  return (
    <Shell title="Email verification">
      {status.state === 'working' && <p className="text-ink-3">Verifying…</p>}
      {status.state === 'ok' && (
        <>
          <p className="text-ink-3 mb-6">Your email address is verified. Thank you!</p>
          <Link to="/login" className="btn btn-dark">Continue</Link>
        </>
      )}
      {status.state === 'error' && <p role="alert" className="text-rose">{status.message}</p>}
    </Shell>
  )
}
