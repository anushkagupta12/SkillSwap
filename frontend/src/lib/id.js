/** Collision-free id (crypto.randomUUID needs a secure context; fall back for plain-http LAN testing). */
export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
