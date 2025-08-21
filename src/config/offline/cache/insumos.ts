import type { Insumo } from '../../types'
import { getDB } from '../db'

export async function cacheInsumos(items: Insumo[]) {
  const db = await getDB()
  const tx = db.transaction('insumos', 'readwrite')
  const store = tx.objectStore('insumos')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(items.map(it => store.put(it)))
  await tx.done
}

export async function readInsumosCache(): Promise<Insumo[]> {
  const db = await getDB()
  const store = db.transaction('insumos').objectStore('insumos')
  return await store.getAll() as Insumo[]
}
