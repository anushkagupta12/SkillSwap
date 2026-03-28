import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ChatUI from '../components/ChatUI'
import Community from '../components/Community'
import SmartMatching from '../components/SmartMatching'
import Feedback from '../components/Feedback'
import Footer from '../components/Footer'
const CARDS = [
  { initials: 'KP', color: 'emerald', name: 'Kavya Patel', role: 'UX Designer · Mumbai', teaches: ['Figma', 'UI Design'], learns: ['Python'], match: 93, rotate: '-rotate-3', anim: 'animate-float-slow', top: 'top-0', left: 'left-0' },
  { initials: 'AR', color: 'violet',  name: 'Arjun Rao',   role: 'Backend Dev · Bangalore', teaches: ['Python', 'Django'], learns: ['Figma'], rotate: 'rotate-2', anim: 'animate-float-mid', top: 'top-36', left: 'left-24', zIndex: 'z-10' },
  { initials: 'SM', color: 'amber',   name: 'Shreya Mehta', role: 'Data Analyst · Delhi', teaches: ['Tableau', 'SQL'], learns: ['React'], rotate: '-rotate-1', anim: 'animate-float-fast', top: 'top-72', left: 'left-4' },
]

const STEPS = [
  { n: '1', title: 'Create your profile', desc: 'List skills you can teach and the ones you want to learn, with your experience level.' },
  { n: '2', title: 'Get smart matches',   desc: 'Our algorithm surfaces users whose teaching skills perfectly complement yours.' },
  { n: '3', title: 'Start the chat',      desc: 'Connect instantly via real-time Socket.IO chat. Plan sessions and share resources.' },
  { n: '4', title: 'Exchange skills',     desc: 'Hold your sessions, track progress, and grow together as a community.' },
]

const CATS = [
  { icon: '💻', name: 'Programming & Dev', count: '1,240', tags: ['Python','React','Node.js','SQL'], cls: 'tag-match' },
  { icon: '🎨', name: 'Design & Creative', count: '890',   tags: ['Figma','Illustration','Branding'], cls: 'tag-teach' },
  { icon: '📊', name: 'Data & Analytics',  count: '720',   tags: ['Tableau','Power BI','ML'], cls: 'tag-learn' },
  { icon: '🗣️', name: 'Languages',          count: '2,100', tags: ['Spanish','French','Japanese'], cls: 'tag-teach' },
  { icon: '🎸', name: 'Music & Arts',       count: '560',   tags: ['Guitar','Piano','Theory'], cls: 'tag-match' },
  { icon: '📈', name: 'Business',           count: '430',   tags: ['Marketing','SEO','Finance'], cls: 'tag-learn' },
]

const FEATURES = [
  { icon: '🔐', title: 'Secure Auth',      desc: 'JWT-based authentication keeps your account protected at all times.' },
  { icon: '🎯', title: 'Smart Matching',   desc: 'Algorithm finds complementary partners based on your skill profile.' },
  { icon: '⚡', title: 'Real-time Chat',   desc: 'Socket.IO powers instant messaging so sessions flow naturally.' },
  { icon: '📱', title: 'Works Everywhere', desc: 'Fully responsive across desktop, tablet, and mobile devices.' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-canvas pt-20 pb-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-sage-pale text-sage-dark text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-light animate-pulse-dot" />
              Live skill exchange network
            </div>

            <h1 className="font-display text-5xl lg:text-6xl leading-[1.07] text-ink mb-6">
              Trade what you <em className="not-italic text-sage">know</em><br/>
              for what you <em className="not-italic text-sage">want to learn</em>
            </h1>

            <p className="text-ink-3 text-lg leading-relaxed mb-9 max-w-lg">
              Connect with people who have the skills you need, and share the expertise
              you already have — no money, just genuine human-to-human knowledge transfer.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              {user ? (
                <>
                  <Link to="/browse"  className="btn btn-dark btn-lg">Browse Skills →</Link>
                  <Link to="/matches" className="btn btn-outline btn-lg">View My Matches</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-dark btn-lg">Start Swapping →</Link>
                  <Link to="/login"    className="btn btn-outline btn-lg">Sign in</Link>
                </>
              )}
            </div>

            <div className="flex gap-8 pt-8 border-t border-canvas-3">
              {[['12k+','Active learners'],['340+','Skills available'],['89%','Match satisfaction']].map(([n,l]) => (
                <div key={l}>
                  <div className="font-display text-3xl text-ink leading-none">{n}</div>
                  <div className="text-xs text-ink-4 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating cards */}
          <div className="relative h-[460px] hidden lg:block">
            {CARDS.map((c, i) => (
              <div key={i} className={`absolute ${c.top} ${c.left} ${c.rotate} ${c.anim} ${c.zIndex || ''} w-56 bg-white rounded-2xl border border-canvas-3 shadow-card p-5`}>
                <div className={`avatar-${c.color} w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-3`}>
                  {c.initials}
                </div>
                <div className="font-semibold text-sm text-ink">{c.name}</div>
                <div className="text-[11px] text-ink-4 mb-2.5">{c.role}</div>
                <div className="flex flex-wrap gap-1">
                  {c.teaches.map(t => <span key={t} className="tag-teach">{t}</span>)}
                  {c.learns.map(t  => <span key={t} className="tag-learn">{t}</span>)}
                </div>
                {c.match && (
                  <div className="mt-2.5 inline-flex items-center gap-1 bg-sage text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    ✓ {c.match}% match
                  </div>
                )}
              </div>
            ))}
            {/* swap orb */}
            <div className="absolute top-[218px] left-[276px] z-20 w-12 h-12 rounded-full bg-ink flex items-center justify-center text-sage-light text-lg font-bold shadow-lift">
              ⇄
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES STRIP ──────────────────────────────────── */}
      <div className="bg-canvas-2 border-y border-canvas-3">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white border border-canvas-3 flex items-center justify-center text-xl shrink-0">
                {f.icon}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-0.5">{f.title}</h4>
                <p className="text-xs text-ink-4 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="bg-ink py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl text-white mb-3">How SkillSwap works</h2>
            <p className="text-white/50 max-w-md mx-auto">Four simple steps to start learning and teaching through human skill exchange</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(s => (
              <div key={s.n}>
                <div className="w-14 h-14 rounded-full border border-white/10 bg-white/4 flex items-center justify-center font-display text-2xl text-sage-light mb-5">
                  {s.n}
                </div>
                <h3 className="font-sans font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────────── */}
      <section className="bg-canvas py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl text-ink mb-3">Browse by skill category</h2>
            <p className="text-ink-4 max-w-md mx-auto">From coding to cooking — find the perfect skill exchange partner</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATS.map(cat => (
              <Link
                key={cat.name}
                to={`/browse?category=${encodeURIComponent(cat.name)}`}
                className="card card-hover p-6 flex flex-col gap-2 group"
              >
                <div className="text-3xl mb-1">{cat.icon}</div>
                <h3 className="font-sans font-semibold text-ink group-hover:text-sage transition-colors">{cat.name}</h3>
                <p className="text-xs text-ink-4">{cat.count} learners</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {cat.tags.map(t => <span key={t} className={cat.cls}>{t}</span>)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      <section id = "smartmatching">
       <SmartMatching/>
      </section>
      
      <section id = "community">
        <Community />
      </section>
      <section id = "chatui">
        <ChatUI />
      </section>
      <section id = "feedback">
          <Feedback />
        </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="bg-sage py-28 px-6 text-center">
        <h2 className="font-display text-5xl text-white mb-4">Ready to start swapping?</h2>
        <p className="text-white/70 text-lg mb-10">Join 12,000+ learners exchanging skills every day. Free forever.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          {user ? (
            <Link to="/browse" className="btn btn-lg bg-white text-sage font-semibold hover:bg-canvas">Browse Skills →</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-lg bg-white text-sage font-semibold hover:bg-canvas">Create your profile →</Link>
              <Link to="/login"    className="btn btn-lg bg-white/10 text-white border border-white/20 hover:bg-white/20">Sign in</Link>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      {/* <footer className="bg-ink px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="font-display text-xl text-white mb-1">Skill<span className="text-sage-light">Swap</span></div>
            <p className="text-xs text-white/30">Built with React + Vite + Tailwind · Node.js · MongoDB · Socket.IO</p>
          </div>
          <div className="flex gap-6">
            {['/browse','/matches','/chat'].map(p => (
              <Link key={p} to={p} className="text-sm text-white/40 hover:text-white/70 capitalize transition-colors">
                {p.slice(1)}
              </Link>
            ))}
          </div>
          <p className="text-xs text-white/20">© 2026 SkillSwap</p>
        </div>
      </footer> */}
      <section>
        <Footer/>
      </section>
    </div>
  )
}
