import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'

const fmtTime = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtDate = d => {
  const date = new Date(d), today = new Date(), yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yest.toDateString())  return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const { socket, onlineUsers, joinRoom, sendMessage, startTyping, stopTyping } = useSocket()
  const navigate = useNavigate()

  const [convos, setConvos]         = useState([])
  const [active, setActive]         = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [loadConvos, setLoadConvos] = useState(true)
  const [loadMsgs, setLoadMsgs]     = useState(false)
  const [typingMap, setTypingMap]   = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const bottomRef   = useRef(null)
  const typingTimer = useRef(null)

  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  // Load conversations
  useEffect(() => {
    api.get('/api/chat/conversations')
      .then(({ data }) => {
        setConvos(data.conversations)
        if (conversationId) {
          const found = data.conversations.find(c => c._id === conversationId)
          if (found) openConvo(found)
        }
      })
      .catch(console.error)
      .finally(() => setLoadConvos(false))
  }, [])

  const openConvo = useCallback(async convo => {
    setActive(convo)
    setMessages([])
    setLoadMsgs(true)
    navigate(`/chat/${convo._id}`, { replace: true })
    joinRoom(convo._id)
    try {
      const { data } = await api.get(`/chat/conversations/${convo._id}/messages`)
      setMessages(data.messages)
    } catch (e) { console.error(e) }
    finally { setLoadMsgs(false) }
  }, [navigate, joinRoom])

  // Socket events
  useEffect(() => {
    if (!socket) return
    const onMsg = msg => {
      if (msg.conversation === active?._id)
        setMessages(p => [...p, msg])
      setConvos(p => p.map(c => c._id === msg.conversation
        ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt } : c
      ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)))
    }
    const onTypeStart = ({ userId, name }) => setTypingMap(p => ({ ...p, [userId]: name }))
    const onTypeStop  = ({ userId })       => setTypingMap(p => { const n = { ...p }; delete n[userId]; return n })

    socket.on('message:new',   onMsg)
    socket.on('typing:start',  onTypeStart)
    socket.on('typing:stop',   onTypeStop)
    return () => { socket.off('message:new', onMsg); socket.off('typing:start', onTypeStart); socket.off('typing:stop', onTypeStop) }
  }, [socket, active])

  useEffect(() => { scrollBottom() }, [messages])

  const other = convo => convo?.participants?.find(p => p._id !== user?._id)

  const handleSend = () => {
    const t = input.trim()
    if (!t || !active) return
    sendMessage(active._id, t)
    setInput('')
    stopTyping(active._id)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = e => {
    setInput(e.target.value)
    if (!active) return
    startTyping(active._id)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => stopTyping(active._id), 2000)
  }

  const typingNames = Object.values(typingMap)

  return (
    <div className="flex h-[calc(100vh-56px)] bg-canvas overflow-hidden">

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-72 lg:w-80 bg-white border-r border-canvas-3 shrink-0`}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-canvas-2">
          <h3 className="font-semibold text-sm">Messages</h3>
          <span className="bg-sage-pale text-sage-dark text-[11px] font-semibold px-2 py-0.5 rounded-full">{convos.length}</span>
        </div>
        <div className="px-3 py-2.5 border-b border-canvas-2">
          <input className="input text-sm py-2" placeholder="Search conversations…" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadConvos ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : convos.length === 0 ? (
            <div className="text-center px-4 py-10">
              <p className="text-ink-4 text-sm mb-3">No conversations yet</p>
              <a href="/browse" className="btn btn-dark btn-sm">Find partners →</a>
            </div>
          ) : convos.map(c => {
            const o = other(c)
            const isActive = active?._id === c._id
            const isOnline = o && onlineUsers[o._id]
            return (
              <button
                key={c._id}
                onClick={() => { openConvo(c); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-canvas-2/50
                  ${isActive ? 'bg-canvas-2' : 'hover:bg-canvas'}`}
              >
                <div className="relative shrink-0">
                  <Avatar user={o} size="sm" />
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-sage-light border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{o?.name || '?'}</div>
                  <div className="text-xs text-ink-4 truncate mt-0.5">
                    {c.lastMessage?.content || 'Start the conversation'}
                  </div>
                </div>
                {c.lastMessageAt && (
                  <div className="text-[10px] text-ink-4 shrink-0">{fmtTime(c.lastMessageAt)}</div>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main className={`${!sidebarOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden min-w-0`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="text-6xl">💬</div>
            <h3 className="font-display text-2xl">Select a conversation</h3>
            <p className="text-ink-4 text-sm max-w-xs">Choose from the sidebar, or find skill partners to start chatting.</p>
            <a href="/browse" className="btn btn-dark">Browse skill swappers →</a>
          </div>
        ) : (
          <>
            {/* Chat header */}
            {(() => {
              const o = other(active)
              const isOnline = o && onlineUsers[o._id]
              return (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-canvas-3 shrink-0">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="md:hidden text-ink-4 hover:text-ink mr-1">←</button>
                  <div className="relative shrink-0">
                    <Avatar user={o} size="sm" />
                    {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-sage-light border-2 border-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{o?.name}</div>
                    <div className={`text-xs ${isOnline ? 'text-sage' : 'text-ink-4'}`}>
                      {isOnline ? '● Online now' : '○ Offline'}
                      {active.skillSwapContext?.teachSkill && (
                        <span className="text-ink-4"> · {active.skillSwapContext.teachSkill} ↔ {active.skillSwapContext.learnSkill}</span>
                      )}
                    </div>
                  </div>
                  <a href={`/user/${o?._id}`} className="btn btn-outline btn-sm">Profile</a>
                </div>
              )
            })()}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-1">
              {loadMsgs ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMe = msg.sender?._id === user?._id
                    const showDate = i === 0 || fmtDate(messages[i-1]?.createdAt) !== fmtDate(msg.createdAt)
                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[11px] text-ink-4 bg-canvas-2 border border-canvas-3 px-3 py-1 rounded-full">
                              {fmtDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && <Avatar user={msg.sender} size="xs" className="mb-0.5 shrink-0" />}
                          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                              ${isMe
                                ? 'bg-ink text-white rounded-br-sm'
                                : 'bg-white border border-canvas-3 text-ink rounded-bl-sm'}`}>
                              {msg.content}
                            </div>
                            <div className="text-[10px] text-ink-4 mt-1 px-1">{fmtTime(msg.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Typing indicator */}
                  {typingNames.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-ink-4 py-2">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-4 animate-typing"
                            style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                      <span>{typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…</span>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="flex items-end gap-3 px-4 md:px-6 py-4 bg-white border-t border-canvas-3 shrink-0">
              <textarea
                className="input flex-1 resize-none min-h-[42px] max-h-32 py-2.5 text-sm"
                placeholder="Type a message… (Enter to send)"
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white shrink-0
                  hover:bg-sage transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
