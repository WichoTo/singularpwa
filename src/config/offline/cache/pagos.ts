// src/config/offline/cache/pagos.ts
import type { Pago } from '../../types'
import { getDB } from '../db'

/** Reemplaza TODOS los pagos de un turno por los del servidor */
export async function replacePagosByTurno(turnoid: string, rows: Pago[]) {
  const db = await getDB()
  const tx = db.transaction('pagos', 'readwrite')
  const store = tx.store
  const idx = store.index('by_turnoid')
  const existingKeys = await idx.getAllKeys(turnoid) as string[]
  const keep = new Set(rows.map(r => r.id))
  for (const k of existingKeys) {
    if (!keep.has(String(k))) await store.delete(k)
  }
  for (const r of rows) await store.put(r)
  await tx.done
}

/** Cachea/mergea una lista de pagos (sin borrar los demás) */
export async function cachePagos(rows: Pago[]) {
  const db = await getDB()
  const tx = db.transaction('pagos', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
}

/** Leer pagos por turno */
export async function readPagosByTurno(turnoid: string) {
  const db = await getDB()
  const idx = db.transaction('pagos').store.index('by_turnoid')
  const list = await idx.getAll(turnoid) as Pago[]
  return list.sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)))
}

/** Leer pagos por cuenta */
export async function readPagosByCuenta(cuentaId: string) {
  const db = await getDB()
  const idx = db.transaction('pagos').store.index('by_cuentaId')
  const list = await idx.getAll(cuentaId) as Pago[]
  return list.sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)))
}
