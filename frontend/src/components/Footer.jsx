import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-ink text-white/70 pt-16 pb-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-16 mb-12">
          <div className="sm:col-span-2 md:col-span-2">
            <p className="font-display text-2xl text-white mb-4">
              Skill<span className="text-sage-light">Swap</span>
            </p>
            <p className="text-sm leading-relaxed max-w-xs">
              A place to trade what you know for what you want to learn. No fees, just people helping each other.
            </p>
          </div>

          <nav aria-label="Platform">
            <h2 className="text-xs text-white/60 uppercase mb-4 tracking-wider font-sans font-semibold">Platform</h2>
            <ul className="space-y-3 text-sm">
              <li><Link className="hover:text-white" to="/browse">Browse skills</Link></li>
              <li><Link className="hover:text-white" to="/matches">Find matches</Link></li>
              <li><Link className="hover:text-white" to="/chat">Messages</Link></li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="text-xs text-white/60 uppercase mb-4 tracking-wider font-sans font-semibold">Account</h2>
            <ul className="space-y-3 text-sm">
              <li><Link className="hover:text-white" to="/register">Create account</Link></li>
              <li><Link className="hover:text-white" to="/login">Sign in</Link></li>
              <li><Link className="hover:text-white" to="/profile">Your profile</Link></li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-6 text-sm">
          <p>© {new Date().getFullYear()} SkillSwap. Built with React, Node.js, Express, MongoDB and Socket.IO.</p>
        </div>
      </div>
    </footer>
  )
}
