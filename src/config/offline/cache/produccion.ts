// src/offline/cache/produccion.ts
import type { PreparacionProduccion } from '../../types'
import { getDB } from '../db'

/** Reescribe en el store local todas las producciones de esa sucursal */
export async function cacheProduccion(sucursalid: string, rows: PreparacionProduccion[]) {
  const db = await getDB()
  const tx = db.transaction('produccion', 'readwrite')
  const store = tx.objectStore('produccion')

  // borra solo las de esa sucursal
  const all = await store.getAll() as PreparacionProduccion[]
  await Promise.all(all.filter(r => r.sucursalid === sucursalid).map(r => store.delete(r.id)))

  // inserta nuevas
  for (const r of rows) await store.put(r)
  await tx.done
}

/** Lee del store local por sucursal */
export async function readProduccionCache(sucursalid: string): Promise<PreparacionProduccion[]> {
  const db = await getDB()
  // 👇 usa el índice que sí existe en db.ts
  const idx = db.transaction('produccion').store.index('by_sucursalid')
  const list = await idx.getAll(sucursalid) as PreparacionProduccion[]
  // si quieres, ordénalos por fecha
  return list.sort((a: any, b: any) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
}
