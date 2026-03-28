import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type = 'default', ms = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms)
  }, [])

  const success = useCallback(m => add(m, 'success'), [add])
  const error   = useCallback(m => add(m, 'error'),   [add])
  const info    = useCallback(m => add(m, 'info'),     [add])

  const bg = { success: 'bg-sage', error: 'bg-rose-light', info: 'bg-ink', default: 'bg-ink-2' }

  return (
    <ToastCtx.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`${bg[t.type]} text-white text-sm px-4 py-3 rounded-xl shadow-lift min-w-64 max-w-sm animate-slide-in`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
