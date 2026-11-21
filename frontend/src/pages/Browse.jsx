import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useDebounce } from '../lib/hooks'
import { useToast } from '../context/ToastContext'
import UserCard from '../components/UserCard'
import Spinner from '../components/Spinner'

const CATS = ['All', 'Programming', 'Design', 'Data & Analytics', 'Languages', 'Music & Arts', 'Business']
const LIMIT = 12

export default function Browse() {
  const { info } = useToast()
  // The URL is the single source of truth for filters: shareable, and back/forward work.
  const [params, setParams] = useSearchParams()
  const category = CATS.includes(params.get('category')) ? params.get('category') : 'All'
  const page = Math.max(parseInt(params.get('page') || '1', 10) || 1, 1)
  const urlSearch = params.get('search') || ''

  // Local state keeps typing instant; the URL / request only follow 300ms after the last keystroke.
  const [searchText, setSearchText] = useState(urlSearch)
  const debounced = useDebounce(searchText.trim(), 300)

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0) // bumped by the Retry button

  const update = (changes, { replace = true } = {}) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v === '' || v === 'All' || v === undefined || v === 1) next.delete(k)
          else next.set(k, String(v))
        }
        return next
      },
      { replace },
    )

  // The last search value WE wrote to the URL. Lets us tell our own URL updates apart from external
  // ones (back button, a link from the landing page) so an older value never overwrites newer typing.
  const pushed = useRef(urlSearch)

  // Debounced text -> URL (and back to page 1).
  useEffect(() => {
    if (debounced === urlSearch) return
    pushed.current = debounced
    update({ search: debounced, page: 1 })
    // `update` and `urlSearch` are intentionally omitted: this must only fire when the debounced text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // URL changed externally: mirror it into the input.
  useEffect(() => {
    if (urlSearch === pushed.current) return
    pushed.current = urlSearch
    setSearchText(urlSearch)
  }, [urlSearch])

  // Fetch. Each run aborts the previous request, so a slow old response can never overwrite a newer one.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    const query = { page, limit: LIMIT }
    if (urlSearch) query.search = urlSearch
    if (category !== 'All') query.category = category

    api
      .get('/api/users', { params: query, signal: controller.signal })
      .then(({ data }) => {
        setUsers(data.users)
        setTotal(data.total)
        setPages(data.pages)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || err.code === 'ERR_CANCELED') return // superseded, not a failure
        setFailed(true)
        setLoading(false)
      })

    return () => controller.abort()
  }, [urlSearch, category, page, reloadKey])

  const clearFilters = () => {
    setSearchText('')
    pushed.current = ''
    setParams({}, { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl text-white">Browse skills</h1>
              <p className="text-white/70 text-sm mt-1" aria-live="polite">
                {loading ? 'Searching…' : `${total} ${total === 1 ? 'member' : 'members'} found`}
              </p>
            </div>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="w-full sm:w-80">
              <label htmlFor="browse-search" className="sr-only">Search by name, skill or location</label>
              <input
                id="browse-search"
                type="search"
                className="input input-dark w-full"
                placeholder="Search by name, skill, location…"
                maxLength={80}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </form>
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Category">
            {CATS.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                onClick={() => update({ category: cat, page: 1 })}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-all ${
                  category === cat ? 'bg-canvas text-ink' : 'text-white/70 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {failed ? (
          <div role="alert" className="text-center py-24">
            <h2 className="font-display text-2xl mb-2">Couldn't load members</h2>
            <p className="text-ink-3 mb-6">Check your connection and try again.</p>
            <button type="button" className="btn btn-dark" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
          </div>
        ) : loading && users.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <Spinner />
            <p className="text-ink-3 text-sm">Finding skill swappers…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="font-display text-2xl mb-2">No members found</h2>
            <p className="text-ink-3 mb-6">Try adjusting your search or clearing filters</p>
            <button type="button" onClick={clearFilters} className="btn btn-outline">Clear filters</button>
          </div>
        ) : (
          <>
            <div className={`grid md:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {users.map((u) => (
                <UserCard key={u._id} user={u} onSwapSent={() => info('Swap request sent!')} />
              ))}
            </div>

            {pages > 1 && (
              <nav className="flex items-center justify-center gap-4 mt-10" aria-label="Pagination">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => update({ page: page - 1 }, { replace: false })} disabled={page <= 1}>
                  ← Prev
                </button>
                <span className="text-sm text-ink-3">Page {page} of {pages}</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => update({ page: page + 1 }, { replace: false })} disabled={page >= pages}>
                  Next →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}
