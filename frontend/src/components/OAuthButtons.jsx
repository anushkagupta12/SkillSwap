import { useEffect, useState } from 'react'
import { api, API_URL } from '../lib/api'

const ICONS = {
  google: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  ),
  github: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.63 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  ),
}

const LABELS = { google: 'Google', github: 'GitHub' }

/**
 * "Continue with ..." buttons. Only providers the server has configured are shown,
 * and nothing is rendered at all (no stray divider) when there are none.
 *
 * These are plain links, not fetch() calls: OAuth needs a full-page navigation to the
 * provider, and the API sets its state cookie on that redirect.
 */
export default function OAuthButtons({ verb = 'Continue' }) {
  const [providers, setProviders] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .get('/api/auth/oauth/providers')
      .then(({ data }) => {
        if (!cancelled) setProviders(data.providers || [])
      })
      .catch(() => {}) // no buttons is a fine fallback; password sign-in still works
    return () => {
      cancelled = true
    }
  }, [])

  if (!providers.length) return null

  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <a
          key={p}
          href={`${API_URL}/api/auth/oauth/${p}`}
          className="btn btn-outline justify-center py-2.5 text-sm rounded-xl w-full"
        >
          {ICONS[p]}
          <span>{verb} with {LABELS[p] || p}</span>
        </a>
      ))}
      <div className="flex items-center gap-3 my-1" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-canvas-3" />
        <span className="text-xs text-ink-3 uppercase tracking-wider">or</span>
        <span className="h-px flex-1 bg-canvas-3" />
      </div>
    </div>
  )
}
