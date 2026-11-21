import { Link } from 'react-router-dom'
import { DEMO_A, DEMO_B } from '../data/demo'
import { scoreMatch } from '../lib/match'
import ExampleBadge from './ExampleBadge'

// Computed with the real formula, so this number can never disagree with what the product shows.
const SCORE = scoreMatch(DEMO_A.teaches, DEMO_A.learns, DEMO_B.teaches, DEMO_B.learns)

function Person({ p }) {
  return (
    <div className="bg-canvas border border-canvas-3 rounded-2xl p-6 text-left">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${p.color}`} aria-hidden="true">
          {p.initials}
        </div>
        <div>
          <h3 className="font-sans font-semibold text-ink">{p.name}</h3>
          <p className="text-sm text-ink-3">{p.role}</p>
        </div>
      </div>
      <p className="section-label mb-3">Can teach</p>
      <ul className="flex flex-wrap gap-2 mb-6">
        {p.teaches.map((t) => <li key={t} className="tag-teach">{t}</li>)}
      </ul>
      <p className="section-label mb-3">Wants to learn</p>
      <ul className="flex flex-wrap gap-2">
        {p.learns.map((t) => <li key={t} className="tag-learn">{t}</li>)}
      </ul>
    </div>
  )
}

export default function SmartMatching() {
  return (
    <section className="bg-canvas-2 py-16 md:py-24 px-4 sm:px-6" aria-labelledby="matching-title">
      <div className="max-w-7xl mx-auto text-center">
        <h2 id="matching-title" className="font-display text-3xl md:text-4xl text-ink mb-4">
          Skill matching that goes both ways
        </h2>
        <p className="text-ink-3 max-w-2xl mx-auto mb-4">
          We rank members by how well what you teach fits what they want to learn, and the other way around. Skill names
          are normalized, so “JS” and “JavaScript” count as the same skill.
        </p>
        <div className="mb-10"><ExampleBadge>Example</ExampleBadge></div>

        <div className="bg-white border border-canvas-3 rounded-2xl p-5 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-center">
            <Person p={DEMO_A} />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-ink text-sage-light rounded-full flex items-center justify-center text-xl mb-6 shadow-lift" aria-hidden="true">⇄</div>
              <div className="text-center mb-6">
                <p className="font-display text-5xl text-sage">{SCORE}%</p>
                <p className="text-sm text-ink-3 mt-1">Compatibility score</p>
                <p className="text-xs text-ink-3 mt-2 max-w-[14rem]">
                  3 of the 4 wanted skills are covered: (Figma, UI Design) + (Python)
                </p>
              </div>
              <Link to="/register" className="btn btn-primary">Find your matches</Link>
            </div>
            <Person p={DEMO_B} />
          </div>
        </div>
      </div>
    </section>
  )
}
