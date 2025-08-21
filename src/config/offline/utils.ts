export const isOnline = () =>
  typeof navigator !== 'undefined' ? navigator.onLine : true

export const uuid = () =>
  (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
