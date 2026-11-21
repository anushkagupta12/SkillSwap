import { DEMO_CHAT, DEMO_B } from '../data/demo'
import ExampleBadge from './ExampleBadge'

/** Static mock of the chat, to show what it looks like. Not live, not real people. */
export default function ChatUI() {
  return (
    <section className="bg-canvas-2 py-16 md:py-24 px-4 sm:px-6" aria-labelledby="chat-title">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h2 id="chat-title" className="font-display text-3xl md:text-4xl text-ink mb-4">Chat in real time</h2>
        <p className="text-ink-3 max-w-lg mx-auto leading-relaxed mb-4">
          Once you connect, talk directly: plan sessions, share resources and see when your partner is typing.
        </p>
        <ExampleBadge>Example conversation</ExampleBadge>
      </div>

      <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-canvas-3 overflow-hidden shadow-card">
        <div className="p-4 border-b border-canvas-2 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs ${DEMO_B.color}`} aria-hidden="true">
            {DEMO_B.initials}
          </div>
          <div>
            <h3 className="font-sans font-semibold text-sm">{DEMO_B.name}</h3>
            <p className="text-[11px] text-ink-3">Python ↔ Figma swap</p>
          </div>
        </div>
        <div className="p-4 sm:p-8 space-y-6 bg-white">
          {DEMO_CHAT.map((m, i) => (
            <div key={i} className={`max-w-[85%] sm:max-w-[75%] ${m.from === 'me' ? 'ml-auto' : ''}`}>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.from === 'me' ? 'bg-ink text-white rounded-tr-none' : 'bg-canvas text-ink rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
              <span className={`text-[10px] text-ink-3 mt-1.5 block ${m.from === 'me' ? 'text-right' : ''}`}>{m.time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
