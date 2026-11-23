import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { uid } from '../lib/id'

const ToastCtx = createContext(null)

const BG = { success: 'bg-sage', error: 'bg-rose', info: 'bg-ink', default: 'bg-ink-2' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((p) => p.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (msg, type = 'default', ms = 3500) => {
      const id = uid()
      setToasts((p) => [...p.slice(-4), { id, msg, type }])
      timers.current.set(id, setTimeout(() => dismiss(id), ms))
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  const api = useMemo(
    () => ({
      success: (m) => add(m, 'success'),
      error: (m) => add(m, 'error', 5000),
      info: (m) => add(m, 'info'),
    }),
    [add],
  )

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* role=status / aria-live: screen readers announce toasts without stealing focus */}
      <div
        role="status"
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${BG[t.type]} text-white text-sm px-4 py-3 rounded-xl shadow-lift min-w-64 max-w-sm animate-slide-in`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
