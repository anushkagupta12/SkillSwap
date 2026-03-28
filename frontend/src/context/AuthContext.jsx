import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)
const API = import.meta.env.VITE_API_URL;
export const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('ss_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(localStorage.getItem('ss_token'))
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!token) { setLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      localStorage.removeItem('ss_token')
      setToken(null)
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('ss_token', data.token)
    setToken(data.token); setUser(data.user)
    return data
  }

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form)
    localStorage.setItem('ss_token', data.token)
    setToken(data.token); setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('ss_token')
    setToken(null); setUser(null)
  }

  const updateProfile = async (profileData) => {
    const { data } = await api.put('/auth/profile', profileData)
    setUser(data.user); return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
