import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import UserCard from '../components/UserCard'
import Spinner from '../components/Spinner'

const CATS = ['All','Programming','Design','Data & Analytics','Languages','Music & Arts','Business']

export default function Browse() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [pages, setPages]   = useState(1)
  const [params, setParams] = useSearchParams()
  const { info } = useToast()

  const [search, setSearch]     = useState(params.get('search') || '')
  const [category, setCategory] = useState(params.get('category') || 'All')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const p = { page, limit: 12 }
      if (search)                     p.search   = search
      if (category && category !== 'All') p.category = category
      const { data } = await api.get('/users', { params: p })
      setUsers(data.users); setTotal(data.total); setPages(data.pages)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [search, category, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSearch = e => { e.preventDefault(); setPage(1) }
  const setCategory2 = cat => { setCategory(cat); setPage(1); setParams(cat !== 'All' ? { category: cat } : {}) }

  return (
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <div className="bg-ink">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl text-white">Browse Skills</h1>
              <p className="text-white/40 text-sm mt-1">{total} learners ready to swap</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <input
                className="input input-dark flex-1 sm:w-72"
                placeholder="Search by name, skill, location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary shrink-0">Search</button>
            </form>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0 no-scrollbar">
            {CATS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory2(cat)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-all
                  ${category === cat
                    ? 'bg-canvas text-ink'
                    : 'text-white/50 hover:text-white/80'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <Spinner />
            <p className="text-ink-4 text-sm">Finding skill swappers…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-display text-2xl mb-2">No users found</h3>
            <p className="text-ink-4 mb-6">Try adjusting your search or clearing filters</p>
            <button
              onClick={() => { setSearch(''); setCategory2('All') }}
              className="btn btn-outline">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {users.map(u => (
                <UserCard key={u._id} user={u} onSwapSent={() => info('Swap request sent!')} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}>
                  ← Prev
                </button>
                <span className="text-sm text-ink-4">Page {page} of {pages}</span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
