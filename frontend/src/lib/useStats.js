import { useEffect, useState } from 'react'
import { api } from './api'

let cached = null

/** Real community numbers from the API (never invented). Returns null until loaded or if it fails. */
export default function useStats() {
  const [stats, setStats] = useState(cached)

  useEffect(() => {
    if (cached) return undefined
    let cancelled = false
    api
      .get('/api/stats')
      .then(({ data }) => {
        cached = data
        if (!cancelled) setStats(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return stats
}
