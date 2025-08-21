import type { InsumoInventario } from '../../types'
import { getDB } from '../db'

/** Reescribe en cache todos los movimientos de una sucursal */
export async function cacheInventario(sucursalid: string, rows: InsumoInventario[]) {
  const db = await getDB()
  const tx = db.transaction('inventario', 'readwrite')
  const store = tx.objectStore('inventario')

  // borra solo los de esa sucursal
  const all = (await store.getAll()) as InsumoInventario[]
  await Promise.all(
    all.filter(r => r.sucursalid === sucursalid).map(r => store.delete(r.id))
  )

  // inserta los nuevos
  for (const r of rows) await store.put(r)
  await tx.done
}

/** Lee cache por sucursal (orden opcional por fecha) */
export async function readInventarioCache(sucursalid: string): Promise<InsumoInventario[]> {
  const db = await getDB()
  const idx = db.transaction('inventario').store.index('by_sucursalid')
  const list = (await idx.getAll(sucursalid)) as InsumoInventario[]
  return list.sort((a: any, b: any) =>
    String(a.fecha ?? '').localeCompare(String(b.fecha ?? ''))
  )
}
