import type { Preparacion } from '../../types'
import { getDB } from '../db'

export async function cachePreparaciones(items: Preparacion[]) {
  const db = await getDB()
  const tx = db.transaction('preparaciones', 'readwrite')
  const store = tx.objectStore('preparaciones')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(items.map(it => store.put(it)))
  await tx.done
}

export async function readPreparacionesCache(): Promise<Preparacion[]> {
  const db = await getDB()
  const store = db.transaction('preparaciones').objectStore('preparaciones')
  return await store.getAll() as Preparacion[]
}
