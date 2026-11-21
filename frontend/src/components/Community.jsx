import { DEMO_COMMUNITY } from '../data/demo'
import ExampleBadge from './ExampleBadge'

export default function Community() {
  return (
    <section className="bg-canvas py-16 md:py-24 px-4 sm:px-6" aria-labelledby="community-title">
      <div className="max-w-7xl mx-auto text-center">
        <h2 id="community-title" className="font-display text-3xl md:text-4xl text-ink mb-4">
          What a profile looks like
        </h2>
        <p className="text-ink-3 max-w-xl mx-auto mb-4">
          Each profile lists what someone can teach and what they want to learn. That is all the matching needs.
        </p>
        <div className="mb-12"><ExampleBadge>Example profiles</ExampleBadge></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-left">
          {DEMO_COMMUNITY.map((u) => (
            <article key={u.name} className="bg-white border border-canvas-3 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${u.color}`} aria-hidden="true">
                  {u.initials}
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-ink">{u.name}</h3>
                  <p className="text-sm text-ink-3">{u.role}</p>
                </div>
              </div>
              <p className="text-sm text-ink-3 leading-relaxed mb-5">{u.bio}</p>
              <p className="section-label mb-2">Teaching</p>
              <ul className="flex flex-wrap gap-2 mb-4">
                {u.teaches.map((t) => <li key={t} className="tag-teach">{t}</li>)}
              </ul>
              <p className="section-label mb-2">Learning</p>
              <ul className="flex flex-wrap gap-2">
                {u.learns.map((l) => <li key={l} className="tag-learn">{l}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
