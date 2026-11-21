import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

import { API_URL, api, getAccessToken, refreshSession, subscribeToken } from '../lib/api'
import { uid } from '../lib/id'

const SocketContext = createContext(null)

const NOTIF_MS = 5000

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const userId = user?._id // NOT the whole user object: saving the profile must not reconnect the socket

  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState({}) // userId -> boolean (from presence:init + live events)
  const [swapNotifs, setSwapNotifs] = useState([])
  const [receivedTick, setReceivedTick] = useState(0) // bumps when a swap request arrives (Navbar refetches)
  const [conversationsTick, setConversationsTick] = useState(0) // bumps when a new conversation involves me
  const [unread, setUnread] = useState({}) // conversationId -> count
  const [typingMap, setTypingMap] = useState({}) // conversationId -> { userId: name }

  const ref = useRef(null)
  const activeConvo = useRef(null)
  const typingTimers = useRef(new Map())
  const notifTimers = useRef(new Map())
  const lastTypingSent = useRef(new Map())

  const dismissSwapNotif = useCallback((id) => {
    clearTimeout(notifTimers.current.get(id))
    notifTimers.current.delete(id)
    setSwapNotifs((p) => p.filter((n) => n.id !== id))
  }, [])

  const pushNotif = useCallback(
    (notif) => {
      const id = uid()
      setSwapNotifs((p) => [...p.slice(-3), { ...notif, id }])
      notifTimers.current.set(id, setTimeout(() => dismissSwapNotif(id), NOTIF_MS))
    },
    [dismissSwapNotif],
  )

  // ── Connection lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return undefined
          const s = io(API_URL || undefined, {
      // A function, so every (re)connect uses the CURRENT access token.
      auth: (cb) => cb({ token: getAccessToken() }),
      // Default transports: polling first, then upgrade to websocket (keeps the fallback for proxies / cold starts).
      reconnectionDelayMax: 8000,
    })
    ref.current = s
    setSocket(s)

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => {
      setConnected(false)
      // Presence of others is unknown while offline; it is re-seeded by presence:init on reconnect.
      setOnlineUsers({})
    })

    s.on('presence:init', ({ online }) => setOnlineUsers(Object.fromEntries((online || []).map((id) => [id, true]))))
    s.on('user:status', ({ userId: id, isOnline }) => setOnlineUsers((p) => ({ ...p, [id]: isOnline })))

    // Swap notifications are emitted by the server after the DB write; the client never sends them.
    s.on('swap:request:received', ({ from, requestId }) => {
      pushNotif({ type: 'received', from, requestId })
      setReceivedTick((n) => n + 1)
    })
    s.on('swap:request:response', ({ from, status, requestId }) => pushNotif({ type: 'response', from, status, requestId }))

    s.on('conversation:new', () => setConversationsTick((n) => n + 1))

    s.on('message:new', (msg) => {
      const cid = String(msg.conversation)
      if (msg.sender?._id !== userId && activeConvo.current !== cid) {
        setUnread((p) => ({ ...p, [cid]: (p[cid] || 0) + 1 }))
      }
    })

    s.on('typing:start', ({ conversationId, userId: uidTyping, name }) => {
      setTypingMap((p) => ({ ...p, [conversationId]: { ...p[conversationId], [uidTyping]: name } }))
      // Safety net: if "stop" is lost, the indicator disappears on its own.
      const key = `${conversationId}:${uidTyping}`
      clearTimeout(typingTimers.current.get(key))
      typingTimers.current.set(
        key,
        setTimeout(() => clearTyping(conversationId, uidTyping), 5000),
      )
    })
    s.on('typing:stop', ({ conversationId, userId: uidTyping }) => clearTyping(conversationId, uidTyping))

    function clearTyping(conversationId, uidTyping) {
      clearTimeout(typingTimers.current.get(`${conversationId}:${uidTyping}`))
      setTypingMap((p) => {
        if (!p[conversationId]?.[uidTyping]) return p
        const room = { ...p[conversationId] }
        delete room[uidTyping]
        return { ...p, [conversationId]: room }
      })
    }

    // The server drops sockets whose token expired. Get a new one and reconnect.
    s.on('auth:expired', () => {
      refreshSession()
        .then(() => s.connect())
        .catch(() => {})
    })
    s.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        refreshSession()
          .then(() => s.connect())
          .catch(() => {})
      }
    })

    // Seed unread counts (also re-runs after reconnects through the `connect` listener below).
    const seedUnread = () =>
      api
        .get('/api/chat/conversations')
        .then(({ data }) => {
          setUnread(Object.fromEntries(data.conversations.filter((c) => c.unreadCount).map((c) => [c._id, c.unreadCount])))
        })
        .catch(() => {})
    s.on('connect', seedUnread)

    const timers = typingTimers.current
    const notifs = notifTimers.current
    return () => {
      s.removeAllListeners()
      s.disconnect()
      ref.current = null
      setSocket(null)
      setConnected(false)
      setOnlineUsers({})
      setUnread({})
      setTypingMap({})
      timers.forEach(clearTimeout)
      timers.clear()
      notifs.forEach(clearTimeout)
      notifs.clear()
    }
  }, [userId, pushNotif])

  // When the access token rotates, re-authenticate the live socket instead of reconnecting it.
  useEffect(
    () =>
      subscribeToken((token) => {
        const s = ref.current
        if (token && s?.connected) s.emit('auth:refresh', { token })
      }),
    [],
  )

  // ── Actions ─────────────────────────────────────────────────────────────────
  /** Sends with an ack. Resolves with the saved message, rejects with an Error whose .code is a short reason. */
  const sendMessage = useCallback(
    (conversationId, content, clientId) =>
      new Promise((resolve, reject) => {
        const s = ref.current
        if (!s?.connected) return reject(Object.assign(new Error('offline'), { code: 'offline' }))
        s.timeout(8000).emit('message:send', { conversationId, content, clientId }, (err, res) => {
          if (err) return reject(Object.assign(new Error('timeout'), { code: 'timeout' }))
          if (!res?.ok) return reject(Object.assign(new Error(res?.code || 'error'), { code: res?.code || 'error' }))
          resolve(res.message)
        })
      }),
    [],
  )

  // Throttled: at most one "typing:start" every 2 seconds, however fast the user types.
  const startTyping = useCallback((conversationId) => {
    const now = Date.now()
    if (now - (lastTypingSent.current.get(conversationId) || 0) < 2000) return
    lastTypingSent.current.set(conversationId, now)
    ref.current?.emit('typing:start', { conversationId })
  }, [])
  const stopTyping = useCallback((conversationId) => {
    lastTypingSent.current.delete(conversationId)
    ref.current?.emit('typing:stop', { conversationId })
  }, [])

  /** The chat the user is looking at: its messages don't count as unread. */
  const setActiveConversation = useCallback((conversationId) => {
    activeConvo.current = conversationId ? String(conversationId) : null
    if (conversationId) setUnread((p) => (p[conversationId] ? { ...p, [conversationId]: 0 } : p))
  }, [])

  const markRead = useCallback((conversationId) => {
    setUnread((p) => (p[conversationId] ? { ...p, [conversationId]: 0 } : p))
    ref.current?.emit('messages:read', { conversationId })
  }, [])

  const totalUnread = useMemo(() => Object.values(unread).reduce((a, b) => a + b, 0), [unread])

  const value = useMemo(
    () => ({
      socket, connected, onlineUsers, swapNotifs, dismissSwapNotif, receivedTick, conversationsTick,
      unread, totalUnread, typingMap, sendMessage, startTyping, stopTyping, setActiveConversation, markRead,
    }),
    [
      socket, connected, onlineUsers, swapNotifs, dismissSwapNotif, receivedTick, conversationsTick,
      unread, totalUnread, typingMap, sendMessage, startTyping, stopTyping, setActiveConversation, markRead,
    ],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export const useSocket = () => useContext(SocketContext)
