import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { token, user } = useAuth()
  const [socket, setSocket]           = useState(null)
  const [onlineUsers, setOnlineUsers] = useState({})
  const [swapNotifs, setSwapNotifs]   = useState([]) // incoming swap request notifications
  const ref = useRef(null)

  useEffect(() => {
    if (!token || !user) {
      ref.current?.disconnect()
      ref.current = null
      setSocket(null)
      return
    }
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    s.on('connect', () => { s.emit('join:conversations') })

    s.on('user:status', ({ userId, isOnline }) =>
      setOnlineUsers(p => ({ ...p, [userId]: isOnline })))

    // Incoming swap request — show notification
    s.on('swap:request:received', ({ from }) => {
      setSwapNotifs(p => [...p, { id: Date.now(), from, type: 'received' }])
    })

    // Response to a request you sent
    s.on('swap:request:response', ({ from, status }) => {
      setSwapNotifs(p => [...p, { id: Date.now(), from, status, type: 'response' }])
    })

    s.on('connect_error', (err) => console.error('Socket error:', err.message))

    ref.current = s
    setSocket(s)
    return () => { s.disconnect(); ref.current = null }
  }, [token, user])

  const joinRoom    = id => ref.current?.emit('join:room', id)
  const sendMessage = (roomId, content) => ref.current?.emit('message:send', { conversationId: roomId, content })
  const startTyping = id => ref.current?.emit('typing:start', { conversationId: id })
  const stopTyping  = id => ref.current?.emit('typing:stop',  { conversationId: id })

  const dismissSwapNotif = useCallback((id) => {
    setSwapNotifs(p => p.filter(n => n.id !== id))
  }, [])

  return (
    <SocketContext.Provider value={{
      socket, onlineUsers, swapNotifs, dismissSwapNotif,
      joinRoom, sendMessage, startTyping, stopTyping,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
