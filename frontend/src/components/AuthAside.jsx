import useStats from '../lib/useStats'

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '–')

/** Right-hand panel of the auth pages. Shows REAL numbers from the API (or nothing while loading / on failure). */
export default function AuthAside({ headline, body }) {
  const stats = useStats()
  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-ink px-12 py-16">
      <div className="max-w-sm">
        <h2 className="font-display text-3xl text-white leading-snug mb-4">{headline}</h2>
        <p className="text-white/70 leading-relaxed mb-10">{body}</p>
        {stats && (
          <dl className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
            {[
              ['Members', stats.users],
              ['Skills offered', stats.skills],
              ['Connections', stats.connections],
            ].map(([label, n]) => (
              <div key={label}>
                <dd className="font-display text-2xl text-sage-light">{fmt(n)}</dd>
                <dt className="text-xs text-white/60 mt-0.5">{label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
