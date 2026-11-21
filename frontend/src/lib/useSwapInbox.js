import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/**
 * Incoming swap requests for the signed-in user.
 * `refreshKey` should change only when something new arrived (e.g. a socket "received" event) -
 * dismissing a toast must NOT trigger a refetch.
 */
export default function useSwapInbox(enabled, refreshKey = 0) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await api.get('/api/users/requests/inbox')
      // Defensive: a request without a sender can't be rendered.
      setRequests((data.requests || []).filter((r) => r?.from?._id))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) load()
    else setRequests([])
  }, [enabled, refreshKey, load])

  /** Applies the result of accept/decline locally (functional update - never reads a stale list). */
  const markResponded = useCallback((id, status) => {
    setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)))
  }, [])

  return { requests, loading, error, reload: load, markResponded }
}
