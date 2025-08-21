import type { Sucursal } from '../../types'
import { getDB } from '../db'

export async function cacheSucursales(sucs: Sucursal[]) {
  const db = await getDB()
  const tx = db.transaction('sucursales', 'readwrite')
  const store = tx.objectStore('sucursales')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(sucs.map(s => store.put(s)))
  await tx.done
}

export async function readSucursalesCache(): Promise<Sucursal[]> {
  const db = await getDB()
  const store = db.transaction('sucursales').objectStore('sucursales')
  return await store.getAll() as Sucursal[]
}
