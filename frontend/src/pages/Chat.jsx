import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { uid } from '../lib/id'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useToast } from '../context/ToastContext'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'

const PAGE = 30

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d) => {
  const date = new Date(d)
  const today = new Date()
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yest.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const REASONS = {
  offline: "You're offline. Reconnecting…",
  timeout: 'The server took too long to answer.',
  rate_limited: "You're sending messages too fast.",
  forbidden: "You're not part of this conversation.",
}

export default function Chat() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { error: toastError } = useToast()
  const {
    socket, connected, onlineUsers, unread, typingMap, conversationsTick,
    sendMessage, startTyping, stopTyping, setActiveConversation, markRead,
  } = useSocket()

  const [convos, setConvos] = useState([])
  const [loadConvos, setLoadConvos] = useState(true)
  const [convosFailed, setConvosFailed] = useState(false)
  const [messages, setMessages] = useState([]) // may include optimistic { clientId, status: 'sending' | 'failed' }
  const [nextCursor, setNextCursor] = useState(null)
  const [loadMsgs, setLoadMsgs] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('')

  const scroller = useRef(null)
  const bottomRef = useRef(null)
  const typingTimer = useRef(null)
  const stickToBottom = useRef(true)
  const restoreScroll = useRef(null)
  const activeRef = useRef(conversationId)
  activeRef.current = conversationId

  const active = useMemo(() => convos.find((c) => c._id === conversationId) || null, [convos, conversationId])
  const other = useCallback((c) => c?.participants?.find((p) => p._id !== user?._id), [user?._id])

  // ── Conversation list (reloads when someone starts a conversation with me) ───
  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/api/chat/conversations', { signal: controller.signal })
      .then(({ data }) => {
        setConvos(data.conversations)
        setConvosFailed(false)
      })
      .catch((err) => {
        if (!controller.signal.aborted) setConvosFailed(true)
        return err
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadConvos(false)
      })
    return () => controller.abort()
  }, [conversationsTick])

  // ── Open whichever conversation the URL points to (reacts to /chat/:id changes) ──
  useEffect(() => {
    setMessages([])
    setNextCursor(null)
    setInput('')
    stickToBottom.current = true
    if (!conversationId) {
      setActiveConversation(null)
      return undefined
    }
    setActiveConversation(conversationId)
    const controller = new AbortController()
    setLoadMsgs(true)
    api
      .get(`/api/chat/conversations/${conversationId}/messages`, { params: { limit: PAGE }, signal: controller.signal })
      .then(({ data }) => {
        setMessages(data.messages)
        setNextCursor(data.nextCursor)
        markRead(conversationId)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        toastError(errorMessage(err, "Couldn't open this conversation."))
        if (err.response?.status === 403 || err.response?.status === 400) navigate('/chat', { replace: true })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadMsgs(false)
      })
    return () => {
      controller.abort()
      setActiveConversation(null)
    }
  }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return undefined

    const onMessage = (msg) => {
      const cid = String(msg.conversation)
      setConvos((prev) => {
        if (!prev.some((c) => c._id === cid)) return prev // list reload (conversation:new) will pick it up
        return prev
          .map((c) => (c._id === cid ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt } : c))
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      })
      if (cid !== activeRef.current) return
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev
        // Replace my optimistic bubble in place instead of adding a duplicate.
        if (msg.clientId && prev.some((m) => m.clientId === msg.clientId)) {
          return prev.map((m) => (m.clientId === msg.clientId ? { ...msg, status: 'sent' } : m))
        }
        return [...prev, msg]
      })
      if (msg.sender?._id !== user?._id) markRead(cid)
    }

    const onRead = ({ conversationId: cid }) => {
      if (cid !== activeRef.current) return
      setMessages((prev) => prev.map((m) => (m.sender?._id === user?._id ? { ...m, read: true } : m)))
    }

    socket.on('message:new', onMessage)
    socket.on('messages:read', onRead)
    return () => {
      socket.off('message:new', onMessage)
      socket.off('messages:read', onRead)
    }
  }, [socket, user?._id, markRead])

  // ── Scrolling ───────────────────────────────────────────────────────────────
  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (el.scrollTop < 60 && nextCursor && !loadingOlder && !loadMsgs) loadOlder()
  }

  const loadOlder = async () => {
    const el = scroller.current
    setLoadingOlder(true)
    restoreScroll.current = el ? { height: el.scrollHeight, top: el.scrollTop } : null
    try {
      const { data } = await api.get(`/api/chat/conversations/${conversationId}/messages`, {
        params: { limit: PAGE, before: nextCursor },
      })
      setMessages((prev) => [...data.messages, ...prev])
      setNextCursor(data.nextCursor)
    } catch (err) {
      restoreScroll.current = null
      toastError(errorMessage(err, "Couldn't load older messages."))
    } finally {
      setLoadingOlder(false)
    }
  }

  // Keep the viewport anchored: stay at the bottom for new messages, but don't jump when older ones are prepended.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    if (restoreScroll.current) {
      el.scrollTop = el.scrollHeight - restoreScroll.current.height + restoreScroll.current.top
      restoreScroll.current = null
    } else if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length > PAGE ? 'smooth' : 'auto' })
    }
  }, [messages])

  // ── Sending (optimistic, with ack and retry) ───────────────────────────────
  const deliver = useCallback(
    async (clientId, cid, content) => {
      try {
        const saved = await sendMessage(cid, content, clientId)
        setMessages((prev) => {
          // The live event may already have replaced the bubble; never create a duplicate.
          if (prev.some((m) => m._id === saved._id)) return prev.filter((m) => m.clientId !== clientId || m._id)
          return prev.map((m) => (m.clientId === clientId ? { ...saved, clientId, status: 'sent' } : m))
        })
      } catch (err) {
        setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed', reason: err.code } : m)))
      }
    },
    [sendMessage],
  )

  const handleSend = () => {
    const text = input.trim()
    if (!text || !conversationId) return
    const clientId = uid()
    stickToBottom.current = true
    setMessages((prev) => [
      ...prev,
      {
        clientId, status: 'sending', content: text, conversation: conversationId, createdAt: new Date().toISOString(),
        sender: { _id: user._id, name: user.name, initials: user.initials, avatarColor: user.avatarColor },
      },
    ])
    setInput('')
    clearTimeout(typingTimer.current)
    stopTyping(conversationId)
    deliver(clientId, conversationId, text)
  }

  const retry = (m) => {
    setMessages((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, status: 'sending', reason: undefined } : x)))
    deliver(m.clientId, conversationId, m.content)
  }
  const discard = (m) => setMessages((prev) => prev.filter((x) => x.clientId !== m.clientId))

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    if (!conversationId || !e.target.value) return
    startTyping(conversationId) // throttled inside the provider: at most once per 2s
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => stopTyping(conversationId), 2500)
  }
  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const typingNames = Object.values(typingMap[conversationId] || {})
  const visibleConvos = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return convos
    return convos.filter((c) => other(c)?.name?.toLowerCase().includes(q) || c.lastMessage?.content?.toLowerCase().includes(q))
  }, [convos, filter, other])

  const isOnline = (o) => (o && onlineUsers && o._id in onlineUsers ? onlineUsers[o._id] : o?.isOnline)
  const o = other(active)
  // On small screens show either the list or the conversation (the URL decides).
  const showMain = !!conversationId

  return (
    <div className="flex h-[calc(100vh-56px)] bg-canvas overflow-hidden">
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        aria-label="Conversations"
        className={`${showMain ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-72 lg:w-80 bg-white border-r border-canvas-3 shrink-0`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-canvas-2">
          <h1 className="font-sans font-semibold text-sm">Messages</h1>
          <span className="bg-sage-pale text-sage-dark text-[11px] font-semibold px-2 py-0.5 rounded-full">{convos.length}</span>
        </div>
        <div className="px-3 py-2.5 border-b border-canvas-2">
          <label htmlFor="convo-filter" className="sr-only">Search conversations</label>
          <input
            id="convo-filter" type="search" className="input text-sm py-2" placeholder="Search conversations…"
            value={filter} onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadConvos ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : convosFailed ? (
            <p role="alert" className="text-center px-4 py-10 text-sm text-ink-3">Couldn't load conversations.</p>
          ) : convos.length === 0 ? (
            <div className="text-center px-4 py-10">
              <p className="text-ink-3 text-sm mb-3">No conversations yet</p>
              <Link to="/browse" className="btn btn-dark btn-sm">Find partners →</Link>
            </div>
          ) : visibleConvos.length === 0 ? (
            <p className="text-center px-4 py-10 text-sm text-ink-3">No conversations match “{filter}”.</p>
          ) : (
            visibleConvos.map((c) => {
              const p = other(c)
              const count = unread[c._id] || 0
              return (
                <Link
                  key={c._id}
                  to={`/chat/${c._id}`}
                  aria-current={c._id === conversationId ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-canvas-2/50 ${
                    c._id === conversationId ? 'bg-canvas-2' : 'hover:bg-canvas'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar user={p} size="sm" />
                    {isOnline(p) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-sage-light border-2 border-white" aria-label="online" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm text-ink truncate ${count ? 'font-semibold' : 'font-medium'}`}>{p?.name || 'Unknown user'}</div>
                    <div className={`text-xs truncate mt-0.5 ${count ? 'text-ink' : 'text-ink-3'}`}>
                      {c.lastMessage?.content || 'Start the conversation'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.lastMessage && <span className="text-[10px] text-ink-3">{fmtTime(c.lastMessageAt)}</span>}
                    {count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-rose text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-label={`${count} unread`}>
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main className={`${showMain ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden min-w-0`}>
        {!conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <h2 className="font-display text-2xl">Select a conversation</h2>
            <p className="text-ink-3 text-sm max-w-xs">Choose from the sidebar, or find skill partners to start chatting.</p>
            <Link to="/browse" className="btn btn-dark">Browse members →</Link>
          </div>
        ) : !active && !loadConvos ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <h2 className="font-display text-2xl">Conversation not found</h2>
            <Link to="/chat" className="btn btn-dark">Back to messages</Link>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-white border-b border-canvas-3 shrink-0">
              <Link to="/chat" className="md:hidden text-ink-3 hover:text-ink mr-1" aria-label="Back to conversations">←</Link>
              <div className="relative shrink-0">
                <Avatar user={o} size="sm" />
                {isOnline(o) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-sage-light border-2 border-white" aria-hidden="true" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-sans font-semibold text-sm truncate">{o?.name}</h2>
                <p className={`text-xs truncate ${isOnline(o) ? 'text-sage' : 'text-ink-3'}`}>
                  {isOnline(o) ? 'Online now' : 'Offline'}
                  {active?.skillSwapContext?.teachSkill && (
                    <span className="text-ink-3"> · {active.skillSwapContext.teachSkill} ↔ {active.skillSwapContext.learnSkill}</span>
                  )}
                </p>
              </div>
              {o && <Link to={`/user/${o._id}`} className="btn btn-outline btn-sm">Profile</Link>}
            </header>

            {!connected && (
              <div role="status" className="bg-amber-pale text-amber text-xs text-center py-1.5">Reconnecting… messages will be sent when you're back online.</div>
            )}

            <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-1">
              {loadMsgs ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : (
                <>
                  {nextCursor ? (
                    <button type="button" onClick={loadOlder} disabled={loadingOlder} className="self-center text-xs text-sage hover:underline mb-2">
                      {loadingOlder ? 'Loading…' : 'Load older messages'}
                    </button>
                  ) : messages.length > 0 ? (
                    <p className="self-center text-[11px] text-ink-3 mb-2">Start of conversation</p>
                  ) : (
                    <p className="self-center text-sm text-ink-3 py-10">Say hello to {o?.name?.split(' ')[0] || 'them'}.</p>
                  )}

                  {messages.map((msg, i) => {
                    const isMe = msg.sender?._id === user?._id
                    const showDate = i === 0 || fmtDate(messages[i - 1]?.createdAt) !== fmtDate(msg.createdAt)
                    const failed = msg.status === 'failed'
                    return (
                      <div key={msg._id || msg.clientId}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[11px] text-ink-3 bg-canvas-2 border border-canvas-3 px-3 py-1 rounded-full">{fmtDate(msg.createdAt)}</span>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && <Avatar user={msg.sender} size="xs" className="mb-0.5 shrink-0" />}
                          <div className={`max-w-[75%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                                isMe ? 'bg-ink text-white rounded-br-sm' : 'bg-white border border-canvas-3 text-ink rounded-bl-sm'
                              } ${msg.status === 'sending' ? 'opacity-60' : ''} ${failed ? 'ring-2 ring-rose' : ''}`}
                            >
                              {msg.content}
                            </div>
                            <div className="text-[10px] text-ink-3 mt-1 px-1 flex items-center gap-2">
                              {failed ? (
                                <>
                                  <span className="text-rose" role="alert">{REASONS[msg.reason] || 'Not sent.'}</span>
                                  <button type="button" onClick={() => retry(msg)} className="underline text-sage">Retry</button>
                                  <button type="button" onClick={() => discard(msg)} className="underline">Discard</button>
                                </>
                              ) : msg.status === 'sending' ? (
                                <span>Sending…</span>
                              ) : (
                                <>
                                  <span>{fmtTime(msg.createdAt)}</span>
                                  {isMe && msg.read && <span aria-label="Seen">Seen</span>}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {typingNames.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-ink-3 py-2" role="status">
                      <div className="flex gap-1" aria-hidden="true">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-4 animate-typing" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                      <span>{typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…</span>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            <div className="flex items-end gap-3 px-4 md:px-6 py-4 bg-white border-t border-canvas-3 shrink-0">
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <textarea
                id="chat-input"
                className="input flex-1 resize-none min-h-[42px] max-h-32 py-2.5 text-sm"
                placeholder="Type a message… (Enter to send)"
                value={input} onChange={handleInput} onKeyDown={handleKey}
                maxLength={2000} rows={1}
              />
              <button
                type="button" onClick={handleSend} disabled={!input.trim()} aria-label="Send message"
                className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white shrink-0 hover:bg-sage transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
