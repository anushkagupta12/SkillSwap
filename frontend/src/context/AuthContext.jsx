import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api, refreshSession, setAccessToken, setAuthLostHandler, subscribeToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  // Set when the boot-time session check failed for a reason other than "not signed in" (network, 5xx).
  const [bootError, setBootError] = useState(false)

  useEffect(() => subscribeToken(setToken), [])

  // The server rejected our refresh cookie: the session is really over.
  useEffect(() => {
    setAuthLostHandler(() => {
      setAccessToken(null)
      setUser(null)
    })
    return () => setAuthLostHandler(() => {})
  }, [])

  const boot = useCallback(async () => {
    setLoading(true)
    setBootError(false)
    try {
      const data = await refreshSession() // restores the session from the httpOnly cookie
      setUser(data.user)
    } catch (err) {
      // 401 = simply not signed in. Anything else (network blip, 500) must NOT look like a logout.
      if (err.response?.status !== 401) setBootError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    boot()
  }, [boot])

  // Refresh the short-lived access token a minute before it expires, so requests and the socket
  // never run on an expired token (and the user never notices the 15 minute lifetime).
  useEffect(() => {
    if (!token) return undefined
    let exp
    try {
      exp = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000
    } catch {
      return undefined
    }
    const wait = Math.max(exp - Date.now() - 60 * 1000, 5 * 1000)
    const t = setTimeout(() => {
      refreshSession().catch((err) => {
        if (err.response?.status === 401) {
          setAccessToken(null)
          setUser(null)
        }
      })
    }, wait)
    return () => clearTimeout(t)
  }, [token])

  // Set the user straight from the login/register response - no redundant /me call.
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (form) => {
    const { data } = await api.post('/api/auth/register', form)
    if (data.accessToken) {
      setAccessToken(data.accessToken)
      setUser(data.user)
    }
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* the cookie is cleared server-side when reachable; local state is cleared regardless */
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  const logoutAll = useCallback(async () => {
    await api.post('/api/auth/logout-all')
    setAccessToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    const { data } = await api.put('/api/auth/profile', profileData)
    setUser(data.user)
    return data
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, bootError, retryBoot: boot, login, register, logout, logoutAll, updateProfile }),
    [user, token, loading, bootError, boot, login, register, logout, logoutAll, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export { api }
