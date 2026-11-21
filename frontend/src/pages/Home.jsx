import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useStats from '../lib/useStats'
import { CATEGORY_CARDS, DEMO_A, DEMO_B } from '../data/demo'
import { scoreMatch } from '../lib/match'
import ChatUI from '../components/ChatUI'
import Community from '../components/Community'
import SmartMatching from '../components/SmartMatching'
import ExampleBadge from '../components/ExampleBadge'
import Footer from '../components/Footer'

const HERO_SCORE = scoreMatch(DEMO_A.teaches, DEMO_A.learns, DEMO_B.teaches, DEMO_B.learns)

const STEPS = [
  { n: '1', title: 'Create your profile', desc: 'List the skills you can teach and the ones you want to learn, with your level.' },
  { n: '2', title: 'Get matches', desc: 'We rank members whose skills complement yours, in both directions.' },
  { n: '3', title: 'Send a request', desc: 'Ask to swap. The other person accepts or declines, and you are notified live.' },
  { n: '4', title: 'Chat and exchange', desc: 'Plan sessions in real-time chat, then rate each other when you are done.' },
]

const FEATURES = [
  { icon: '🔐', title: 'Secure sign-in', desc: 'Short-lived sessions, hashed passwords and rate-limited login.' },
  { icon: '🎯', title: 'Skill matching', desc: 'A transparent score based on what each side teaches and wants.' },
  { icon: '⚡', title: 'Real-time chat', desc: 'Instant messages, typing indicators and unread badges.' },
  { icon: '📱', title: 'Works on any screen', desc: 'Layouts adapt from phones to desktops.' },
]

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '–')

export default function Home() {
  const { user } = useAuth()
  const stats = useStats()

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="bg-canvas pt-12 md:pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 bg-sage-pale text-sage-dark text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-light animate-pulse-dot" aria-hidden="true" />
              Skill exchange network
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.07] text-ink mb-6">
              Trade what you <em className="not-italic text-sage">know</em>
              <br className="hidden sm:block" /> for what you <em className="not-italic text-sage">want to learn</em>
            </h1>

            <p className="text-ink-3 text-lg leading-relaxed mb-9 max-w-lg">
              Connect with people who have the skills you need and share the expertise you already have. No money, just
              people teaching each other.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              {user ? (
                <>
                  <Link to="/browse" className="btn btn-dark btn-lg">Browse skills →</Link>
                  <Link to="/matches" className="btn btn-outline btn-lg">View my matches</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-dark btn-lg">Start swapping →</Link>
                  <Link to="/login" className="btn btn-outline btn-lg">Sign in</Link>
                </>
              )}
            </div>

            {/* Real numbers from the API; the block is simply hidden if they can't be loaded. */}
            {stats && (
              <dl className="flex flex-wrap gap-x-8 gap-y-4 pt-8 border-t border-canvas-3">
                {[
                  ['Members', stats.users],
                  ['Skills offered', stats.skills],
                  ['Connections made', stats.connections],
                ].map(([label, n]) => (
                  <div key={label}>
                    <dd className="font-display text-3xl text-ink leading-none">{fmt(n)}</dd>
                    <dt className="text-xs text-ink-3 mt-1">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Illustrative cards (clearly labelled) */}
          <div className="relative hidden lg:block h-[420px]" aria-hidden="true">
            {[DEMO_A, DEMO_B].map((c, i) => (
              <div
                key={c.name}
                className={`absolute w-60 bg-white rounded-2xl border border-canvas-3 shadow-card p-5 ${
                  i === 0 ? 'top-0 left-0 -rotate-3 animate-float-slow' : 'top-40 left-28 rotate-2 animate-float-mid z-10'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-3 ${c.color}`}>
                  {c.initials}
                </div>
                <div className="font-semibold text-sm text-ink">{c.name}</div>
                <div className="text-[11px] text-ink-3 mb-2.5">{c.role}</div>
                <div className="flex flex-wrap gap-1">
                  {c.teaches.slice(0, 2).map((t) => <span key={t} className="tag-teach">{t}</span>)}
                  {c.learns.slice(0, 1).map((t) => <span key={t} className="tag-learn">{t}</span>)}
                </div>
                {i === 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1 bg-sage text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    ✓ {HERO_SCORE}% match
                  </div>
                )}
              </div>
            ))}
            <div className="absolute top-[190px] left-[230px] z-20 w-12 h-12 rounded-full bg-ink flex items-center justify-center text-sage-light text-lg font-bold shadow-lift">⇄</div>
            <div className="absolute bottom-0 left-0"><ExampleBadge>Example profiles</ExampleBadge></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <div className="bg-canvas-2 border-y border-canvas-3">
        <ul className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white border border-canvas-3 flex items-center justify-center text-xl shrink-0" aria-hidden="true">{f.icon}</div>
              <div>
                <h3 className="font-sans font-semibold text-sm mb-0.5">{f.title}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* HOW IT WORKS */}
      <section className="bg-ink py-16 md:py-24 px-4 sm:px-6" aria-labelledby="how-title">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 id="how-title" className="font-display text-3xl md:text-4xl text-white mb-3">How SkillSwap works</h2>
            <p className="text-white/70 max-w-md mx-auto">Four steps from signing up to your first swap</p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <li key={s.n}>
                <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center font-display text-2xl text-sage-light mb-5" aria-hidden="true">{s.n}</div>
                <h3 className="font-sans font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CATEGORIES (counts are real, from the API) */}
      <section className="bg-canvas py-16 md:py-24 px-4 sm:px-6" aria-labelledby="cat-title">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-14">
            <h2 id="cat-title" className="font-display text-3xl md:text-4xl text-ink mb-3">Browse by skill category</h2>
            <p className="text-ink-3 max-w-md mx-auto">From coding to cooking, find a swap partner</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_CARDS.map((cat) => {
              const n = stats?.categories?.[cat.key]
              return (
                <Link key={cat.key} to={`/browse?category=${encodeURIComponent(cat.key)}`} className="card card-hover p-6 flex flex-col gap-2 group">
                  <div className="text-3xl mb-1" aria-hidden="true">{cat.icon}</div>
                  <h3 className="font-sans font-semibold text-ink group-hover:text-sage transition-colors">{cat.name}</h3>
                  {typeof n === 'number' && (
                    <p className="text-xs text-ink-3">{n} {n === 1 ? 'member teaches' : 'members teach'} here</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cat.tags.map((t) => <span key={t} className={cat.cls}>{t}</span>)}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <SmartMatching />
      <Community />
      <ChatUI />

      {/* CTA */}
      <section className="bg-sage py-20 md:py-28 px-4 sm:px-6 text-center">
        <h2 className="font-display text-3xl md:text-5xl text-white mb-4">Ready to start swapping?</h2>
        <p className="text-white/90 text-lg mb-10">Create a free profile and see who matches you.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          {user ? (
            <Link to="/browse" className="btn btn-lg bg-white text-sage font-semibold hover:bg-canvas">Browse skills →</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-lg bg-white text-sage font-semibold hover:bg-canvas">Create your profile →</Link>
              <Link to="/login" className="btn btn-lg bg-white/10 text-white border border-white/30 hover:bg-white/20">Sign in</Link>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
