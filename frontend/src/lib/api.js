import axios from 'axios'

/** Base URL of the API / Socket.IO server. Empty in dev (Vite proxies /api and /socket.io). */
export const API_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({ baseURL: API_URL, withCredentials: true })

// The access token lives in memory only (never localStorage), so an XSS bug can't read it
// out of storage. The long-lived refresh token is an httpOnly cookie JS can't touch.
let accessToken = null
const tokenListeners = new Set()
let onAuthLost = () => {}

export const getAccessToken = () => accessToken
export const setAccessToken = (token) => {
  accessToken = token
  tokenListeners.forEach((fn) => fn(token))
}
export const subscribeToken = (fn) => {
  tokenListeners.add(fn)
  return () => tokenListeners.delete(fn)
}
/** Called when the session is definitely gone (refresh answered 401). */
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn
}

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`
  return cfg
})

let inflight = null
/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession() {
  if (!inflight) {
    inflight = axios
      .post(`${API_URL}/api/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken)
        return res.data
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

const NO_REFRESH = /\/api\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-email)/

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { config, response } = err
    if (response?.status === 401 && config && !config._retried && !NO_REFRESH.test(config.url || '')) {
      config._retried = true
      try {
        await refreshSession()
        return api(config)
      } catch (refreshErr) {
        // Only a 401 from /refresh means the session is gone; a network blip must not log anyone out.
        if (refreshErr.response?.status === 401) onAuthLost()
        return Promise.reject(err)
      }
    }
    return Promise.reject(err)
  },
)

/** One consistent way to turn a failed request into text for the user. */
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.response?.data
  if (data?.errors?.[0]?.message) return data.errors[0].message
  if (data?.message) return data.message
  if (!err?.response) return 'Cannot reach the server. Check your connection and try again.'
  return fallback
}
