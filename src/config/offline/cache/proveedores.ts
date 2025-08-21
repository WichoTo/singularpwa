// src/offline/cache/proveedores.ts
import type { Proveedor } from '../../../config/types'
import { getDB } from '../db'

export async function cacheProveedores(items: Proveedor[]) {
  const db = await getDB()
  const tx = db.transaction('proveedores', 'readwrite')
  const store = tx.objectStore('proveedores')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(items.map(it => store.put(it)))
  await tx.done
}

export async function readProveedoresCache(): Promise<Proveedor[]> {
  const db = await getDB()
  const store = db.transaction('proveedores').objectStore('proveedores')
  return await store.getAll() as Proveedor[]
}
