import type { Mesa } from '../../types'
import { getDB } from '../db'

export async function cacheMesas(mesas: Mesa[]) {
  const db = await getDB()
  const tx = db.transaction('mesas', 'readwrite')
  const store = tx.objectStore('mesas')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(mesas.map(m => store.put(m)))
  await tx.done
}

export async function readMesasCache(sucursalid?: string): Promise<Mesa[]> {
  const db = await getDB()
  const tx = db.transaction('mesas')
  const store = tx.objectStore('mesas')
  if (!sucursalid) {
    return await store.getAll() as Mesa[]
  }
  const idx = store.index('by_sucursal')
  return await idx.getAll(sucursalid) as Mesa[]
}
